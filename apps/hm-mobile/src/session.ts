/**
 * Device session, held in the OS keychain (expo-secure-store), not plain
 * AsyncStorage. The token is a real auth_session minted by the web pairing
 * exchange; it rides as the authjs.session-token cookie on every API call,
 * exactly like the browser. No magic-link or TOTP code ever touches the
 * phone — the human proved both on the web to create the pairing code.
 */
import * as SecureStore from "expo-secure-store";

export interface Household {
  id: string;
  name: string;
  role: string;
}

export interface Session {
  token: string;
  userId: string;
  households: Household[];
}

const TOKEN_KEY = "wk.session.token";
const META_KEY = "wk.session.meta";

export async function loadSession(): Promise<Session | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  if (!token) return null;
  const raw = await SecureStore.getItemAsync(META_KEY);
  const meta = raw ? (JSON.parse(raw) as { userId?: string; households?: Household[] }) : {};
  return { token, userId: meta.userId ?? "", households: meta.households ?? [] };
}

export async function saveSession(session: Session): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, session.token);
  await SecureStore.setItemAsync(META_KEY, JSON.stringify({ userId: session.userId, households: session.households }));
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await SecureStore.deleteItemAsync(META_KEY);
}

/** Exchange a pairing code (from the web /link-device screen) for a session. */
export async function pairDevice(apiUrl: string, code: string): Promise<Session> {
  if (!apiUrl) throw new Error("No server configured (set EXPO_PUBLIC_API_URL).");
  const res = await fetch(`${apiUrl}/api/mobile/pair`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code: code.trim().toLowerCase() }),
  });
  if (!res.ok) {
    throw new Error(res.status === 401 ? "That code is invalid or has expired." : `Pairing failed (${res.status}).`);
  }
  const data = (await res.json()) as { sessionToken: string; userId: string; households: Household[] };
  const session: Session = { token: data.sessionToken, userId: data.userId, households: data.households };
  await saveSession(session);
  return session;
}
