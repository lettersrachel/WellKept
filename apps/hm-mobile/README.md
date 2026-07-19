# Well Kept — House Manager app

Expo SDK 54 / React Native 0.81. The offline-first field surface: the same
`@wellkept/close-flow` state machine and `@wellkept/offline-queue` the web
wizard uses, persisted to `AsyncStorage`, syncing to `POST /api/visit-commands`.

## Auth — device pairing

No magic link or TOTP on the phone. Instead:

1. On the web, a signed-in + MFA-cleared house manager opens **/link-device**
   and gets a short-lived pairing code.
2. In this app's **Pair this device** screen, they enter the code.
3. `POST /api/mobile/pair` exchanges it (single-use, ~10 min TTL) for a real
   30-day `auth_session`, stored in the OS keychain via `expo-secure-store`.
   The session is minted `mfa_satisfied` — the human proved both factors on
   the web to create the code — so it can drive `/api/visit-commands`, which
   requires the second factor.

Sessions are revocable from corporate (**Sign out** in the People & access
panel deletes them). The app's own **Sign out** clears the keychain.

## Run it

```sh
# set EXPO_PUBLIC_API_URL in .env to your machine's LAN IP (phone can't reach
# localhost) or the production URL, then:
pnpm --filter @wellkept/hm-mobile start   # scan the QR in Expo Go
```

- `App.tsx` — boot → pairing → household picker → close-flow screen.
- `src/session.ts` — keychain session + the pairing exchange.
- `src/visit-sync.ts` — AsyncStorage twin of the web offline queue.

Offline is first-class: capture and the queue work with no network; sync waits.
Camera capture logs a placeholder photo id (a later sprint).

## Checks

```sh
pnpm --filter @wellkept/hm-mobile typecheck
pnpm --filter @wellkept/hm-mobile bundle:check   # metro bundle, catches native-module resolution
```
