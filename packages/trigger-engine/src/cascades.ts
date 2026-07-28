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
        { text: "School registration windows open soon: confirm the enrollment paperwork and immunization records are where you can find them.", offsetDays: 7, methodRef: "STD-016.4.1" },
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
        // Reworded per founder decision 2026-07-24: labels are NEVER read
        // unless the Playbook explicitly directs it (STD-022.3.3 stays a
        // floor). The prompt works from documented dates, not from labels.
        { text: "Where the record documents medication expiry dates (EpiPens/inhalers), flag any approaching to the client. Never read a label unless the Playbook explicitly directs it.", offsetDays: 60, methodRef: "STD-016.6.4" },
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
        // Voice pass (founder item 6, 2026-07-28): the spec citation mid-briefing
        // was machine voice; the gate itself stays in the methodRef.
        { text: "Before the gesture goes out: has the cultural-fit review happened, and does everyone involved know the plan?", offsetDays: 3, methodRef: "STD-019.8.1" },
      ],
    },
  },
];
