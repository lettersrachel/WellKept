import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * G-68: an action that WORKED and said nothing is indistinguishable from
 * a button that does nothing.
 *
 * This is refusal-visibility's twin, and it exists because the pair was
 * only ever half built. G-29 (2026-07-27) replaced the action layer's
 * silent `return` guards with a visible refusal, on the reasoning that an
 * operator cannot tell "the system declined this" from "the system is
 * down". Success was never given the same treatment: roughly half the
 * actions ended at `revalidatePath` and left the operator to read the
 * table and guess whether their click had counted.
 *
 * The bill came due on the evening of 25 August 2026 (G-67): two
 * corporate actions were clicked, reported clean by the operator, and
 * wrote nothing. Nobody could tell, because a working click and a dead
 * click looked the same. Whatever caused THAT silence, the operator's
 * side of it is a design gap, and this guard holds the fix: a write says
 * so, or the guard fails.
 *
 * INPUTS DOCTRINE (CLAUDE.md): both halves of the input are computed.
 * The action set is read out of actions.ts, and the page for each
 * confirmation target is resolved by walking the route tree, so an action
 * added tomorrow is checked tomorrow. Both derivations carry floors: a
 * regex that stops matching yields a small set, and a small set FAILS
 * rather than passing vacuously.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const ACTIONS = path.join(here, "actions.ts");
const APP_DIR = path.join(here, "../app");

/**
 * Actions excused from confirming, each with the written reason the
 * escape-hatch rule requires. EMPTY as of 2026-08-25, deliberately: every
 * exported action confirms. An entry here is a reviewed decision that one
 * particular write is better left silent, which should be rare enough to
 * argue for in prose.
 */
const ALLOWLIST: Record<string, string> = {};

/** The literal body of a named function, brace-matched. */
function bodyOf(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is gone from actions.ts - this guard's input is stale, not satisfied`);
  const open = src.indexOf("{", src.indexOf(")", start));
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) break;
  }
  return src.slice(open, i + 1);
}

/** Every exported server action, name to body. */
function actions(src: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const m of src.matchAll(/export async function (\w+)\(/g)) out.set(m[1]!, bodyOf(src, m[1]!));
  return out;
}

/** Does this action change stored state? The question the guard is about. */
const writes = (body: string) => /db\.(insert|update|delete)\(|\.transaction\(|\btx\.(insert|update|delete)\(/.test(body);

/** `/oversight/${householdId}` and `/oversight/[householdId]` are one route. */
const normalize = (p: string) =>
  p.replace(/\?[^"`]*$/, "").replace(/\$\{[^}]*\}/g, "[dyn]").replace(/\[[^\]]+\]/g, "[dyn]");

test("G-68: every action that writes says that it wrote", () => {
  const src = readFileSync(ACTIONS, "utf8");
  const all = actions(src);

  // Floor: a broken extractor finds nothing and would otherwise pass.
  assert.ok(all.size >= 50,
    `only ${all.size} exported actions found in actions.ts - the scan is broken, not the action layer`);
  const writing = [...all].filter(([, body]) => writes(body));
  assert.ok(writing.length >= 40,
    `only ${writing.length} writing actions found - the write detection is broken`);

  for (const [name, body] of writing) {
    if (name in ALLOWLIST) {
      assert.ok(ALLOWLIST[name]!.length > 20, `${name}'s allowlist entry needs a written reason, not a placeholder`);
      continue;
    }
    assert.match(body, /\brecorded(To)?\(/,
      `${name} changes stored state and ends without a confirmation. An operator who clicks it `
      + "cannot tell that it worked from a button that does nothing, which is the G-67 shape and "
      + "the direction G-29 never finished. Call recorded(householdId, ...) or recordedTo(path, ...), "
      + "or excuse it in this guard's ALLOWLIST with a written reason.");
  }
});

test("G-68: every page a confirmation can land on renders the banner", () => {
  const src = readFileSync(ACTIONS, "utf8");

  // Where confirmations are aimed: the helper that builds a target, plus
  // every call site naming one literally. A template path keeps only its
  // route (`/intake?section=${section}` is the /intake page).
  const surfaces = [bodyOf(src, "recorded"), bodyOf(src, "resolveReturnTo")];
  for (const m of src.matchAll(/recordedTo\(\s*(["`])(\/[^"`]*)\1/g)) surfaces.push(m[2]!);
  for (const m of src.matchAll(/recordedTo\(\s*[^,]*\?\s*`(\/[^`]*)`/g)) surfaces.push(m[1]!);
  // And the indirection that this guard's own red-proof caught: an action
  // that pins its surface in a local const (`const returnTo =
  // "/oversight/tasks"`) and then confirms to the variable. Scanning only
  // for literal arguments walked straight past it, and the page could have
  // lost its banner with the guard still green. The sibling refusal guard
  // had the same hole and is fixed in the same change.
  for (const [, body] of actions(src)) {
    const locals = new Map<string, string>();
    for (const m of body.matchAll(/const (\w+)\s*=\s*(["`])(\/[^"`]*)\2\s*;/g)) locals.set(m[1]!, m[3]!);
    for (const m of body.matchAll(/recordedTo\(\s*(\w+)\s*,/g)) {
      const literal = locals.get(m[1]!);
      if (literal) surfaces.push(literal);
    }
  }

  const targets = new Set<string>();
  for (const s of surfaces) {
    if (s.startsWith("/")) { targets.add(normalize(s)); continue; }
    for (const m of s.matchAll(/["`](\/[^"`?\s]*)["`]/g)) targets.add(normalize(m[1]!));
  }

  assert.ok(targets.size >= 4,
    `only ${targets.size} confirmation targets found - the extractor is broken`);
  const callSites = [...src.matchAll(/\brecorded(To)?\(/g)].length;
  assert.ok(callSites >= 50,
    `only ${callSites} confirmation call sites found in actions.ts - the scan is broken`);

  // Route path -> page file, from the tree. Route groups do not affect the URL.
  const routes = new Map<string, string>();
  const walk = (dir: string, route: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        const segment = /^\(.*\)$/.test(entry) ? route : `${route}/${normalize(entry)}`;
        walk(full, segment);
      } else if (entry === "page.tsx") {
        routes.set(route === "" ? "/" : route, full);
      }
    }
  };
  walk(APP_DIR, "");
  assert.ok(routes.size >= 10, `only ${routes.size} routes found under src/app - the route walk is broken`);

  for (const target of targets) {
    const page = routes.get(target);
    assert.ok(page, `an action can confirm onto ${target}, which resolves to no page in the route tree`);
    const pageSrc = readFileSync(page, "utf8");

    // The RENDER, not the mention: an import left behind by a deleted
    // banner read as compliant the first time refusal-visibility was
    // proven red, and the same trap is here.
    const rendered = /<RecordedBanner\s+what=\{(\w+)\}/.exec(pageSrc);
    assert.ok(rendered,
      `${target} is a confirmation target but its page renders no <RecordedBanner what={...}>: `
      + "a write that landed would arrive there in silence, which is indistinguishable from a "
      + "button that did nothing (G-68, and G-29's original reasoning).");

    // And the value it renders must be the one the redirect carries.
    const bound = /const \{([^}]*)\} = await searchParams/.exec(pageSrc);
    assert.ok(bound && bound[1]!.split(",").some((n) => n.trim() === rendered[1]),
      `${target} renders <RecordedBanner what={${rendered[1]}}> but ${rendered[1]} is not `
      + "destructured from `await searchParams`, so it can never carry ?recorded=");
  }
});

test("G-68: a confirmation never carries the value the action was careful not to store", () => {
  // The message rides in a URL: browser history, referrer headers, the
  // operator's shoulder. So the actions that hash or seal their input,
  // BECAUSE the plaintext must not be written down, must not then print
  // it in the confirmation. The set is computed from that same tell
  // (sha256 of the value, or a vault write) rather than listed, so a new
  // value-handling action joins the check by handling a value.
  //
  // Not banned globally: `${value}` in the observation actions is a 1-5
  // rating and a fill percentage, which is the whole point of the message.
  // The line is content the system deliberately hid, not every variable
  // that happens to be named value.
  const src = readFileSync(ACTIONS, "utf8");
  const all = actions(src);
  const guarding = [...all].filter(([, body]) => /sha256\(|vaultWrite\(/.test(body));
  assert.ok(guarding.length >= 3,
    `only ${guarding.length} value-hashing actions found - the detection is broken, not the action layer`);

  for (const [name, body] of guarding) {
    const call = /\brecorded(?:To)?\(([^;]*)\);/.exec(body);
    assert.ok(call, `${name} hashes a value and has no confirmation call to check`);
    assert.doesNotMatch(call[1]!, /\$\{\s*(value|proposed|plain|edit\.proposedValue)\b/,
      `${name} hashes its value so the plaintext is never stored, then interpolates it into the `
      + "confirmation message, which lands in browser history. Name what was recorded, not the content.");
  }

  // And nowhere at all: an email in a URL defeats ADR-006's whole point,
  // which is that the audit trail carries a token and never the address.
  assert.doesNotMatch(src, /\brecorded(?:To)?\([^;]*\$\{\s*email\b/,
    "a confirmation message interpolates an email address; ADR-006 keeps addresses out of the "
    + "trail and a URL is worse than the trail.");
});
