/**
 * The three sprint-8 cascades (WK-DEV-005 S5: these land before the whole
 * library). Fleet-level rules; corporate_admin edits the library later
 * (REQ-051), so these are seed content, not code constants at runtime —
 * `pnpm seed:rules` upserts them into trigger_rule by fixed id.
 */
import type { TriggerRuleRow } from "./engine";

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
      items: [
        { text: "School registration windows open soon: confirm enrollment paperwork and immunization records are located.", offsetDays: 7 },
        { text: "Ask about before/after-care needs for the new school schedule.", offsetDays: 14 },
        { text: "Uniform or supply list: order before the late-summer rush.", offsetDays: 30 },
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
        { text: "Meds day: confirm the refill pickup was collected (bag on entry bench).", offsetDays: 30 },
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
        { text: "Occasion radar: scan the next 14 days for birthdays and anniversaries; is a gesture planned?", offsetDays: 1 },
        { text: "Gesture gate check: cultural-fit reviewed and HM notified before execution (REQ-042).", offsetDays: 3 },
      ],
    },
  },
];
