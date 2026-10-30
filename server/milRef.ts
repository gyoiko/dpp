export class MilRefError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MilRefError";
  }
}

export interface MilRefParts {
  keDanHao: string;
  keDanHang: string;
}

export function parseMilRef(milRef: string, example = "B02345-1"): MilRefParts {
  const raw = (milRef ?? "").trim();
  const separatorIndex = raw.indexOf("-");
  const keDanHao = (separatorIndex === -1 ? raw : raw.slice(0, separatorIndex)).trim();
  const linePart = separatorIndex === -1 ? "" : raw.slice(separatorIndex + 1).split("-")[0];
  const keDanHang = linePart.trim() || "1";

  if (!keDanHao) {
    throw new MilRefError(`MilRef is required. Expected format: KeDanHao-KeDanHang, e.g. ${example}.`);
  }

  if (!/^[A-Za-z0-9_]+$/.test(keDanHao)) {
    throw new MilRefError("KeDanHao may only contain letters, numbers, and underscores.");
  }

  if (!/^\d+$/.test(keDanHang)) {
    throw new MilRefError(`KeDanHang must be a number, e.g. ${example}.`);
  }

  return { keDanHao, keDanHang };
}
