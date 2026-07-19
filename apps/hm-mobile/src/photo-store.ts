/**
 * Durable holding for un-synced photos. A house manager who captures photos
 * offline shouldn't lose them if the app is backgrounded or killed before the
 * next sync — so pending photos (bytes included) are persisted to AsyncStorage
 * per household and rehydrated on launch. Uploaded photos live on the server,
 * so they're dropped from the local store.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LocalPhoto } from "./photos";

const keyFor = (householdId: string) => `wk-photos:${householdId}`;

export async function loadPendingPhotos(householdId: string): Promise<LocalPhoto[]> {
  const raw = await AsyncStorage.getItem(keyFor(householdId));
  return raw ? (JSON.parse(raw) as LocalPhoto[]) : [];
}

export async function savePendingPhotos(householdId: string, photos: LocalPhoto[]): Promise<void> {
  const pending = photos.filter((p) => !p.uploaded);
  if (pending.length === 0) await AsyncStorage.removeItem(keyFor(householdId));
  else await AsyncStorage.setItem(keyFor(householdId), JSON.stringify(pending));
}
