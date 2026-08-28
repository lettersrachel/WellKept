import { describe, it, expect } from "vitest";
import { promptTiming, overdueLabel, partitionPrompts, PROMPT_CAPS } from "./prompt-timing.ts";

const at = (iso: string) => new Date(iso);
const NOW = at("2026-09-03T14:30:00Z"); // the demo clock, mid-afternoon

describe("promptTiming: the label is COMPUTED, never a bucket's name", () => {
  it("says due today only when the prompt fires today", () => {
    // Both ends of the same calendar day, against a mid-afternoon now.
    expect(promptTiming(at("2026-09-03T00:00:00Z"), NOW).label).toBe("due today");
    expect(promptTiming(at("2026-09-03T23:59:00Z"), NOW).label).toBe("due today");
    expect(promptTiming(at("2026-09-03T00:00:00Z"), NOW).state).toBe("due_today");
  });

  it("THE DEFECT: yesterday is not today", () => {
    // This is the whole reason the module exists. Under the old code every
    // one of these read "due today" because it sat in a <= bucket.
    expect(promptTiming(at("2026-09-02T09:00:00Z"), NOW).label).toBe("overdue by 1 day");
    expect(promptTiming(at("2026-08-18T09:00:00Z"), NOW).label).toBe("overdue by 16 days");
    expect(promptTiming(at("2026-07-19T09:00:00Z"), NOW).label).toBe("overdue by 2 months");
  });

  it("the spec's water heater line is sayable", () => {
    // "Water heater anode check is now overdue by two months."
    const t = promptTiming(at("2026-07-04T12:00:00Z"), NOW);
    expect(t.state).toBe("overdue");
    expect(t.label).toBe("overdue by 2 months");
  });

  it("upcoming carries NO label, because the surface renders the date", () => {
    const t = promptTiming(at("2026-09-14T09:00:00Z"), NOW);
    expect(t.state).toBe("upcoming");
    expect(t.label).toBeNull();
    expect(t.overdueDays).toBe(0);
  });

  it("overdueDays is never negative", () => {
    expect(promptTiming(at("2026-12-01T00:00:00Z"), NOW).overdueDays).toBe(0);
  });

  it("switches from exact days to months past 45, singular at each end", () => {
    expect(overdueLabel(1)).toBe("overdue by 1 day");
    expect(overdueLabel(45)).toBe("overdue by 45 days");
    expect(overdueLabel(46)).toBe("overdue by 2 months");
    expect(overdueLabel(30)).toBe("overdue by 30 days");
    expect(overdueLabel(60)).toBe("overdue by 2 months");
    expect(overdueLabel(0)).toBe("due today");
  });

  it("compares CALENDAR days, so time of day cannot shift the answer", () => {
    // A prompt at 23:00 last night against 00:30 this morning is one day
    // late, not zero. An hours-based delta would call it zero.
    const t = promptTiming(at("2026-09-02T23:00:00Z"), at("2026-09-03T00:30:00Z"));
    expect(t.label).toBe("overdue by 1 day");
  });
});

describe("partitionPrompts: a backlog cannot starve the forward view", () => {
  // The reproduction. Eight past-due items and six future ones, which is
  // exactly the Fernbrook shape: under one pool of 8 ordered oldest-first,
  // the future six were never fetched at all.
  const eightOverdue = [
    "2026-07-19", "2026-07-24", "2026-07-28", "2026-08-04",
    "2026-08-08", "2026-08-12", "2026-08-15", "2026-08-18",
  ].map((d) => ({ id: d, fireAt: at(`${d}T09:00:00Z`) }));
  const sixUpcoming = [
    "2026-09-07", "2026-09-16", "2026-09-26",
    "2026-09-30", "2026-10-08", "2026-10-15",
  ].map((d) => ({ id: d, fireAt: at(`${d}T09:00:00Z`) }));

  it("returns BOTH lists when the overdue list exceeds its cap", () => {
    const p = partitionPrompts([...eightOverdue, ...sixUpcoming], NOW);
    expect(p.now).toHaveLength(PROMPT_CAPS.overdue);
    expect(p.upcoming).toHaveLength(6); // all six, none starved
    expect(p.upcomingHidden).toBe(0);
  });

  it("reports the remainder as a COUNT rather than truncating silently", () => {
    const p = partitionPrompts([...eightOverdue, ...sixUpcoming], NOW);
    expect(p.nowTotal).toBe(8);
    expect(p.nowHidden).toBe(3);
  });

  it("hides nothing when both lists fit", () => {
    const p = partitionPrompts([...eightOverdue.slice(0, 3), ...sixUpcoming.slice(0, 2)], NOW);
    expect(p.nowHidden).toBe(0);
    expect(p.upcomingHidden).toBe(0);
    expect(p.nowTotal).toBe(3);
  });

  it("keeps the oldest overdue items, not an arbitrary five", () => {
    const p = partitionPrompts([...eightOverdue, ...sixUpcoming], NOW);
    expect(p.now.map((i) => i.id)).toEqual([
      "2026-07-19", "2026-07-24", "2026-07-28", "2026-08-04", "2026-08-08",
    ]);
  });

  it("orders upcoming soonest first", () => {
    const p = partitionPrompts([...sixUpcoming].reverse(), NOW);
    expect(p.upcoming[0]?.id).toBe("2026-09-07");
  });

  it("puts a due-today item in the now list, beside the overdue ones", () => {
    const today = { id: "today", fireAt: at("2026-09-03T08:00:00Z") };
    const p = partitionPrompts([today, ...eightOverdue.slice(0, 2)], NOW);
    expect(p.now.map((i) => i.id)).toEqual(["2026-07-19", "2026-07-24", "today"]);
  });

  it("both lists are empty for an empty input, and nothing is hidden", () => {
    const p = partitionPrompts([], NOW);
    expect(p.now).toEqual([]);
    expect(p.upcoming).toEqual([]);
    expect(p.nowHidden).toBe(0);
    expect(p.upcomingHidden).toBe(0);
  });
});
