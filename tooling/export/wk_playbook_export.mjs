/**
 * wk_playbook_export.mjs : the branded client Playbook document (sprint 9).
 *
 * Takes a seed JSON and produces the client-facing Playbook as a Word
 * document in house style. The client view is produced by the SAME tested
 * permission core the application uses (filterFields + the payload
 * assertion), never a parallel implementation: full brand on client
 * artifacts, one policy for who sees what.
 *
 * Usage: node wk_playbook_export.mjs seed.json out.docx
 * Pilot use: run on a founding household's committed seed to hand the family
 * their Playbook beautifully, while the system of record stays the workbook.
 */
import fs from "node:fs";
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, PageBreak,
} from "docx";
import { filterFields, assertClientPayloadSafe } from "@wellkept/permissions/src/permissions.verified.mjs";
import { SECTION_NAMES } from "@wellkept/schema";

const GREEN = "1C3D2E", GOLD = "B08D2A", SAGE = "E4EDE4", GREY = "6B6B6B", INK = "26241F";
const FONT = "Georgia";


const [, , seedPath, outPath] = process.argv;
if (!seedPath || !outPath) {
  console.error("Usage: node wk_playbook_export.mjs seed.json out.docx");
  process.exit(1);
}

const seed = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
const clientFields = filterFields("client", seed.fields);
assertClientPayloadSafe(clientFields); // US-05 gate: the export refuses to leak
const filled = clientFields.filter((f) => f.value && f.value.trim());
const bySection = new Map();
for (const f of filled) {
  if (!bySection.has(f.section)) bySection.set(f.section, []);
  bySection.get(f.section).push(f);
}

const P = (text, o = {}) => new Paragraph({
  alignment: o.center ? AlignmentType.CENTER : AlignmentType.LEFT,
  spacing: { before: o.before ?? 60, after: o.after ?? 60 },
  children: [new TextRun({
    text, font: FONT, size: o.size ?? 22, bold: o.bold, italics: o.it,
    color: o.color ?? INK,
  })],
});

const kids = [];

// ---- Cover: full brand on client artifacts ----
kids.push(new Table({
  width: { size: 9360, type: WidthType.DXA }, columnWidths: [9360],
  borders: Object.fromEntries(["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"]
    .map((k) => [k, { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }])),
  rows: [new TableRow({ children: [new TableCell({
    width: { size: 9360, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: GREEN },
    margins: { top: 900, bottom: 900, left: 360, right: 360 },
    children: [
      P("WELL KEPT", { center: true, size: 26, color: GOLD }),
      P("The " + (seed.household.name || "Household") + " Playbook", { center: true, size: 44, color: "FFFFFF", it: true, before: 240 }),
      P("Your home, understood.", { center: true, size: 22, color: SAGE, before: 160 }),
      P((seed.household.tier || "").replace("_", " ").toUpperCase() + " MEMBERSHIP", { center: true, size: 18, color: GOLD, before: 240 }),
    ],
  })] })],
}));
kids.push(P("", {}));
kids.push(P("This is your household's own record: what we have learned together, confirmed with you, and keep current so every visit runs the way your home actually works. It shows everything held at the client-visible level; our working notes and every secured item live behind the same protections the application enforces, never printed here.", { size: 20, color: GREY, it: true, before: 200 }));
kids.push(new Paragraph({ children: [new PageBreak()] }));

// ---- Sections ----
for (const sec of [...bySection.keys()].sort((a, b) => a - b)) {
  kids.push(P(`Section ${sec}  |  ${SECTION_NAMES[sec] || ""}`, { size: 28, bold: true, color: GREEN, before: 260, after: 120 }));
  for (const f of bySection.get(sec)) {
    const cleanName = f.name.replace(/\s*\[[^\]]*\]\s*/g, " ").replace(/\s+/g, " ").trim();
    const deDash = (t) => t.replace(/ — /g, " - ").replace(/—/g, "-");
    kids.push(P(deDash(cleanName), { size: 19, bold: true, color: GOLD, before: 140, after: 20 }));
    kids.push(P(deDash(f.value), { size: 21, after: 20 }));
    kids.push(P(`Confirmed ${f.provenance}${f.provenanceDate ? ", " + f.provenanceDate : ""}`, { size: 15, color: GREY, it: true, after: 80 }));
  }
}

kids.push(P(`${filled.length} confirmed entries shown of ${clientFields.length} client-visible fields. The Playbook is grown, not filled: it deepens with every season your home teaches us.`, { size: 16, color: GREY, it: true, before: 300 }));
kids.push(P("Well Kept Home Operations Management LLC  |  Falls Church, Virginia  |  Confidential, prepared for this household only", { size: 14, color: GREY, it: true, before: 120 }));

const doc = new Document({
  sections: [{
    properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1080, bottom: 1080, left: 1440, right: 1440 } } },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((b) => {
  fs.writeFileSync(outPath, b);
  console.log(`Exported: ${outPath}`);
  console.log(`  client-visible fields: ${clientFields.length} of ${seed.fields.length} total`);
  console.log(`  filled entries rendered: ${filled.length}`);
  console.log(`  payload assertion: PASSED (no s2/s3 content can reach this document)`);
});
