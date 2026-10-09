// src/features/storytelling/chapters/utils/chapter-order.ts
import { recordTimes } from 'core/attribution';
import type { Chapter } from '../types';

/**
 * Reading order: by `order`, then the chapter written first (by the server's
 * time where it has one, else its old string; T132), then the id
 * (T088, DATA-007).
 *
 * Two chapters can share an `order`: every structural change decides from the
 * list this client holds, so two people inserting at once both write the same
 * one, and a transaction cannot read "every chapter" to stop it. Rather than
 * serialise every change through a shared document, a shared order is made
 * harmless. The tiebreak is fixed, so every reader sees the same sequence,
 * and the next structural change renumbers the lot.
 */
const compareChapters = (a: Chapter, b: Chapter): number =>
  a.order - b.order ||
  (recordTimes(a).created?.getTime() ?? 0) - (recordTimes(b).created?.getTime() ?? 0) ||
  a.id.localeCompare(b.id);

/**
 * The chapters in reading order, as stored. The list given is left alone.
 *
 * @param chapters The chapters, in any order
 * @returns A new list in reading order
 */
export const inReadingOrder = (chapters: Chapter[]): Chapter[] =>
  [...chapters].sort(compareChapters);

/**
 * The chapters in reading order, each numbered by its place (1, 2, 3, ...)
 * rather than by the `order` it stores, so a shared order or a gap never
 * shows. A chapter already in its place is handed back as the same object.
 *
 * @param chapters The chapters, in any order
 * @returns A new list in reading order, numbered by place
 */
export const numberedInReadingOrder = (chapters: Chapter[]): Chapter[] =>
  inReadingOrder(chapters).map((chapter, index) =>
    chapter.order === index + 1 ? chapter : { ...chapter, order: index + 1 }
  );
