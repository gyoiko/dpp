import { getAuthSecret, getSessionTtlSeconds } from "@/lib/auth/config";
import { requestIsSameOrigin, setSessionCookie } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/auth/jwt";
import type { AuthRole } from "@/types/auth";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

type Attempt = { count: number; resetAt: number };

type GtiLoginResponse = {
  user?: {
    username: string;
    employeeNo: string;
    name: string;
    email: string | null;
    department: string | null;
    position: string | null;
    isAdmin: boolean;
    canViewAll: boolean;
  };
  error?: string;
};

const attempts = new Map<string, Attempt>();

function throttleKey(username: string, request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${username}|${forwarded ?? "local"}`;
}

function isThrottled(key: string): boolean {
  const entry = attempts.get(key);

  if (!entry) {
    return false;
  }

  if (entry.resetAt <= Date.now()) {
    attempts.delete(key);
    return false;
  }

  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(key: string): void {
  const entry = attempts.get(key);

  if (!entry || entry.resetAt <= Date.now()) {
    attempts.set(key, { count: 1, resetAt: Date.now() + ATTEMPT_WINDOW_MS });
    return;
  }

  entry.count += 1;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return Response.json({ error: "Cross-origin login is not allowed." }, { status: 403 });
  }

  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const username = text(payload.username);
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!username || !password) {
    return Response.json({ error: "Username and password are required." }, { status: 400 });
  }

  const key = throttleKey(username, request);

  if (isThrottled(key)) {
    return Response.json({ error: "Too many login attempts. Try again in a few minutes." }, { status: 429 });
  }

  const apiBase = (process.env.DPP_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

  try {
    const upstream = await fetch(`${apiBase}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const result = (await upstream.json().catch(() => null)) as GtiLoginResponse | null;

    if (!upstream.ok || !result?.user) {
      if (upstream.status === 401) {
        recordFailure(key);
      }

      const status = upstream.status === 400 || upstream.status === 403 || upstream.status === 502 ? upstream.status : 401;

      return Response.json(
        { error: result?.error ?? "Invalid username or password." },
        { status },
      );
    }

    attempts.delete(key);

    const gtiUser = result.user;
    const canViewAll = gtiUser.canViewAll || gtiUser.isAdmin;
    const role: AuthRole = canViewAll ? "admin" : "scm";
    const displayName = gtiUser.name || gtiUser.username;
    const email = gtiUser.email || `${gtiUser.username}@gti.local`;
    const employeeNo = gtiUser.employeeNo || gtiUser.username;
    const id = `gti:${gtiUser.username}`;

    const token = await signSessionToken(
      { sub: id, email, name: displayName, role, employeeNo, canViewAll, tv: 0 },
      getAuthSecret(),
      getSessionTtlSeconds(),
    );

    await setSessionCookie(token);

    return Response.json({ user: { id, email, name: displayName, role, employeeNo, canViewAll } });
  } catch (error) {
    console.error("[auth] failed to reach GTI Soft verification endpoint", error);
    return Response.json({ error: "GTI Soft authentication is unavailable." }, { status: 502 });
  }
}
