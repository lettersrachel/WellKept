/**
 * WK-DEV-009 section 6, the Notification Firewall's v1 policy: every
 * attention record is ROUTED to one of five destinations, and "event
 * exists" never maps to "push notification". The v1 rule set is
 * DETERMINISTIC AND CONSERVATIVE by decision:
 *
 *  - hom audience -> previsit_brief (the quiet default: noticing reaches
 *    the HOM when they next prepare for the household, never as a ping)
 *  - corporate and founder audiences -> corporate_queue
 *  - NOTHING routes to immediate_interrupt or next_transition_prompt.
 *    Section 6 reserves interrupts for delay that materially changes
 *    safety, access, a client commitment, or imminent execution; deciding
 *    WHICH sources meet that bar is a safety taxonomy, and no engineer
 *    picks the safety list (the capture router's posture). The founder's
 *    rule set is the knob; the vocabulary already carries all five so
 *    its arrival needs no migration.
 *  - end_of_visit_review exists for low-urgency proposals and receives
 *    its first traffic when a proposal-shaped source exists (Tier M
 *    drafts); nothing today qualifies.
 *
 * Off-shift boundaries (absolute for routine notifications) require
 * shift data the system does not hold; recorded here as unbuilt, not
 * approximated. SITUATIONS (grouping related signals into one bundle)
 * are section 10 substrate, stubbed by name, their own session.
 */
export const ATTENTION_DESTINATIONS = [
  "immediate_interrupt", "next_transition_prompt", "previsit_brief",
  "end_of_visit_review", "corporate_queue",
] as const;
export type AttentionDestination = (typeof ATTENTION_DESTINATIONS)[number];

export function destinationFor(record: { audience: string }): AttentionDestination {
  return record.audience === "hom" ? "previsit_brief" : "corporate_queue";
}
