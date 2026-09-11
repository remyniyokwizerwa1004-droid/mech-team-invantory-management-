import "server-only";

import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import type { UserRole } from "@/generated/prisma/client";

const COOKIE_NAME = "mti_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // one week

export type SessionPayload = {
  userId: string;
  role: UserRole;
};

function signingKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "SESSION_SECRET is not set. Copy .env.example to .env and fill it in.",
    );
  }

  return new TextEncoder().encode(secret);
}

async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(signingKey());
}

async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, signingKey(), {
      algorithms: ["HS256"],
    });

    if (typeof payload.userId !== "string" || typeof payload.role !== "string") {
      return null;
    }

    return { userId: payload.userId, role: payload.role as UserRole };
  } catch {
    // Expired, tampered with, or signed by a different secret.
    return null;
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encrypt(payload);
  const cookieStore = await cookies();

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Cookies marked Secure are dropped over plain http, which localhost uses.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function readSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  return decrypt(token);
}

export async function destroySession(): Promise<void> {
  (await cookies()).delete(COOKIE_NAME);
}

/** Used by proxy.ts, which receives the request rather than reading cookies(). */
export async function readSessionFromToken(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  return decrypt(token);
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
