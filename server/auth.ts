import type { NextFunction, Request, Response } from "express";
import { getAuthSecret } from "../lib/auth/config";
import { verifySessionToken } from "../lib/auth/jwt";
import { SESSION_COOKIE, type SessionPayload } from "../types/auth";

declare module "express-serve-static-core" {
  interface Request {
    user?: SessionPayload;
  }
}

function readCookie(header: string | undefined, name: string): string | null {
  if (!header) {
    return null;
  }

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");

    if (separator === -1) {
      continue;
    }

    if (part.slice(0, separator).trim() !== name) {
      continue;
    }

    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }

  return null;
}

export async function requireApiAuth(request: Request, response: Response, next: NextFunction): Promise<void> {
  const token = readCookie(request.headers.cookie, SESSION_COOKIE);

  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const session = await verifySessionToken(token, getAuthSecret());

    if (!session) {
      response.status(401).json({ error: "Invalid or expired session." });
      return;
    }

    request.user = session;
    next();
  } catch {
    response.status(500).json({ error: "Authentication check failed." });
  }
}
