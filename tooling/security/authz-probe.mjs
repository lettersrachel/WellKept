/**
 * Authorization probe matrix (sprint-10 hardening). For each demo role,
 * mints a real Auth.js session row, then hits every protected surface and
 * asserts the expected allow/deny. Run against a live server:
 *
 *   BASE=http://localhost:3001 DATABASE_URL=... node tooling/security/authz-probe.mjs
 *
 * Exit non-zero on any violation — CI-ready. This is a behavioral proof of
 * the WK-APP-003 matrix at the HTTP boundary, complementing the unit tests.
 */
import pg from "pg";
import { randomUUID } from "node:crypto";

const BASE = process.env.BASE ?? "http://localhost:3001";
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://wellkept:wellkept_dev@localhost:5432/wellkept";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

const FERNBROOK = "7ed45b9b-aec3-4393-b0a9-19de059a3645";

async function mintSession(email) {
  const { rows } = await pool.query("SELECT id FROM auth_user WHERE email=$1", [email]);
  if (!rows[0]) return null;
  const token = randomUUID() + randomUUID();
  const expires = new Date(Date.now() + 3600_000);
  // mfa_satisfied_at pre-stamped so staff sessions aren't diverted to /mfa by
  // the REQ-003 guard — this probe tests role×surface authorization, not the
  // second-factor step-up (covered by @wellkept/totp unit tests + the MFA e2e).
  await pool.query(
    "INSERT INTO auth_session (session_token, user_id, expires, mfa_satisfied_at) VALUES ($1,$2,$3,now())",
    [token, rows[0].id, expires],
  );
  return token;
}

async function s3FieldId() {
  const { rows } = await pool.query(
    "SELECT id FROM playbook_field WHERE household_id=$1 AND sensitivity='s3' LIMIT 1",
    [FERNBROOK],
  );
  return rows[0]?.id;
}

async function probe(token, method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      ...(token ? { cookie: `authjs.session-token=${token}` } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return { status: res.status, location: res.headers.get("location") ?? "" };
}

const ROLES = {
  "lisa@fernbrook.demo": "client",
  "jordan@wellkept.demo": "house_manager",
  "devon@wellkept.demo": "backup_hm",
  "rachel@wellkept.demo": "corporate_admin",
  "kelly@wellkept.demo": "cfo_readonly",
};

// expectation helpers
const reaches = (r) => r.status === 200;
const redirected = (r) => r.status >= 300 && r.status < 400;
const forbidden = (r) => r.status === 403;

let failures = 0;
const check = (name, cond, detail) => {
  const ok = !!cond;
  if (!ok) failures += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  (${detail})`}`);
};

const fieldId = await s3FieldId();
const sessions = {};
for (const email of Object.keys(ROLES)) sessions[email] = await mintSession(email);

for (const [email, role] of Object.entries(ROLES)) {
  const t = sessions[email];
  if (!t) { console.log(`\n${role} (${email}): NO SESSION (user missing) — skipped`); continue; }
  console.log(`\n${role} (${email})`);

  const fleet = await probe(t, "GET", "/oversight");
  const drill = await probe(t, "GET", `/oversight/${FERNBROOK}`);
  const playbook = await probe(t, "GET", "/playbook");
  const visit = await probe(t, "GET", "/visit");
  const reveal = await probe(t, "POST", "/api/reveal", { fieldId });
  const visitCmd = await probe(t, "POST", "/api/visit-commands", {
    idempotencyKey: randomUUID(), type: "visit.submit",
    payload: { householdId: FERNBROOK, startedAt: new Date().toISOString(), report: ["a", "b", "c"], photoIds: ["x"] },
  });
  const exhibit = await probe(t, "GET", "/api/exhibits/fleet");

  const corporate = role === "corporate_admin" || role === "cfo_readonly" || role === "corporate_ops";
  const field = role === "house_manager" || role === "backup_hm";

  // Fleet + drill-in + exhibits: corporate only
  check("fleet board", corporate ? reaches(fleet) : redirected(fleet), `status ${fleet.status}`);
  check("household drill-in", corporate ? reaches(drill) : redirected(drill), `status ${drill.status}`);
  check("exhibit CSV", corporate ? reaches(exhibit) : forbidden(exhibit), `status ${exhibit.status}`);
  // Client playbook: client only
  check("client playbook", role === "client" ? reaches(playbook) : redirected(playbook), `status ${playbook.status}`);
  // HM visit page: field roles only
  check("HM visit page", field ? reaches(visit) : redirected(visit), `status ${visit.status}`);
  // Reveal: client denied (403); corporate + field allowed (200); rate-limit 429 also acceptable
  check("s3 reveal", role === "client" ? forbidden(reveal) : (reveal.status === 200 || reveal.status === 429), `status ${reveal.status}`);
  // Visit submit: field roles only (others 403)
  check("visit submit", field ? (visitCmd.status === 200) : forbidden(visitCmd), `status ${visitCmd.status}`);
}

// Payload safety: the client's rendered HTML carries no s2/s3 field names.
console.log("\npayload safety (client HTML)");
const seed = JSON.parse(await (await import("node:fs/promises")).readFile(
  new URL("../../tooling/seed/fernbrook_template_seed.json", import.meta.url), "utf8"));
const clientHtml = await (await fetch(BASE + "/playbook", { headers: { cookie: `authjs.session-token=${sessions["lisa@fernbrook.demo"]}` } })).text();
const leaks = seed.fields.filter((f) => f.sensitivity !== "s1" && clientHtml.includes(f.name.slice(0, 40)));
check(`no s2/s3 in client HTML`, leaks.length === 0, `${leaks.length} leaks`);

// cleanup minted sessions
for (const t of Object.values(sessions)) if (t) await pool.query("DELETE FROM auth_session WHERE session_token=$1", [t]);
await pool.end();

console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
