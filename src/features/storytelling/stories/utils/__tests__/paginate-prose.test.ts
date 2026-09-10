// src/features/storytelling/stories/utils/__tests__/paginate-prose.test.ts
import { paginateProse, WORDS_PER_PAGE } from '../paginate-prose';

/** N words, no newlines — the shape most stored saga descriptions actually are. */
function words(n: number, word = 'word'): string {
  return Array(n).fill(word).join(' ');
}

describe('paginateProse — the invariant that makes it trustworthy', () => {
  it('reproduces the source exactly when the pages are concatenated', () => {
    // Pages are verbatim slices, never re-joined fragments, so no separator is
    // ever guessed. If this fails, some page is inventing or dropping text.
    const source = [
      'An opening paragraph with several words in it.',
      '',
      '> A quoted line.',
      '> Its attribution.',
      '',
      words(40),
      '',
      '- one',
      '- two',
    ].join('\n');

    const pages = paginateProse(source, 12);

    expect(pages.join('\n\n').replace(/\s+/g, ' ')).toBe(source.replace(/\s+/g, ' '));
  });

  it('never returns an empty page', () => {
    const pages = paginateProse([words(30), '', words(30), '', words(30)].join('\n'), 10);
    pages.forEach((page) => expect(page.trim()).not.toBe(''));
  });
});

describe('paginateProse — empty and short content', () => {
  it('returns no pages for an empty body', () => {
    expect(paginateProse('')).toEqual([]);
  });

  it('returns no pages for whitespace only', () => {
    expect(paginateProse('   \n  \n ')).toEqual([]);
  });

  it('returns one page when the content fits', () => {
    expect(paginateProse('A short saga.')).toEqual(['A short saga.']);
  });
});

describe('paginateProse — the old word budget still applies', () => {
  it('splits 500 words of unbroken prose into two pages', () => {
    // The regression that matters: a single long line with no newlines is what
    // a textarea produces, and it paginated before markdown existed.
    expect(paginateProse(words(500), WORDS_PER_PAGE)).toHaveLength(2);
  });

  it('keeps each page within the budget', () => {
    const pages = paginateProse(words(500), WORDS_PER_PAGE);
    pages.forEach((page) => {
      expect(page.split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(WORDS_PER_PAGE);
    });
  });

  it('turns literal backslash-n escape sequences into real newlines first', () => {
    const source = String.raw`First line\nSecond line`;
    expect(paginateProse(source)[0]).toBe('First line\nSecond line');
  });
});

describe('paginateProse — breaks fall between blocks when they can', () => {
  it('ends a page at a paragraph boundary rather than mid-paragraph', () => {
    const first = 'Alpha beta gamma delta.';
    const second = 'Epsilon zeta eta theta.';
    const pages = paginateProse(`${first}\n\n${second}`, 4);

    expect(pages).toEqual([first, second]);
  });

  it('packs several whole blocks onto one page while the budget allows', () => {
    const pages = paginateProse('One two.\n\nThree four.\n\nFive six.', 6);

    expect(pages).toHaveLength(1);
  });
});

describe('paginateProse — markup is never severed', () => {
  it('does not split a bold phrase across a page boundary', () => {
    // The defect this function exists to prevent: the old paginator sliced on
    // words, so a boundary could land between "**a" and "bold**".
    const source = `${words(8)} **a bold phrase** ${words(8)}`;
    const pages = paginateProse(source, 10);

    pages.forEach((page) => {
      const delimiters = (page.match(/\*\*/g) ?? []).length;
      expect(delimiters % 2).toBe(0);
    });
  });

  it('does not split an emphasis span across a page boundary', () => {
    const source = `${words(8)} *a quiet aside* ${words(8)}`;
    const pages = paginateProse(source, 10);

    pages.forEach((page) => {
      const delimiters = (page.match(/\*/g) ?? []).length;
      expect(delimiters % 2).toBe(0);
    });
  });

  it('does not split inline code across a page boundary', () => {
    const source = `${words(8)} \`a literal\` ${words(8)}`;
    const pages = paginateProse(source, 10);

    pages.forEach((page) => {
      expect((page.match(/`/g) ?? []).length % 2).toBe(0);
    });
  });

  it('keeps a blockquote and its attribution on one page', () => {
    // 4b's pull quote. Splitting it would produce two blockquotes.
    const quote = '> They come from the fruit.\n> - Erky Timbers';
    const pages = paginateProse(`${words(20)}\n\n${quote}\n\n${words(20)}`, 8);

    const quotePages = pages.filter((page) => page.includes('>'));
    expect(quotePages).toHaveLength(1);
    expect(quotePages[0]).toContain('They come from the fruit.');
    expect(quotePages[0]).toContain('Erky Timbers');
  });

  it('keeps a list whole even when it exceeds the budget', () => {
    const list = ['- alpha beta', '- gamma delta', '- epsilon zeta'].join('\n');
    const pages = paginateProse(list, 2);

    expect(pages).toHaveLength(1);
    expect(pages[0]).toBe(list);
  });

  it('keeps a fenced code block whole even when it exceeds the budget', () => {
    const fence = ['```', words(30), '```'].join('\n');
    const pages = paginateProse(fence, 5);

    expect(pages).toHaveLength(1);
    expect((pages[0].match(/```/g) ?? []).length).toBe(2);
  });

  it('keeps a heading with no page of its own from being split', () => {
    const pages = paginateProse('## A heading with several words', 2);

    expect(pages).toHaveLength(1);
  });
});
