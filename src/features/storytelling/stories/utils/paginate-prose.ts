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

/** One word of a prose block, with the inline delimiters it holds. */
interface Word {
  /** Offset into the normalised source, inclusive. */
  start: number;
  /** Offset into the normalised source, exclusive. */
  end: number;
  /** Delimiters that flip a span open or shut: backticks, underscores, `**`, lone `*`. */
  ticks: number;
  unders: number;
  bolds: number;
  stars: number;
}

/**
 * The words of `source` between `start` and `end`, each with its own
 * delimiter counts.
 *
 * A run of words leaves no inline span open when every count is even.
 * Deliberately shallow: it counts delimiters rather than parsing them, which
 * is enough for the only question being asked -- *is this a safe place to
 * stop?* A false negative costs a slightly short page; a false positive costs
 * a visibly broken phrase, so an odd count always answers "not safe".
 * Single-asterisk emphasis is counted after the bold pairs are taken out, so
 * `**bold**` does not read as two unbalanced emphasis marks.
 *
 * A delimiter never spans whitespace, so the counts of a run of words are the
 * sums of its words' counts: that is what lets {@link splitProseBlock} keep
 * running totals instead of rescanning the run.
 */
function wordsIn(source: string, start: number, end: number): Word[] {
  const words: Word[] = [];
  const word = /\S+/g;
  const text = source.slice(start, end);
  let match: RegExpExecArray | null;
  while ((match = word.exec(text)) !== null) {
    const token = match[0];
    const bolds = (token.match(/\*\*/g) ?? []).length;
    words.push({
      start: start + match.index,
      end: start + match.index + token.length,
      ticks: (token.match(/`/g) ?? []).length,
      unders: (token.match(/_/g) ?? []).length,
      bolds,
      stars: (token.match(/\*/g) ?? []).length - 2 * bolds,
    });
  }
  return words;
}

/**
 * Split one oversized prose block into units of at most `budget` words,
 * breaking only at whitespace where no inline span is open.
 *
 * Emits the remainder whole when no legal boundary exists: an over-long page is
 * a cosmetic problem, a severed `**` is a visible defect.
 *
 * One pass over the block's words, keeping running delimiter counts. It used
 * to recount the words of everything left, and of every candidate page, at
 * every space: quadratic in the block's length, ~480 ms for a 50,000-word
 * paragraph (PERF2-002). The cut points are the same; the tests hold the old
 * splitter as a reference.
 */
function splitProseBlock(source: string, block: Block, budget: number): Unit[] {
  const words = wordsIn(source, block.start, block.end);
  const units: Unit[] = [];
  let first = 0;

  while (words.length - first > budget) {
    let ticks = 0;
    let unders = 0;
    let bolds = 0;
    let stars = 0;
    let lastLegal = -1;

    // Never past the budget, so never onto the block's last word: every
    // candidate here is followed by whitespace, as a cut must be.
    for (let index = first; index < first + budget; index += 1) {
      const word = words[index];
      ticks += word.ticks;
      unders += word.unders;
      bolds += word.bolds;
      stars += word.stars;
      if (ticks % 2 === 0 && unders % 2 === 0 && bolds % 2 === 0 && stars % 2 === 0) {
        lastLegal = index;
      }
    }

    if (lastLegal < 0) break; // nothing safe to cut at -- keep it whole

    units.push({
      // The block's own start for its first unit, so leading whitespace on its
      // first line stays on the page and concatenation still round-trips.
      start: first === 0 ? block.start : words[first].start,
      end: words[lastLegal].end,
      words: lastLegal - first + 1,
    });
    first = lastLegal + 1;
  }

  if (first < words.length) {
    units.push({
      start: first === 0 ? block.start : words[first].start,
      end: block.end,
      words: words.length - first,
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
