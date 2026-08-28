import { test, vi, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { promptPackItem, promptOutcome } from "@wellkept/schema";

/**
 * The founder's ruling, 27 August 2026, in two halves:
 *
 *   ANSWERING RETIRES THE PROMPT. Surfacing does not, and nothing ages
 *   out. Before this, NOTHING in the repository wrote
 *   `promptPackItem.fired_at` at all (17 references, zero updates), so
 *   every prompt ever scheduled stayed open forever and the field panel
 *   accumulated a backlog it then labelled "due today".
 *
 *   DISMISS NEEDS A REASON, because answering is what closes the prompt,
 *   so Dismiss is the destructive half of the pair and a dismissal with
 *   no reason produces a retired prompt nobody can account for later.
 *
 * The column-confusion risk is the reason the first test asserts on the
 * TABLE OBJECT rather than on a column name: `promptOutcome.firedAt` and
 * `promptPackItem.firedAt` are two different columns sharing a name, and a
 * test that only checked "something wrote firedAt" would pass on the
 * outcome row alone, which closes nothing.
 */
const calls: { op: string; table: unknown; row: Record<string, unknown> }[] = [];

const ITEM = {
  id: "p-1", householdId: "h-1", triggerRuleId: "r-1",
  fireAt: new Date("2026-07-19T09:00:00Z"), firedAt: null, targetDate: null,
};

vi.mock("./db", () => ({
  db: {
    select: () => ({ from: () => ({ where: () => Promise.resolve([ITEM]) }) }),
    insert: (table: unknown) => ({
      values: (row: Record<string, unknown>) => ({
        onConflictDoNothing: () => { calls.push({ op: "insert", table, row }); return Promise.resolve(); },
      }),
    }),
    update: (table: unknown) => ({
      set: (row: Record<string, unknown>) => ({
        where: () => { calls.push({ op: "update", table, row }); return Promise.resolve(); },
      }),
    }),
  },
}));
vi.mock("./session", () => ({
  getPrincipal: async () => ({ userId: "u-1", role: "house_manager", householdId: "h-1" }),
}));
vi.mock("./field-events", () => ({ emitFieldChange: async () => {}, outboxFieldEvent: async () => {} }));
vi.mock("./vault", () => ({ vaultWrite: async () => {} }));
vi.mock("./client-allowlist", () => ({ isClientEditable: () => false }));
vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => { const e = new Error("NEXT_REDIRECT"); (e as unknown as { url: string }).url = url; throw e; },
}));

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => { calls.length = 0; });

test("answering RETIRES the prompt: the update lands on promptPackItem, not only the outcome row", async () => {
  const { recordPromptOutcome } = await import("./actions");
  await assert.rejects(() => recordPromptOutcome(form({
    promptId: "p-1", outcome: "acted", wasNews: "true",
  })), /NEXT_REDIRECT/);

  const outcomeInsert = calls.find((c) => c.op === "insert" && c.table === promptOutcome);
  assert.ok(outcomeInsert, "the outcome row must still be written");

  const retire = calls.find((c) => c.op === "update" && c.table === promptPackItem);
  assert.ok(retire, "answering must write promptPackItem.fired_at; nothing else in the system does");
  assert.ok(retire!.row.firedAt instanceof Date, "fired_at must carry the answer time, not a flag");
});

test("dismissing also retires, since a dismissal is an answer", async () => {
  const { recordPromptOutcome } = await import("./actions");
  await assert.rejects(() => recordPromptOutcome(form({
    promptId: "p-1", outcome: "dismissed", dismissReason: "wrong",
  })), /NEXT_REDIRECT/);
  assert.ok(calls.find((c) => c.op === "update" && c.table === promptPackItem),
    "dismiss closes the prompt exactly as acted does");
});

test("DISMISS WITHOUT A REASON IS REFUSED, and writes nothing at all", async () => {
  const { recordPromptOutcome } = await import("./actions");
  await assert.rejects(() => recordPromptOutcome(form({
    promptId: "p-1", outcome: "dismissed",
  })), /NEXT_REDIRECT/);
  assert.equal(calls.length, 0,
    "a refused dismissal must not write the outcome row NOR retire the prompt");
});

test("a dismiss reason outside the vocabulary is refused, never coerced to null", async () => {
  const { recordPromptOutcome } = await import("./actions");
  await assert.rejects(() => recordPromptOutcome(form({
    promptId: "p-1", outcome: "dismissed", dismissReason: "because-i-said-so",
  })), /NEXT_REDIRECT/);
  assert.equal(calls.length, 0, "an unrecognised reason is bad input, not an absent reason");
});

test("acted still needs no reason: the destructive half is the half that needs the record", async () => {
  const { recordPromptOutcome } = await import("./actions");
  await assert.rejects(() => recordPromptOutcome(form({
    promptId: "p-1", outcome: "already_done",
  })), /NEXT_REDIRECT/);
  assert.ok(calls.find((c) => c.op === "insert" && c.table === promptOutcome),
    "already_done is self-explaining and must not be gated on a reason");
});
