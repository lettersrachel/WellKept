import { test, expect } from "vitest";
import { escapeHtml } from "./mail";

/**
 * Every string a person typed reaches an outbound HTML body through
 * `${...}`, which is concatenation and not markup-aware. A HOM writing
 * "the 3<4 setting" or a household named "Fitz & Byrne" produced broken
 * markup in a member's inbox, reachable by typing ordinary punctuation.
 *
 * PRECONDITION: the helper exists and is a function. A missing export and
 * a passing suite look identical otherwise.
 */
test("precondition: the escaper exists", () => {
  expect(typeof escapeHtml).toBe("function");
});

test("the five markup-significant characters are escaped, ampersand first", () => {
  expect(escapeHtml("Fitz & Byrne")).toBe("Fitz &amp; Byrne");
  expect(escapeHtml("the 3<4 setting")).toBe("the 3&lt;4 setting");
  expect(escapeHtml("a > b")).toBe("a &gt; b");
  expect(escapeHtml('she said "yes"')).toBe("she said &quot;yes&quot;");
  expect(escapeHtml("the owner's key")).toBe("the owner&#39;s key");
});

test("ampersand is escaped BEFORE the others, so entities are not double-escaped", () => {
  // If & ran after <, "&lt;" would become "&amp;lt;" and the member would
  // read the entity rather than the character. Ordering is the whole fix.
  expect(escapeHtml("<b>")).toBe("&lt;b&gt;");
  expect(escapeHtml("&amp;")).toBe("&amp;amp;");
});

test("a tag typed by a person cannot become markup in the body", () => {
  const typed = '<img src=x onerror="alert(1)">';
  const escaped = escapeHtml(typed);
  expect(escaped).not.toContain("<img");
  expect(escaped).not.toContain('="');
  expect(escaped).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
});

test("null and undefined become empty, never the strings 'null' or 'undefined'", () => {
  expect(escapeHtml(null)).toBe("");
  expect(escapeHtml(undefined)).toBe("");
  expect(escapeHtml(0)).toBe("0");
});

test("the client report and the corporate alert both escape what a person typed", async () => {
  // The G-55 lesson: an escaper that stops being called is a fix that
  // stopped running, and nothing else here would say so.
  const { readFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const path = await import("node:path");
  const here = path.dirname(fileURLToPath(import.meta.url));
  const route = readFileSync(path.join(here, "../app/api/visit-commands/route.ts"), "utf8");

  // Both report renderers escape each sentence. They read from different
  // sources by design: the client composer takes the PROJECTION (Step 5a),
  // the corporate alert still takes the raw payload, since it is a staff
  // surface and outside that ruling. Matched on the render itself rather
  // than on the source, so this stays true when either source changes.
  const sentenceRenders = route.match(/\.map\(\(s\) => `<p style="font-family:Georgia[^\n]*/g) ?? [];
  expect(sentenceRenders.length).toBe(2);
  for (const line of sentenceRenders) expect(line).toContain("escapeHtml(s)");

  // The corporate alert puts the household name in MARKUP, so it escapes.
  expect(route).toContain("${escapeHtml(hh.name)}</h2>");

  // The client report's subject is PLAIN TEXT and must NOT be escaped:
  // escaping would print "Fitz &amp; Byrne" to the member. Asserted in the
  // negative so a future "consistency" pass cannot quietly introduce it.
  expect(route).toContain('subject: `This week\'s visit at ${hh?.name ?? "your household"}`');
});
