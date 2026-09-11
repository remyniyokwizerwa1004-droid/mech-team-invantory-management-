import { jwtVerify } from "jose";
import { NextResponse, type NextRequest } from "next/server";

/**
 * A first, cheap filter: anyone without a valid session cookie is sent to the
 * login page before a protected route renders.
 *
 * This is a convenience, not the security boundary. It only reads the cookie
 * and never touches the database, because it runs on every request including
 * prefetches. The real checks live in src/lib/auth.ts, next to the data.
 */

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/locations",
  "/admin",
  "/requisitions",
  "/tickets",
  "/tools/new",
  "/tools/manage",
];

const EDIT_ROUTE = /^\/tools\/[^/]+\/edit\/?$/;

function isProtected(pathname: string): boolean {
  if (
    PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }

  return EDIT_ROUTE.test(pathname);
}

async function hasValidSession(token: string | undefined): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(secret), {
      algorithms: ["HS256"],
    });
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get("mti_session")?.value;

  if (await hasValidSession(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.nextUrl);
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
