const DEV_FALLBACK_SECRET = "dpp-local-dev-secret-do-not-use-in-production";

export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();

  if (secret && secret.length >= 32) {
    return secret;
  }

  if (process.env.NODE_ENV !== "production") {
    return DEV_FALLBACK_SECRET;
  }

  throw new Error("AUTH_SECRET is not configured. Set a random string of at least 32 characters in .env.");
}

export function getSessionTtlSeconds(): number {
  const hours = Number(process.env.AUTH_SESSION_HOURS ?? 8);
  const safeHours = Number.isFinite(hours) ? Math.min(Math.max(hours, 1), 168) : 8;
  return Math.round(safeHours * 3600);
}

export function isCookieSecure(): boolean {
  return process.env.AUTH_COOKIE_SECURE === "true";
}
