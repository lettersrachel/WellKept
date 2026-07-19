/**
 * Pre-visit briefing fetch + offline cache. Fetch it while online (arriving at
 * the home), and it's cached to AsyncStorage so it's still readable if the
 * signal drops mid-visit — the whole point of a field tool. `stale` tells the
 * UI it's showing a cached copy.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Briefing {
  household: { name: string; tier: string; lifeEvent: boolean; stranger: boolean };
  flags: { name: string; flag: string; value: string | null }[];
  changed: { name: string; value: string; updatedAt: string; provenance: string }[];
  specials: { text: string; packName: string }[];
  radar: { text: string; packName: string; fireAt: string }[];
  dots: { verbatim: string; heardAt: string }[];
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
