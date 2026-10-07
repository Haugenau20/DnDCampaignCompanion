// src/core/services/firebase/data/TextTooLongError.ts
import { overlongField, type TextLimitTable } from '../../../constants/textLimits';

/**
 * Thrown by `DocumentService` before a write that puts more text in a campaign
 * record's field than the production rules accept (T119, F4).
 *
 * The forms stop typing at the limit, so this is the backstop for text that
 * arrived some other way: a record stored before the limits, a name the AI
 * extraction proposed, a place promoted from a long feature. Its message is
 * written for the player, since it is what an editor shows when a save fails.
 */
export class TextTooLongError extends Error {
  /** The field that is too long, as stored (`levelRange`). */
  readonly field: string;

  /** How long it is, in `String.length` units. */
  readonly length: number;

  /** The most it may hold. */
  readonly limit: number;

  /**
   * @param field - The field as stored
   * @param length - Its length
   * @param limit - The most it may hold
   */
  constructor(field: string, length: number, limit: number) {
    const count = (n: number) => n.toLocaleString('en-US');
    super(
      `The ${fieldWords(field)} is too long to save: ${count(length)} characters, ` +
      `and it can hold ${count(limit)}.`
    );
    this.name = 'TextTooLongError';
    this.field = field;
    this.length = length;
    this.limit = limit;
    // Keeps `instanceof` working when compiled to an ES5 target.
    Object.setPrototypeOf(this, TextTooLongError.prototype);
  }
}

/**
 * Throws for the first field in `data` holding more text than `limits`
 * allows; does nothing when everything fits.
 *
 * @param limits The limit of each capped field
 * @param data The fields about to be written
 * @throws {TextTooLongError} naming the field, its length and its limit
 */
export function assertTextFits(limits: TextLimitTable, data: Record<string, unknown>): void {
  const overlong = overlongField(limits, data);
  if (overlong) {
    throw new TextTooLongError(overlong.field, overlong.length, overlong.limit);
  }
}

/** A stored field name in words: `levelRange` is "level range". */
const fieldWords = (field: string): string => field.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
