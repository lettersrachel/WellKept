/**
 * Pre-visit briefing fetch + offline cache. Fetch it while online (arriving at
 * the home), and it's cached to AsyncStorage so it's still readable if the
 * signal drops mid-visit — the whole point of a field tool. `stale` tells the
 * UI it's showing a cached copy.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

/** Bound standard provisions (Addendum A1 T4); floors carry "red-block". */
export interface BriefingProvision {
  id: string; document: string; text: string; tier: string; treatment: "red-block" | "quiet";
}

export interface Briefing {
  household: { name: string; tier: string; lifeEvent: boolean; stranger: boolean };
  flags: { name: string; flag: string; value: string | null; provisions?: BriefingProvision[] }[];
  changed: { name: string; value: string; updatedAt: string; provenance: string; provisions?: BriefingProvision[] }[];
  specials: { text: string; packName: string }[];
  radar: { text: string; packName: string; fireAt: string }[];
  /** A2/REQ-054 recall lines — optional so pre-A2 cached briefings still parse. */
  lastYear?: { summary: string; anchorKind: string; observedAt: string }[];
  dots: { verbatim: string; heardAt: string }[];
  /** Cockpit baseline build 1 (open-loops parity): the API always sent
   * these three; optional so pre-parity cached briefings still parse. */
  conditionFlags?: {
    id: string; subject: string; location: string; concern: string;
    revisit: string | null; looks: number[]; promotionCandidate: boolean;
  }[];
  overdueDeferrals?: { id: string; noticed: string; reason: string; plannedFor: string | null }[];
  overduePausedDecisions?: { id: string; decision: string; research: string; plannedFor: string | null }[];
}

const keyFor = (householdId: string) => `wk-briefing:${householdId}`;

export async function fetchBriefing(
  apiUrl: string,
  token: string,
  householdId: string,
): Promise<{ briefing: Briefing | null; stale: boolean }> {
  try {
    if (!apiUrl) throw new Error("no api");
    const res = await fetch(`${apiUrl}/api/mobile/briefing?householdId=${householdId}`, {
      headers: { cookie: `authjs.session-token=${token}` },
    });
    if (!res.ok) throw new Error(`briefing ${res.status}`);
    const briefing = (await res.json()) as Briefing;
    await AsyncStorage.setItem(keyFor(householdId), JSON.stringify(briefing));
    return { briefing, stale: false };
  } catch {
    // Offline / server unreachable: fall back to the last cached brief.
    const raw = await AsyncStorage.getItem(keyFor(householdId));
    return { briefing: raw ? (JSON.parse(raw) as Briefing) : null, stale: true };
  }
}
