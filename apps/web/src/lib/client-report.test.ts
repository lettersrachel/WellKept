import { test, expect, vi, beforeEach, afterEach } from "vitest";
import { projectClientReport, CLIENT_REPORT_KEYS } from "./client-report";
import { assertDeclaredClientKeys } from "@wellkept/permissions";

/**
 * Step 5a: the client visit report is a LIVE member-reaching surface, sent
 * on every applied visit.submit, and until now it carried no assertion of
 * any kind. The route validates no payload shape at all, and the
 * three-sentence contract lives in the close-flow state machine, which
 * runs client-side, so a command that never passed through it arrived
 * unchecked.
 *
 * FAILURE POSTURE (founder ruling): refuse the send, log loudly, let the
 * visit stand. applyVisitCommand has already committed when this runs, so
 * a throw would give the HOM a false failure and retry a landed write.
 *
 * PRECONDITIONS, asserted before any case: the projector and the
 * assertion both exist, and the declared key list is non-empty. A missing
 * export and a passing suite are indistinguishable otherwise.
 */

let errors: string[] = [];
beforeEach(() => {
  errors = [];
  vi.spyOn(console, "error").mockImplementation((...a: unknown[]) => { errors.push(a.join(" ")); });
});
afterEach(() => { vi.restoreAllMocks(); });

const HH = "00000000-0000-7000-8000-00000000abcd";
const THREE = ["Swept the porch.", "Reset the guest room.", "Noted the gutter."];

test("preconditions: the projector, the assertion, and a non-empty declared list", () => {
  expect(typeof projectClientReport).toBe("function");
  expect(typeof assertDeclaredClientKeys).toBe("function");
  expect(CLIENT_REPORT_KEYS.length).toBeGreaterThan(0);
});

test("GREEN: a well-formed close projects to exactly the declared keys", () => {
  const out = projectClientReport(HH, { report: THREE, photoIds: ["a", "b"] });
  expect(out.ok).toBe(true);
  if (!out.ok) throw new Error("unreachable");
  expect(Object.keys(out.projection).sort()).toEqual([...CLIENT_REPORT_KEYS].sort());
  expect(out.projection.report).toEqual(THREE);
  expect(out.projection.photoCount).toBe(2);
  expect(errors).toEqual([]);
});

test("GREEN: a missing photoIds is an honest zero, not a refusal", () => {
  const out = projectClientReport(HH, { report: THREE });
  expect(out.ok && out.projection.photoCount).toBe(0);
  expect(errors).toEqual([]);
});

test("the projection carries ONLY the declared keys, so payload columns cannot ride along", () => {
  // The whole visit payload is handed in; the projection is built key by
  // key, so nothing else can reach the composer even as an unread field.
  const out = projectClientReport(HH, {
    report: THREE, photoIds: [],
    // fields a real visit.submit carries
    ...({ timeEntries: [{ minutes: 90 }], costs: [{ cents: 4200 }], submittedBy: "u1",
          lifeChangeSignal: true, gestures: ["x"] } as object),
  });
  if (!out.ok) throw new Error("unreachable");
  expect(Object.keys(out.projection)).not.toContain("timeEntries");
  expect(Object.keys(out.projection)).not.toContain("submittedBy");
  expect(Object.keys(out.projection)).not.toContain("lifeChangeSignal");
  expect(() => assertDeclaredClientKeys([out.projection], CLIENT_REPORT_KEYS, "client visit report")).not.toThrow();
});

test("RED: the wrong number of sentences refuses the send and says so loudly", () => {
  for (const bad of [[], ["one"], ["one", "two"], [...THREE, "four"]]) {
    errors = [];
    expect(projectClientReport(HH, { report: bad }).ok).toBe(false);
    expect(errors.join(" ")).toContain("SEND SUPPRESSED");
    expect(errors.join(" ")).toContain(`carries ${bad.length} sentences`);
    expect(errors.join(" ")).toContain("the close-flow contract is exactly 3");
  }
});

test("RED: a blank or non-string sentence refuses", () => {
  for (const bad of [["a", "   ", "c"], ["a", "", "c"], ["a", null, "c"], ["a", 7, "c"]]) {
    errors = [];
    expect(projectClientReport(HH, { report: bad as string[] }).ok).toBe(false);
    expect(errors.join(" ")).toContain("empty or not a string");
  }
});

test("RED: a missing or non-array report refuses rather than sending an empty email", () => {
  for (const bad of [undefined, null, "three sentences", { 0: "a" }]) {
    errors = [];
    expect(projectClientReport(HH, { report: bad as unknown as string[] }).ok).toBe(false);
    expect(errors.join(" ")).toContain("report is not an array");
  }
});

test("a refusal names the household and states that the visit is unaffected", () => {
  projectClientReport(HH, { report: [] });
  const line = errors.join(" ");
  expect(line).toContain(HH);
  expect(line).toContain("The visit stands");
  expect(line).toContain("no client email was sent");
});

test("the route sends from the PROJECTION and never from the raw payload", async () => {
  // An assertion that stops being called is a guard that stopped running.
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const route = readFileSync(path.join(here, "../app/api/visit-commands/route.ts"), "utf8");
  expect(route).toContain("const decision = projectClientReport(householdId, payload);");
  expect(route).toContain("const projected = decision.projection;");
  expect(route).toContain("projected.report.map(");
  expect(route).toContain("${projected.photoCount} photo(s) attached");
  // The raw payload must not reach the client composer any more.
  expect(route).not.toContain("(payload.report ?? []).map((s) => `<p style=\"font-family:Georgia,serif;font-size:16px");
});

test("G-81: a refusal carries the reason out, so the caller can record it", () => {
  const out = projectClientReport(HH, { report: ["one"] });
  expect(out.ok).toBe(false);
  if (out.ok) throw new Error("unreachable");
  expect(out.why).toContain("carries 1 sentences");
});

test("G-81: the route routes a refusal to the corporate queue and still returns", async () => {
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const route = readFileSync(path.join(here, "../app/api/visit-commands/route.ts"), "utf8");
  expect(route).toContain("await raiseSuppressedSendNotice(householdId, decision.why);");

  // The notice raiser stays NARROW, asserted rather than trusted to the
  // comment: one audience, and the destination comes from the firewall
  // policy rather than a literal, so corporate_queue is never hardcoded
  // at a call site.
  const notice = readFileSync(path.join(here, "client-report-notice.ts"), "utf8");
  expect(notice).toContain('destinationFor({ audience: "corporate" })');
  expect(notice).not.toContain('destination: "corporate_queue"');
  expect(notice).toContain('sourceKind: "system"');
  // The reason is structural and never carries a member sentence.
  expect(notice).toContain("Client visit report not sent: ${why}");
  expect(notice).not.toContain("report.join");
  // Best-effort: a failure to record must not throw out of the handler.
  expect(notice).toMatch(/catch \(err\)[\s\S]*console\.error/);
});
