const MAX_COMPOSITION_NOTE_LENGTH = 1000;
const MAX_COMPOSITION_NOTES_JSON_LENGTH = 20000;

export function parseCompositionNotes(value: string | null | undefined): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }

    const notes: Record<string, string> = {};

    for (const [key, raw] of Object.entries(parsed)) {
      if (typeof raw === "string" && raw.trim()) {
        notes[key] = raw.trim();
      }
    }

    return notes;
  } catch {
    return {};
  }
}

export function serialiseCompositionNotes(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error("compositionNotes must be an object keyed by fibre sequence number.");
  }

  const notes: Record<string, string> = {};

  for (const [key, raw] of Object.entries(value)) {
    if (typeof raw !== "string") {
      continue;
    }

    const note = raw.trim();

    if (!note) {
      continue;
    }

    if (key.length > 64) {
      throw new Error("compositionNotes contains an invalid key.");
    }

    if (note.length > MAX_COMPOSITION_NOTE_LENGTH) {
      throw new Error(`Each composition note must be at most ${MAX_COMPOSITION_NOTE_LENGTH} characters.`);
    }

    notes[key] = note;
  }

  if (Object.keys(notes).length === 0) {
    return null;
  }

  const json = JSON.stringify(notes);

  if (json.length > MAX_COMPOSITION_NOTES_JSON_LENGTH) {
    throw new Error("Composition notes are too large.");
  }

  return json;
}
