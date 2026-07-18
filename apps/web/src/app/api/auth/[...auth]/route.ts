import { Auth } from "@auth/core";
import { getAuthConfig } from "@/lib/auth/config";

// Pure pass-through to Auth.js: magic-link callback, session, csrf, signout.
export async function GET(request: Request) { return Auth(request, getAuthConfig()); }
export async function POST(request: Request) { return Auth(request, getAuthConfig()); }
