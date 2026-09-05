#!/usr/bin/env node
/**
 * Validate a trigger YAML file against the target shape in
 * docs/triggers/SHAPE.md.
 *
 * THE SHAPE IS DERIVED FROM THE SCHEMA, NOT FROM WK-APP-002, which is not in
 * this repository. If a real section does not fit, that is a finding about the
 * shape (founder ruling, 5 September 2026).
 *
 * NO NEW DEPENDENCY. The stack is pinned and carries no YAML parser, so this
 * reads the SUBSET the form uses and REFUSES anything it does not recognise
 * rather than guessing. A file that uses YAML this cannot parse fails loudly
 * with the line, which is the honest failure: a partial parse that silently
 * dropped a rule would be worse than no validator, and is exactly the class
 * this repository keeps filing.
 *
 * Reads no database. Writes nothing. Exits 1 on any error.
 */
import { readFileSync } from "node:fs";

const STAGE = ["anticipate", "identify", "decide", "monitor"];
const MATERIALITY = ["safety_access", "money_legal", "convenience"];
const CONSEQUENCE = ["editorial", "behavioral", "high_consequence"];
// lead_time and suppression_class have NO vocabulary anywhere in the tree.
// They are accepted as any value and required of nobody. Inventing a unit for
// lead time or a suppression vocabulary would be choosing a taxonomy.
const JUDGMENT = ["lead_time", "stage", "consequence_class", "suppression_class", "materiality"];

/** The tiny YAML subset the form uses: two-space indent, no anchors, no flow
 *  collections, `>` folded scalars, `- ` sequences, `key: value` maps. */
function parse(text, file) {
  const lines = text.split("\n");
  const root = {};
  const stack = [{ indent: -1, node: root }];
  let i = 0;
  const fail = (n, msg) => { throw new Error(`${file}:${n + 1} ${msg}`); };

  while (i < lines.length) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith("#")) { i++; continue; }
    const indent = raw.length - raw.trimStart().length;
    let line = raw.trim();
    const hash = line.indexOf(" #");
    if (hash >= 0) line = line.slice(0, hash).trim();
    if (!line) { i++; continue; }

    while (stack.length > 1 && indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].node;

    if (line.startsWith("- ")) {
      if (!Array.isArray(parent)) fail(i, "sequence item under a non-sequence key");
      const item = {};
      parent.push(item);
      const rest = line.slice(2).trim();
      stack.push({ indent, node: item });
      if (rest) { lines[i] = " ".repeat(indent + 2) + rest; continue; }
      i++; continue;
    }

    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/);
    if (!m) fail(i, `cannot parse: ${line}`);
    const [, key, rawVal] = m;
    if (Array.isArray(parent)) fail(i, "key inside a sequence without an item marker");

    if (rawVal === "" || rawVal === ">" || rawVal === "|") {
      // Look ahead: folded scalar, nested map, or sequence.
      let j = i + 1;
      while (j < lines.length && (!lines[j].trim() || lines[j].trim().startsWith("#"))) j++;
      const childIndent = j < lines.length ? lines[j].length - lines[j].trimStart().length : -1;
      if (rawVal === ">" || rawVal === "|") {
        const parts = [];
        while (j < lines.length) {
          const ci = lines[j].length - lines[j].trimStart().length;
          if (!lines[j].trim() || ci <= indent) break;
          parts.push(lines[j].trim()); j++;
        }
        parent[key] = parts.join(rawVal === ">" ? " " : "\n");
        i = j; continue;
      }
      if (childIndent > indent && lines[j].trim().startsWith("- ")) {
        parent[key] = []; stack.push({ indent, node: parent[key] });
      } else {
        parent[key] = {}; stack.push({ indent, node: parent[key] });
      }
      i++; continue;
    }

    let v = rawVal;
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    else if (v === "null" || v === "~") v = null;
    else if (v === "true") v = true;
    else if (v === "false") v = false;
    else if (/^-?\d+$/.test(v)) v = Number(v);
    parent[key] = v;
    i++;
  }
  return root;
}

function validate(doc, file) {
  const errors = [];
  const blanks = [];
  const E = (m) => errors.push(`${file}: ${m}`);

  if (typeof doc.section !== "string" && typeof doc.section !== "number") E("section is required (the document's own number, verbatim)");
  if (!doc.section_title) E("section_title is required");
  if (!Array.isArray(doc.rules) || doc.rules.length === 0) { E("rules must be a non-empty list"); return { errors, blanks, count: 0 }; }

  doc.rules.forEach((r, n) => {
    const at = `rule ${n + 1}`;
    if (!r.family) E(`${at}: family is required (trigger_rule.family is NOT NULL)`);
    const d = r.definition;
    if (!d || typeof d !== "object") { E(`${at}: definition is required`); return; }
    if (!d.pack_name) E(`${at}: definition.pack_name is required`);
    if (!d.pack_key) E(`${at}: definition.pack_key is required on new rules (exclusion matching keys on it, so copy edits must not move it)`);
    if (d.pack_key && !/^[a-z0-9_]+$/.test(String(d.pack_key))) E(`${at}: pack_key must be lower_snake (it is an identifier, not copy)`);
    if (!Array.isArray(d.items) || d.items.length === 0) { E(`${at}: definition.items must have at least one step`); return; }
    d.items.forEach((it, k) => {
      const ia = `${at} item ${k + 1}`;
      if (!it.text) E(`${ia}: text is required`);
      if (!Number.isInteger(it.offset_days)) E(`${ia}: offset_days is required and must be an integer (negative is before)`);
      // method_ref absent is a FINDING, not an error: a step asking for work
      // no standard defines is a real thing to notice, and refusing the file
      // would push the author to invent a provision id.
      if (!("method_ref" in it) || it.method_ref === null) blanks.push(`${ia}: no method_ref (a finding to raise, not an error)`);
    });

    for (const f of JUDGMENT) {
      if (!(f in r)) { E(`${at}: ${f} must be PRESENT and null, so a blank is visible rather than forgotten`); continue; }
      const v = r[f];
      if (v === null) { blanks.push(`${at}: ${f} left for the founder`); continue; }
      if (f === "stage" && !STAGE.includes(v)) E(`${at}: stage ${JSON.stringify(v)} is not in pipeline_stage (${STAGE.join(", ")})`);
      if (f === "materiality" && !MATERIALITY.includes(v)) E(`${at}: materiality ${JSON.stringify(v)} is not in the signed enum (${MATERIALITY.join(", ")})`);
      if (f === "consequence_class" && !CONSEQUENCE.includes(v)) E(`${at}: consequence_class ${JSON.stringify(v)} is not in the signed enum (${CONSEQUENCE.join(", ")})`);
      // lead_time and suppression_class: no vocabulary exists. Accepted as-is.
    }
  });
  return { errors, blanks, count: doc.rules.length };
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("usage: validate-shape.mjs <file.yaml> [...]");
  process.exit(1);
}
let bad = 0;
for (const f of files) {
  let doc;
  try { doc = parse(readFileSync(f, "utf8"), f); }
  catch (e) { console.error(`REFUSED ${e.message}`); bad++; continue; }
  const { errors, blanks, count } = validate(doc, f);
  console.log(`${f}: ${count} rule(s) parsed`);
  for (const b of blanks) console.log(`  blank: ${b}`);
  for (const e of errors) console.error(`  ERROR ${e}`);
  if (errors.length) bad++;
}
console.log(bad === 0
  ? "\nOK. Blanks above are the EXPECTED state: the five judgment fields are the founder's."
  : `\n${bad} file(s) with errors.`);
process.exit(bad === 0 ? 0 : 1);
