// src/core/constants/textLimits.ts

/**
 * The most text a field of shared campaign content may hold (T119, F4).
 *
 * Generous on purpose: they bound what one write can cost every member who
 * downloads it, and are not meant to shape what players write.
 *
 * Lengths are `String.length`, UTF-16 code units, which is also what the
 * production rules' `size()` counts (measured in the emulator, 2026-10-07: two
 * emoji are 4 there too). `firestore.rules.prod` repeats these numbers, field
 * by field; change both together.
 */
export const TEXT_LIMITS = {
  /** A name, a title, and other one-line fields. */
  line: 200,
  /** A description, a rumour, a note, an objective. */
  text: 10_000,
  /** A chapter's text: about 30,000 words. */
  chapter: 200_000,
  /** The saga, which is one document: about 80,000 words, inside Firestore's 1 MiB. */
  saga: 500_000,
} as const;

/** A field and the most text it may hold. */
export type TextLimitTable = Readonly<Record<string, number>>;

const { line, text, chapter, saga } = TEXT_LIMITS;

/**
 * The capped fields of each kind of campaign record, by collection. Fields not
 * listed are lists or not text; the rules cannot bound what is inside a list.
 */
export const RECORD_TEXT_LIMITS: Readonly<Record<string, TextLimitTable>> = {
  npcs: {
    name: line, title: line, race: line, occupation: line, location: line,
    description: text, appearance: text, personality: text, background: text,
  },
  locations: { name: line, description: text },
  quests: { title: line, location: line, levelRange: line, description: text, background: text },
  rumors: { title: line, sourceName: line, location: line, content: text },
  chapters: { title: line, summary: text, content: chapter },
  saga: { title: line, content: saga },
};

/** The fields of a campaign or a group document: its name and description. */
export const NAMED_DOCUMENT_TEXT_LIMITS: TextLimitTable = { name: line, description: text };

/**
 * What a field over its limit says, under the field: both numbers.
 *
 * @param length How long the text is
 * @param limit The most it may hold
 */
export function tooLongMessage(length: number, limit: number): string {
  const count = (n: number) => n.toLocaleString('en-US');
  return `Too long: ${count(length)} characters, and this can hold ${count(limit)}.`;
}

/** A field holding more text than its limit allows. */
export interface OverlongField {
  field: string;
  length: number;
  limit: number;
}

/**
 * The first field in `data` holding more text than `limits` allows, or
 * `undefined` when everything fits. Only text is measured: a list, a number,
 * `null` or a field with no limit passes.
 *
 * @param limits The limit of each capped field
 * @param data The fields about to be written
 */
export function overlongField(limits: TextLimitTable, data: Record<string, unknown>): OverlongField | undefined {
  for (const [field, limit] of Object.entries(limits)) {
    const value = data[field];
    if (typeof value === 'string' && value.length > limit) {
      return { field, length: value.length, limit };
    }
  }
  return undefined;
}

/**
 * A note on a person, a place or a rumour, now a document of its own (T133):
 * a person's or place's note is `text`, a rumour's `content`, and its day and
 * author are lines. `firestore.rules.prod` (`noteTextFits`) holds the same.
 */
export const NOTE_TEXT_LIMITS: TextLimitTable = { text, content: text, date: line, author: line };
