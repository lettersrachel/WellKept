import { Auth } from "@auth/core";
import { getAuthConfig } from "@/lib/auth/config";

/**
 * Fronts Auth.js's CSRF-protected /api/auth/signin/email with a plain-form
 * endpoint: does the csrf-token-then-signin exchange server-to-server so the
 * form only POSTs an email. Synthetic requests are built from the REAL
 * incoming request URL — Auth.js embeds that origin into the magic link it
 * generates, and a made-up origin produces an unreachable link (a real bug
 * caught by hand in the foundation repo).
 */
export async function POST(request: Request) {
  const authConfig = getAuthConfig();
  const formData = await request.formData();
  const email = formData.get("email");
  if (typeof email !== "string" || !email) {
    return Response.redirect(new URL("/signin?error=missing-email", request.url), 303);
  }

  const csrfResponse = await Auth(new Request(new URL("/api/auth/csrf", request.url)), authConfig);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const csrfCookie = csrfResponse.headers
    .getSetCookie()
    .find((line) => line.includes("csrf-token"))
    ?.split(";")[0];

  await Auth(
    new Request(new URL("/api/auth/signin/email", request.url), {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfCookie ?? "" },
      body: new URLSearchParams({ email, csrfToken }).toString(),
    }),
    authConfig,
  );

  return Response.redirect(new URL("/verify-request", request.url), 303);
}
