import { test } from "vitest";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

/**
 * G-55: a refusal that lands on a page rendering no banner is a false
 * success.
 *
 * G-29 replaced the action layer's silent `return`s with a redirect
 * carrying `?refused=<reason>`, on the reasoning that an operator cannot
 * tell "the system declined this" from "the system is down". That work was
 * finished on three of the four surfaces a refusal can land on. The fleet
 * board, which is where every `refuse(null, ...)` goes - the bad-input and
 * missing classes - took no searchParams and rendered nothing, so those
 * refusals produced a click, a navigation, and silence.
 *
 * The guard exists because the pairing is held by memory otherwise: a new
 * action redirecting somewhere new, or a new refusal target page, has
 * nothing today that notices the banner was never added.
 *
 * INPUTS DOCTRINE (CLAUDE.md): this guard computes both halves of its own
 * input. The target set is read out of actions.ts rather than listed here,
 * and the page for each target is resolved by walking the route tree
 * rather than by a hand-kept map - so a target added tomorrow is checked
 * tomorrow. Both derivations carry floors: a regex that stops matching
 * yields a small set, and a small set FAILS rather than passing vacuously,
 * which is the failure mode that would otherwise make this guard decorative.
 */
const here = path.dirname(fileURLToPath(import.meta.url));
const ACTIONS = path.join(here, "actions.ts");
const APP_DIR = path.join(here, "../app");

/** The literal body of a named top-level function, brace-matched. */
function bodyOf(src: string, name: string): string {
  const start = src.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} is gone from actions.ts - this guard's input is stale, not satisfied`);
  const open = src.indexOf("{", start);
  let depth = 0;
  let i = open;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) break;
  }
  return src.slice(open, i + 1);
}

/** `/oversight/${householdId}` and `/oversight/[householdId]` are one route. */
const normalize = (p: string) => p.replace(/\$\{[^}]*\}/g, "[dyn]").replace(/\[[^\]]+\]/g, "[dyn]");

function refusalTargets(): Set<string> {
  const src = readFileSync(ACTIONS, "utf8");

  // Every place a refusal is aimed: the two helpers that construct a
  // target, plus any call site naming one literally.
  const surfaces = [bodyOf(src, "refuse"), bodyOf(src, "resolveReturnTo")];
  for (const m of src.matchAll(/refuseTo\(\s*(["`])(\/[^"`]*)\1/g)) surfaces.push(m[2]!);
  // 2026-08-25: the sibling success guard's red-proof found this hole
  // here first. An action that pins its surface in a local const
  // (`const returnTo = "/oversight/tasks"`) and refuses to the VARIABLE
  // was invisible to a scan that only read literal arguments, so that
  // page could have lost its banner with this guard still green.
  for (const m of src.matchAll(/export async function \w+\(/g)) {
    const body = src.slice(m.index!, src.indexOf("\nexport ", m.index! + 1) + 1 || undefined);
    const locals = new Map<string, string>();
    for (const d of body.matchAll(/const (\w+)\s*=\s*(["`])(\/[^"`]*)\2\s*;/g)) locals.set(d[1]!, d[3]!);
    for (const c of body.matchAll(/refuseTo\(\s*(\w+)\s*,/g)) {
      const literal = locals.get(c[1]!);
      if (literal) surfaces.push(literal);
    }
  }

  const targets = new Set<string>();
  for (const s of surfaces) {
    for (const m of s.matchAll(/["`](\/[^"`?\s]*)["`]/g)) targets.add(normalize(m[1]!));
    if (s.startsWith("/")) targets.add(normalize(s));
  }
  return targets;
}

/** Route path -> page file, from the tree. Route groups do not affect the URL. */
function routeMap(): Map<string, string> {
  const routes = new Map<string, string>();
  const walk = (dir: string, route: string) => {
    for (const entry of readdirSync(dir)) {
      const full = path.join(dir, entry);
      if (statSync(full).isDirectory()) {
        // (corporate) and (hm) organise files, not URLs.
        const segment = /^\(.*\)$/.test(entry) ? route : `${route}/${normalize(entry)}`;
        walk(full, segment);
      } else if (entry === "page.tsx") {
        routes.set(route === "" ? "/" : route, full);
      }
    }
  };
  walk(APP_DIR, "");
  return routes;
}

test("G-55: every page an action can refuse onto renders the refusal banner", () => {
  const targets = refusalTargets();
  const routes = routeMap();

  // Floors. A broken extractor returns a tiny set and would otherwise pass
  // by finding nothing to check.
  assert.ok(targets.size >= 4,
    `only ${targets.size} refusal targets found - the extractor is broken, not the action layer`);
  assert.ok(routes.size >= 10,
    `only ${routes.size} routes found under src/app - the route walk is broken`);
  const callSites = [...readFileSync(ACTIONS, "utf8").matchAll(/\brefuseTo?\(/g)].length;
  assert.ok(callSites >= 40,
    `only ${callSites} refusal call sites found in actions.ts - the scan is broken`);

  for (const target of targets) {
    const page = routes.get(target);
    assert.ok(page, `an action can refuse onto ${target}, which resolves to no page in the route tree`);
    const src = readFileSync(page, "utf8");

    // The RENDER, not the mention. Proving this guard red caught its own
    // first version: `includes("RefusalBanner")` was satisfied by the
    // leftover import of a component no longer in the tree, so deleting
    // the banner and keeping the import read as compliant.
    const rendered = /<RefusalBanner\s+reason=\{(\w+)\}/.exec(src);
    assert.ok(rendered,
      `${target} is a refusal target but its page renders no <RefusalBanner reason={...}>: `
      + "a declined action would land there in silence, which is indistinguishable "
      + "from having worked (G-55, and G-29's original reasoning)");

    // And the reason it renders must be the one the redirect carries.
    // A banner wired to anything else is decoration.
    const bound = /const \{([^}]*)\} = await searchParams/.exec(src);
    assert.ok(bound && bound[1]!.split(",").some((n) => n.trim() === rendered[1]),
      `${target} renders <RefusalBanner reason={${rendered[1]}}> but ${rendered[1]} is not `
      + "destructured from `await searchParams`, so it can never carry ?refused=");
  }
});

test("G-55: the fleet board specifically, which is where the null-household refusals land", () => {
  // Named on its own because it is the one that was wrong, and because the
  // general test above would still pass if `refuse` stopped defaulting here.
  const src = readFileSync(ACTIONS, "utf8");
  const nullRefusals = [...src.matchAll(/refuse\(null,/g)].length;
  assert.ok(nullRefusals >= 20,
    `only ${nullRefusals} refuse(null, ...) sites found - the scan is broken`);
  assert.ok(bodyOf(src, "refuse").includes('"/oversight"'),
    "refuse() no longer falls back to /oversight - update this guard's premise deliberately");

  const board = routeMap().get("/oversight");
  assert.ok(board, "/oversight has no page");
  assert.match(readFileSync(board, "utf8"), /<RefusalBanner\s+reason=\{refused\}/,
    `${nullRefusals} refusals land on /oversight and it renders no banner`);
});
