import { Auth } from "@auth/core";
import { getAuthConfig } from "./config";

/**
 * Trigger the Auth.js email sign-in (magic link + typed code) for an
 * address, doing the csrf-token-then-signin exchange server-to-server.
 * The synthetic requests are built from the REAL incoming request URL:
 * Auth.js embeds that origin into the link it generates, and a made-up
 * origin produces an unreachable link. Shared by the web form action and
 * the mobile sign-in endpoint. Returns false when the send failed.
 */
export async function sendSigninEmail(requestUrl: string | URL, email: string): Promise<boolean> {
  const authConfig = getAuthConfig();
  const csrfResponse = await Auth(new Request(new URL("/api/auth/csrf", requestUrl)), authConfig);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const csrfCookie = csrfResponse.headers
    .getSetCookie()
    .find((line) => line.includes("csrf-token"))
    ?.split(";")[0];

  const signinResponse = await Auth(
    new Request(new URL("/api/auth/signin/email", requestUrl), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfCookie ?? "" },
      body: new URLSearchParams({ email, csrfToken }).toString(),
    }),
    authConfig,
  );
  const location = signinResponse.headers.get("location") ?? "";
  return !location.includes("error=");
}
