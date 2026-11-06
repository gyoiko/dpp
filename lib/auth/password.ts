import { base64ToBytes, bytesToBase64 } from "./encoding";

const ALGORITHM = "pbkdf2";
const DIGEST = "sha256";
const ITERATIONS = 210_000;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;

async function derive(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );

  return new Uint8Array(bits);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${ALGORITHM}$${DIGEST}$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");

  if (parts.length !== 5 || parts[0] !== ALGORITHM || parts[1] !== DIGEST) {
    return false;
  }

  const iterations = Number(parts[2]);

  if (!Number.isInteger(iterations) || iterations < 1) {
    return false;
  }

  try {
    const salt = base64ToBytes(parts[3]);
    const expected = base64ToBytes(parts[4]);
    const actual = await derive(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
