import { timingSafeEqual } from "node:crypto";
import DES from "des.js";

const BLOCK_SIZE = 8;
const GTI_DES_KEY = Buffer.concat([Buffer.from("cwDES1", "ascii"), Buffer.alloc(2)]);

export function encryptGtiPassword(password: string): string {
  if (password.length === 0) {
    return "";
  }

  const data = Buffer.from(password, "utf8");
  const remainder = data.length % BLOCK_SIZE;
  const padded = remainder === 0 ? data : Buffer.concat([data, Buffer.alloc(BLOCK_SIZE - remainder)]);
  const blocks: Buffer[] = [];

  for (let offset = 0; offset < padded.length; offset += BLOCK_SIZE) {
    const cipher = DES.DES.create({ type: "encrypt", key: GTI_DES_KEY, padding: false });
    blocks.push(Buffer.from(cipher.update(padded.subarray(offset, offset + BLOCK_SIZE))));
  }

  return Buffer.concat(blocks).toString("hex").toUpperCase();
}

export function gtiPasswordMatches(password: string, stored: string, encrypted: boolean): boolean {
  const target = stored.trim();

  if (!encrypted) {
    return safeEqual(password, target);
  }

  return safeEqual(encryptGtiPassword(password), target.toUpperCase());
}

function safeEqual(leftValue: string, rightValue: string): boolean {
  const left = Buffer.from(leftValue, "utf8");
  const right = Buffer.from(rightValue, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}
