import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, type SessionPayload } from "@/types/auth";
import { getAuthSecret, getSessionTtlSeconds, isCookieSecure } from "./config";
import { verifySessionToken } from "./jwt";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return verifySessionToken(token, getAuthSecret());
}

export async function requireSessionUser(): Promise<SessionPayload> {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return session;
}

export function unauthorizedResponse(message = "Authentication required."): Response {
  return Response.json({ error: message }, { status: 401 });
}

export async function requireApiSession(): Promise<SessionPayload | Response> {
  const session = await getSession();
  return session ?? unauthorizedResponse();
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isCookieSecure(),
    path: "/",
    maxAge: getSessionTtlSeconds(),
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: isCookieSecure(),
    path: "/",
    maxAge: 0,
  });
}

export function requestIsSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");

  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
