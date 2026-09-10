// src/features/storytelling/stories/utils/paginate-prose.ts

/**
 * Page-splitting for the saga's book presentation.
 *
 * The saga reads as a book and a chapter reads as a scroll, on purpose (D85,
 * recording what R30 found living only in a commit message). Keeping the page
 * turn meant the paginator had to learn about markup: the old one sliced
 * `content.split(' ')` into 250-word pages, which is fine for plain text and
 * wrong the moment a body can contain markdown, because a boundary can land
 * between `**a` and `bold**` and produce two pages of literal asterisks.
 *
 * A break is therefore only ever taken where it cannot damage markup,
 * preferring the coarsest option available:
 *
 * 1. **Between blocks.** A blank line separates top-level blocks, and a break
 *    there is always safe.
 * 2. **Inside an oversized prose block**, at a whitespace boundary where no
 *    inline span is left open. This is what preserves the old behaviour for
 *    the single long unbroken paragraph that most stored content is.
 * 3. **Never inside a blockquote, list, heading or fence.** One of those takes
 *    its own page whole, even if it runs long: splitting a blockquote across a
 *    page turn yields two quotes, and splitting a fence yields two broken ones.
 *
 * Every page is a **verbatim slice** of the normalised source rather than a
 * set of re-joined fragments, so no separator is ever guessed and no text can
 * be invented or dropped. The test suite asserts that concatenation
 * round-trips, because that is the property that makes the rest trustworthy.
 */

/** Page budget, in words — the value the word-slicing paginator used. */
export const WORDS_PER_PAGE = 250;

/** A stretch of source that a page break may fall between, but never inside. */
interface Unit {
  /** Offset into the normalised source, inclusive. */
  start: number;
  /** Offset into the normalised source, exclusive. */
  end: number;
  words: number;
}

interface Block extends Unit {
  /** `prose` may be split internally; `construct` must survive intact. */
  kind: 'prose' | 'construct';
}

/**
 * Prepare stored content for splitting.
 *
 * Matches `Markdown`'s own normalisation, so an offset here means the same
 * thing the parser will eventually see: some stored bodies carry literal
 * backslash-n escape sequences rather than real newlines, which the
 * `formatContent` this replaces fixed before markdown existed.
 */
function normalise(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * True when `text` leaves no inline span open.
 *
 * Deliberately shallow: it counts delimiters rather than parsing them, which
 * is enough for the only question being asked — *is this a safe place to
 * stop?* A false negative costs a slightly short page; a false positive costs
 * a visibly broken phrase, so an odd count always answers "not safe".
 */
function hasNoOpenInlineSpan(text: string): boolean {
  if ((text.match(/`/g) ?? []).length % 2 !== 0) return false;
  if ((text.match(/_/g) ?? []).length % 2 !== 0) return false;

  if ((text.match(/\*\*/g) ?? []).length % 2 !== 0) return false;

  // Single-asterisk emphasis is counted only after the bold pairs are removed,
  // so `**bold**` does not read as two unbalanced emphasis marks.
  const withoutBold = text.replace(/\*\*/g, '');
  return (withoutBold.match(/\*/g) ?? []).length % 2 === 0;
}

/** A line opening a block construct that a page break must not fall inside. */
function isBlockConstructLine(line: string): boolean {
  return /^\s*(>|[-*+]\s|\d+[.)]\s|#{1,6}\s)/.test(line);
}

function isFenceDelimiter(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

/**
 * Group the source into top-level blocks, recording whether each is plain
 * prose or a construct that has to stay whole.
 */
function toBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  let insideFence = false;
  let offset = 0;

  for (const line of source.split('\n')) {
    const lineStart = offset;
    const lineEnd = offset + line.length;
    offset = lineEnd + 1; // step past the newline

    if (isFenceDelimiter(line)) {
      if (!current) {
        current = { start: lineStart, end: lineEnd, words: 0, kind: 'construct' };
      }
      current.end = lineEnd;
      current.kind = 'construct';
      insideFence = !insideFence;
      if (!insideFence) {
        blocks.push(current);
        current = null;
      }
      continue;
    }

    if (insideFence) {
      if (current) current.end = lineEnd;
      continue;
    }

    if (line.trim() === '') {
      if (current) {
        blocks.push(current);
        current = null;
      }
      continue;
    }

    if (!current) {
      current = {
        start: lineStart,
        end: lineEnd,
        words: 0,
        kind: isBlockConstructLine(line) ? 'construct' : 'prose',
      };
      continue;
    }

    current.end = lineEnd;
    // A construct line anywhere in a run makes the whole run unsplittable: a
    // paragraph with a blockquote continuing off it is one indivisible block.
    if (isBlockConstructLine(line)) current.kind = 'construct';
  }

  if (current) blocks.push(current);

  return blocks.map((block) => ({
    ...block,
    words: countWords(source.slice(block.start, block.end)),
  }));
}

/**
 * Split one oversized prose block into units of at most `budget` words,
 * breaking only at whitespace where no inline span is open.
 *
 * Emits the remainder whole when no legal boundary exists: an over-long page is
 * a cosmetic problem, a severed `**` is a visible defect.
 */
function splitProseBlock(source: string, block: Block, budget: number): Unit[] {
  const units: Unit[] = [];
  let cursor = block.start;

  while (cursor < block.end) {
    const remaining = source.slice(cursor, block.end);
    if (countWords(remaining) <= budget) break;

    let lastLegalEnd = -1;
    const boundary = /\s+/g;
    let match: RegExpExecArray | null;

    while ((match = boundary.exec(remaining)) !== null) {
      const candidate = remaining.slice(0, match.index);
      if (countWords(candidate) > budget) break;
      if (candidate.length > 0 && hasNoOpenInlineSpan(candidate)) {
        lastLegalEnd = match.index;
      }
    }

    if (lastLegalEnd <= 0) break; // nothing safe to cut at — keep it whole

    units.push({
      start: cursor,
      end: cursor + lastLegalEnd,
      words: countWords(remaining.slice(0, lastLegalEnd)),
    });

    // Step over the whitespace that separated the two units, so the next page
    // does not begin with a stray space.
    const rest = remaining.slice(lastLegalEnd);
    cursor += lastLegalEnd + (rest.length - rest.replace(/^\s+/, '').length);
  }

  if (cursor < block.end) {
    units.push({
      start: cursor,
      end: block.end,
      words: countWords(source.slice(cursor, block.end)),
    });
  }

  return units;
}

/**
 * Split `raw` into page sources, breaking between blocks wherever possible and
 * never inside markup.
 *
 * Returns an empty array for empty content, so a caller keeps showing its
 * designed empty state rather than a blank "page 1 of 1".
 */
export function paginateProse(raw: string, wordsPerPage: number = WORDS_PER_PAGE): string[] {
  const source = normalise(raw);
  if (!source) return [];

  const budget = Math.max(1, wordsPerPage);

  const units: Unit[] = toBlocks(source).flatMap((block) =>
    block.kind === 'prose' && block.words > budget
      ? splitProseBlock(source, block, budget)
      : [{ start: block.start, end: block.end, words: block.words }]
  );

  if (units.length === 0) return [source];

  const pages: string[] = [];
  let index = 0;

  while (index < units.length) {
    const start = units[index].start;
    let end = units[index].end;
    let words = units[index].words;
    index += 1;

    // Always take at least one unit — a single over-budget construct still
    // needs a page — then keep adding whole units while the budget allows.
    while (index < units.length && words + units[index].words <= budget) {
      words += units[index].words;
      end = units[index].end;
      index += 1;
    }

    pages.push(source.slice(start, end));
  }

  return pages;
}
