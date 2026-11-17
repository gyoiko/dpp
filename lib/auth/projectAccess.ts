import { cookies } from "next/headers";
import { SESSION_COOKIE, type SessionPayload } from "@/types/auth";

export class ProjectAccessError extends Error {
  constructor(message = "Cannot verify project access. Make sure the ERP API is running.") {
    super(message);
    this.name = "ProjectAccessError";
  }
}

function apiBase(): string {
  return (process.env.DPP_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");
}

async function forwardedCookie(): Promise<Record<string, string>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { cookie: `${SESSION_COOKIE}=${token}` } : {};
}

export async function isProjectAllowed(session: SessionPayload, keDanHao: string): Promise<boolean> {
  if (session.canViewAll) {
    return true;
  }

  const response = await fetch(`${apiBase()}/api/dpp/access/${encodeURIComponent(keDanHao)}`, {
    headers: await forwardedCookie(),
    cache: "no-store",
  });

  if (response.status === 401 || response.status === 403) {
    return false;
  }

  if (!response.ok) {
    throw new ProjectAccessError();
  }

  const payload = (await response.json()) as { allowed?: boolean };
  return payload.allowed === true;
}

export async function filterAllowedKeDanHao(
  session: SessionPayload,
  keDanHaos: string[],
): Promise<Set<string>> {
  const unique = Array.from(new Set(keDanHaos.map((value) => value.trim()).filter(Boolean)));

  if (unique.length === 0) {
    return new Set();
  }

  if (session.canViewAll) {
    return new Set(unique);
  }

  const response = await fetch(`${apiBase()}/api/dpp/access/check`, {
    method: "POST",
    headers: { ...(await forwardedCookie()), "content-type": "application/json" },
    body: JSON.stringify({ keDanHaos: unique }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new ProjectAccessError();
  }

  const payload = (await response.json()) as { allowed?: string[] };
  return new Set(payload.allowed ?? []);
}
