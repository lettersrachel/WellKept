import { Auth } from "@auth/core";
import { getAuthConfig } from "@/lib/auth/config";

/** Fronts /api/auth/signout the same way /signin/action fronts signin. */
export async function POST(request: Request) {
  const authConfig = getAuthConfig();

  const csrfResponse = await Auth(new Request(new URL("/api/auth/csrf", request.url)), authConfig);
  const { csrfToken } = (await csrfResponse.json()) as { csrfToken: string };
  const csrfCookie = csrfResponse.headers
    .getSetCookie()
    .find((line) => line.includes("csrf-token"))
    ?.split(";")[0];

  const signoutResponse = await Auth(
    new Request(new URL("/api/auth/signout", request.url), {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: [csrfCookie, request.headers.get("cookie")].filter(Boolean).join("; "),
      },
      body: new URLSearchParams({ csrfToken }).toString(),
    }),
    authConfig,
  );

  // Forward Auth.js's session-clearing cookies onto our own redirect.
  const headers = new Headers({ Location: new URL("/signin", request.url).toString() });
  for (const cookie of signoutResponse.headers.getSetCookie()) {
    headers.append("Set-Cookie", cookie);
  }
  return new Response(null, { status: 303, headers });
}
