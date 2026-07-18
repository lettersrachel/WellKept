/**
 * Hermes has no globalThis.crypto; the domain packages (@wellkept/close-flow,
 * @wellkept/offline-queue) call crypto.randomUUID for idempotency keys.
 * Platform capability, so the shell polyfills it — the packages stay clean
 * for browser and Node. Must run before App imports the packages.
 */
import * as Crypto from "expo-crypto";

const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
g.crypto ??= {};
g.crypto.randomUUID ??= () => Crypto.randomUUID();

import { registerRootComponent } from "expo";
import App from "./App";

registerRootComponent(App);
