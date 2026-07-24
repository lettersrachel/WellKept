/**
 * The three sprint-8 cascades (WK-DEV-005 S5: these land before the whole
 * library). Fleet-level rules; corporate_admin edits the library later
 * (REQ-051), so these are seed content, not code constants at runtime —
 * `pnpm seed:rules` upserts them into trigger_rule by fixed id.
 */
import type { TriggerRuleRow } from "./engine.ts";

export const CASCADES: TriggerRuleRow[] = [
  {
    // Kindergarten cascade (roster_age family): a child's school/age field
    // changing schedules the readiness pack around enrollment season.
    id: "019807e0-0000-7000-8000-00000000ca01",
    householdId: null,
    family: "roster_age",
    bindsToFieldName: "school",
    enabled: true,
    definition: {
      packName: "kindergarten-readiness",
      // methodRefs per Addendum A1 S4, founder-approved 2026-07-24.
      items: [
        { text: "School registration windows open soon: confirm enrollment paperwork and immunization records are located.", offsetDays: 7, methodRef: "STD-016.4.1" },
        { text: "Ask about before/after-care needs for the new school schedule.", offsetDays: 14, methodRef: "STD-016.4.1" },
        { text: "Uniform or supply list: order before the late-summer rush.", offsetDays: 30, methodRef: "STD-015.1.4" },
      ],
    },
  },
  {
    // Meds day cascade (calendar family): medication fields changing
    // schedule the refill-confirmation rhythm.
    id: "019807e0-0000-7000-8000-00000000ca02",
    householdId: null,
    family: "calendar",
    bindsToFieldName: "medication",
    enabled: true,
    definition: {
      packName: "meds-day",
      items: [
        { text: "Meds day: confirm the refill pickup was collected (bag on entry bench).", offsetDays: 30, methodRef: "STD-022.3.2" },
        // No methodRef, deliberately: this step appears to CONFLICT with the
        // personal-care floor (STD-022.3.3, never read a medication label;
        // STD-022.5.10 leaves auto-injectors an open question). Routed to
        // QA-010 v1.4 — reword the step or carve the exception, per policy.
        { text: "Check expiration dates on EpiPens/inhalers noted in the record.", offsetDays: 60 },
      ],
    },
  },
  {
    // Occasion radar cascade (calendar family): the important-dates
    // registry changing schedules the 14-day gesture radar.
    id: "019807e0-0000-7000-8000-00000000ca03",
    householdId: null,
    family: "calendar",
    bindsToFieldName: "important-dates",
    enabled: true,
    definition: {
      packName: "occasion-radar",
      items: [
        { text: "Occasion radar: scan the next 14 days for birthdays and anniversaries; is a gesture planned?", offsetDays: 1, methodRef: "STD-019.1.3" },
        { text: "Gesture gate check: cultural-fit reviewed and HM notified before execution (REQ-042).", offsetDays: 3, methodRef: "STD-019.8.1" },
      ],
    },
  },
];
