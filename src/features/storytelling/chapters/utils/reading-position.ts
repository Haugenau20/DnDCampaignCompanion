// src/features/storytelling/chapters/utils/reading-position.ts

/**
 * Scroll-position maths for the chapter reader.
 *
 * `storyProgress.lastPosition` used to be a 1-based page number, back when
 * chapters were paginated at 250 words a page. The reader now scrolls, so the
 * field carries a **scroll percentage, 0–100** instead. There is no migration:
 * legacy page numbers are simply read as percentages and clamped (see
 * `chapter-progress.ts`), which is harmless because a stale value only ever
 * costs the reader one scroll to correct — and, in practice, almost no such
 * values exist, since progress writes were silently failing until 2026-08-29.
 *
 * This lives apart from the component so the arithmetic can be tested without
 * a layout engine. jsdom reports `scrollHeight` and `clientHeight` as 0, so a
 * component test can only exercise these paths by stubbing those properties;
 * the maths itself is verified here instead.
 */

/**
 * Scroll percentage at or above which a chapter counts as read.
 *
 * Not 100: the last line of a chapter is readable well before the scroll
 * container bottoms out, sub-pixel rounding and trailing padding routinely
 * leave a few pixels unreachable, and requiring an exact bottom would leave
 * readers unable to complete a chapter they had demonstrably finished.
 */
export const COMPLETION_THRESHOLD = 98;

/**
 * Convert a scroll offset into a 0–100 percentage of the way through the
 * scrollable range.
 *
 * When the content fits without scrolling (`scrollHeight <= clientHeight`)
 * there is no range to be part-way through, and the reader can see the whole
 * chapter at once — so that is 100, not 0. Returning 0 there would make a
 * short chapter impossible to finish.
 */
export function scrollPercent(
  scrollTop: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const scrollableRange = scrollHeight - clientHeight;
  if (!Number.isFinite(scrollableRange) || scrollableRange <= 0) return 100;

  const ratio = scrollTop / scrollableRange;
  return clampPercent(Math.round(ratio * 100));
}

/**
 * Convert a stored percentage back into a scroll offset, for restoring a
 * reader to where they left off. The inverse of `scrollPercent`, except that
 * unscrollable content restores to 0 — there is nowhere else to put it.
 */
export function positionToScrollTop(
  percent: number,
  scrollHeight: number,
  clientHeight: number
): number {
  const scrollableRange = scrollHeight - clientHeight;
  if (!Number.isFinite(scrollableRange) || scrollableRange <= 0) return 0;

  return Math.round((clampPercent(percent) / 100) * scrollableRange);
}

/**
 * The reading percentage for prose that scrolls with the page rather than
 * inside a box of its own.
 *
 * The prose block stands in for the old scroll container: 0 while its top
 * edge is at or below the top of the viewport, 100 once its bottom edge has
 * come up to the bottom of the viewport. Whatever sits above the prose (the
 * title) or below it (the chapter footer, the site footer) counts for nothing,
 * so finishing the text finishes the chapter.
 *
 * @param proseTop - the prose's top edge relative to the viewport, i.e.
 *   `getBoundingClientRect().top`; negative once it has scrolled past
 * @param proseHeight - the prose block's rendered height
 * @param viewportHeight - `window.innerHeight`
 */
export function pageScrollPercent(
  proseTop: number,
  proseHeight: number,
  viewportHeight: number
): number {
  return scrollPercent(-proseTop, proseHeight, viewportHeight);
}

/**
 * The window scroll offset that puts a reader back at a stored percentage —
 * the inverse of `pageScrollPercent`.
 *
 * A position that resolves to the very start of the prose restores to the top
 * of the page instead, so an unread chapter opens on its title rather than
 * scrolled past it.
 *
 * @param proseDocumentTop - the prose's top edge relative to the document,
 *   i.e. `getBoundingClientRect().top + window.scrollY`
 */
export function percentToPageScrollY(
  percent: number,
  proseDocumentTop: number,
  proseHeight: number,
  viewportHeight: number
): number {
  const offset = positionToScrollTop(percent, proseHeight, viewportHeight);
  return offset > 0 ? Math.round(proseDocumentTop + offset) : 0;
}

/** Whether a percentage counts as having finished the chapter. */
export function isAtCompletion(percent: number): boolean {
  return clampPercent(percent) >= COMPLETION_THRESHOLD;
}

/**
 * Clamp into 0–100, mapping a non-numeric value to 0.
 *
 * Exported because both the reader and anything restoring a stored position
 * need the same treatment of values that predate this format.
 */
export function clampPercent(percent: number): number {
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, percent));
}
