export const AUTH_ROLES = ["admin", "scm", "marketing", "viewer"] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export const SESSION_COOKIE = "dpp_session";

export function isAuthRole(value: unknown): value is AuthRole {
  return typeof value === "string" && (AUTH_ROLES as readonly string[]).includes(value);
}

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AuthRole;
};

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: AuthRole;
  tv: number;
  iat: number;
  exp: number;
};
