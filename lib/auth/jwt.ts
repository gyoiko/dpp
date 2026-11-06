import type { SessionPayload } from "../../types/auth";
import { isAuthRole } from "../../types/auth";
import { base64UrlToBytes, bytesToBase64Url, decodeJson, encodeJson } from "./encoding";

const HEADER = { alg: "HS256", typ: "JWT" } as const;
const encoder = new TextEncoder();

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export type SessionInput = {
  sub: string;
  email: string;
  name: string;
  role: SessionPayload["role"];
  tv: number;
};

export async function signSessionToken(
  input: SessionInput,
  secret: string,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const payload: SessionPayload = {
    ...input,
    iat: nowSeconds,
    exp: nowSeconds + ttlSeconds,
  };

  const signingInput = `${bytesToBase64Url(encodeJson(HEADER))}.${bytesToBase64Url(encodeJson(payload))}`;
  const key = await importKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(signingInput));

  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  try {
    const header = decodeJson<{ alg?: unknown; typ?: unknown }>(base64UrlToBytes(encodedHeader));

    if (header.alg !== HEADER.alg || header.typ !== HEADER.typ) {
      return null;
    }

    const key = await importKey(secret);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      base64UrlToBytes(encodedSignature),
      encoder.encode(`${encodedHeader}.${encodedPayload}`),
    );

    if (!valid) {
      return null;
    }

    const payload = decodeJson<Record<string, unknown>>(base64UrlToBytes(encodedPayload));

    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      !isAuthRole(payload.role) ||
      typeof payload.tv !== "number" ||
      typeof payload.iat !== "number" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    if (payload.exp <= nowSeconds) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      tv: payload.tv,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}
