import { count, eq } from "drizzle-orm";
import { getDb, type AppDb } from "@/db";
import { authUsers, type AuthUserRow } from "@/db/schema";
import { getAuthSecret, getSessionTtlSeconds } from "@/lib/auth/config";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { requestIsSameOrigin, setSessionCookie } from "@/lib/auth/session";
import { signSessionToken } from "@/lib/auth/jwt";
import { isAuthRole, type AuthRole } from "@/types/auth";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 5 * 60 * 1000;

type Attempt = { count: number; resetAt: number };

const attempts = new Map<string, Attempt>();

function throttleKey(email: string, request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return `${email}|${forwarded ?? "local"}`;
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

async function createBootstrapAdmin(email: string, password: string, db: AppDb) {
  const configuredEmail = process.env.AUTH_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const configuredPassword = process.env.AUTH_BOOTSTRAP_PASSWORD ?? "";

  if (!configuredEmail || configuredEmail !== email || configuredPassword !== password) {
    return null;
  }

  const [{ total }] = await db.select({ total: count() }).from(authUsers);

  if (total > 0) {
    return null;
  }

  const now = new Date().toISOString();

  const [created] = await db
    .insert(authUsers)
    .values({
      id: crypto.randomUUID(),
      email,
      name: "Administrator",
      passwordHash: await hashPassword(password),
      role: "admin",
      isActive: true,
      lastLoginAt: now,
      updatedAt: now,
    })
    .returning();

  return created ?? null;
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

  const email = text(payload.email).toLowerCase();
  const password = typeof payload.password === "string" ? payload.password : "";

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const key = throttleKey(email, request);

  if (isThrottled(key)) {
    return Response.json({ error: "Too many login attempts. Try again in a few minutes." }, { status: 429 });
  }

  try {
    const db = await getDb();
    const [found] = await db.select().from(authUsers).where(eq(authUsers.email, email)).limit(1);
    let user: AuthUserRow | null = found ?? null;

    if (!user) {
      user = await createBootstrapAdmin(email, password, db);
    }

    if (!user) {
      recordFailure(key);
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    if (!user.isActive) {
      return Response.json({ error: "This account is disabled." }, { status: 403 });
    }

    const passwordMatches = await verifyPassword(password, user.passwordHash);

    if (!passwordMatches) {
      recordFailure(key);
      return Response.json({ error: "Invalid email or password." }, { status: 401 });
    }

    attempts.delete(key);

    const now = new Date().toISOString();
    await db.update(authUsers).set({ lastLoginAt: now }).where(eq(authUsers.id, user.id));

    const role: AuthRole = isAuthRole(user.role) ? user.role : "scm";
    const token = await signSessionToken(
      { sub: user.id, email: user.email, name: user.name, role, tv: user.tokenVersion },
      getAuthSecret(),
      getSessionTtlSeconds(),
    );

    await setSessionCookie(token);

    return Response.json({
      user: { id: user.id, email: user.email, name: user.name, role },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return Response.json({ error: message }, { status: 500 });
  }
}
