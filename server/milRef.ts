export class MilRefError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MilRefError";
  }
}

export interface MilRefParts {
  keDanHao: string;
  keDanHang: string;
  shipmentSerial: string | null;
}

const EXAMPLE = "B02345-1 or B02345-1-YN2608120032";

export function formatMilRef(parts: MilRefParts): string {
  return parts.shipmentSerial
    ? `${parts.keDanHao}-${parts.keDanHang}-${parts.shipmentSerial}`
    : `${parts.keDanHao}-${parts.keDanHang}`;
}

export function parseMilRef(milRef: string): MilRefParts {
  const raw = (milRef ?? "").trim();
  const segments = raw.split("-");
  const keDanHao = (segments[0] ?? "").trim();
  const keDanHang = ((segments[1] ?? "").trim() || "1").trim();
  const shipmentSerial = segments.length > 2 ? segments.slice(2).join("-").trim() || null : null;

  if (!keDanHao) {
    throw new MilRefError(`MilRef is required. Expected format: ${EXAMPLE}.`);
  }

  if (!/^[A-Za-z0-9_]+$/.test(keDanHao)) {
    throw new MilRefError("KeDanHao may only contain letters, numbers, and underscores.");
  }

  if (!/^\d+$/.test(keDanHang)) {
    throw new MilRefError(`KeDanHang must be a number. Expected format: ${EXAMPLE}.`);
  }

  if (shipmentSerial && !/^[A-Za-z0-9_]+$/.test(shipmentSerial)) {
    throw new MilRefError("Shipment serial may only contain letters, numbers, and underscores.");
  }

  return { keDanHao, keDanHang, shipmentSerial };
}
