import { NextRequest, NextResponse } from "next/server";

/**
 * Enforcing CSP with a per-request nonce (graduated from the report-only
 * policy). script-src is locked to 'self' + this request's nonce +
 * 'strict-dynamic' — Next applies the nonce to its own hydration scripts,
 * and nothing else executes, which is the real XSS win. style-src keeps
 * 'unsafe-inline' because the app uses inline style attributes (which
 * nonces can't cover and which carry far less risk than script injection).
 * Dev additionally needs 'unsafe-eval' for React Fast Refresh.
 */
export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV !== "production";

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data:`,
    `font-src 'self'`,
    `connect-src 'self'`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Run on pages, skip static assets and image optimizer for overhead.
  matcher: [
    { source: "/((?!_next/static|_next/image|favicon.ico).*)", missing: [{ type: "header", key: "next-router-prefetch" }] },
  ],
};
