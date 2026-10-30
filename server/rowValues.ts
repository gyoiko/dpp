export function toText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const text = String(value).trim();
  return text === "" ? null : text;
}

export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : null;
}

export function toYesNoBoolean(value: unknown): boolean | null {
  const text = toText(value);

  if (text === null) {
    return null;
  }

  const normalized = text.toLowerCase();

  if (["yes", "y", "true", "1"].includes(normalized)) {
    return true;
  }

  if (["no", "n", "false", "0"].includes(normalized)) {
    return false;
  }

  return null;
}
