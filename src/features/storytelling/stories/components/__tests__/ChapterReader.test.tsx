// src/features/storytelling/stories/components/__tests__/ChapterReader.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChapterReader from '../ChapterReader';
import { pageScrollPercent } from 'features/storytelling/chapters/utils/reading-position';
import { flushLazy } from '@/test-utils/flush-lazy';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build `n` short, distinct paragraphs joined by real newlines.
 *
 * Single newlines, which is how every chapter written before Phase 9
 * separates its paragraphs. Since D83 those render as line breaks inside one
 * paragraph rather than as separate `<p>` nodes, so a test that cares about
 * paragraph structure uses the blank-line helper below instead.
 */
function makeParagraphs(n: number): string {
  return Array.from({ length: n }, (_, i) => `Paragraph number ${i + 1} of the chapter.`).join('\n');
}

/** The same, separated by blank lines - real CommonMark paragraphs. */
function makeBlankLineParagraphs(n: number): string {
  return Array.from({ length: n }, (_, i) => `Paragraph number ${i + 1} of the chapter.`).join('\n\n');
}

/** The prose block: the element whose place in the window is the reading position. */
function getProse(): HTMLElement {
  return screen.getByTestId('chapter-reader-prose');
}

/** A DOMRect at `top` with the given height; nothing here reads the other sides. */
function rectAt(top: number, height: number): DOMRect {
  return {
    top,
    bottom: top + height,
    height,
    left: 0,
    right: 0,
    width: 0,
    x: 0,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/** Handle on a {@link fakePage}, for moving the window and resizing the prose. */
interface FakePage {
  /** The window's scroll offset, as the reader sees it. */
  readonly scrollY: number;
  /** Move the window as a reader would, and fire the scroll event a browser would. */
  scrollTo: (y: number) => void;
  /** Fire a scroll event without moving: the echo of a programmatic scroll. */
  fireScroll: () => void;
  /** Change the prose's rendered height, as a late-loading renderer would. */
  setProseHeight: (height: number) => void;
}

/**
 * Lay out a page in jsdom, which otherwise reports every rect as zero.
 *
 * The prose starts `proseTop` px down the document and is `proseHeight` tall,
 * in a viewport `viewportHeight` tall. The window starts at the top, and
 * `window.scrollTo` moves it silently — a browser fires the resulting scroll
 * event later, on its own, which is what `fireScroll` stands in for.
 * Undone in `afterEach` by `restoreAllMocks` and `restoreWindow`.
 */
function fakePage({
  proseHeight,
  viewportHeight,
  proseTop = 0,
}: {
  proseHeight: number;
  viewportHeight: number;
  proseTop?: number;
}): FakePage {
  let scrollY = 0;
  let height = proseHeight;

  Object.defineProperty(window, 'innerHeight', { configurable: true, value: viewportHeight });
  Object.defineProperty(window, 'scrollY', { configurable: true, get: () => scrollY });
  window.scrollTo = jest.fn((options?: ScrollToOptions | number) => {
    scrollY = typeof options === 'number' ? options : options?.top ?? scrollY;
  }) as unknown as typeof window.scrollTo;

  jest
    .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
    .mockImplementation(function (this: HTMLElement) {
      return this.dataset.testid === 'chapter-reader-prose'
        ? rectAt(proseTop - scrollY, height)
        : rectAt(0, 0);
    });

  return {
    get scrollY() {
      return scrollY;
    },
    scrollTo: (y: number) => {
      scrollY = y;
      fireEvent.scroll(window);
    },
    fireScroll: () => {
      fireEvent.scroll(window);
    },
    setProseHeight: (h: number) => {
      height = h;
    },
  };
}

const originalWindow = {
  innerHeight: Object.getOwnPropertyDescriptor(window, 'innerHeight'),
  scrollY: Object.getOwnPropertyDescriptor(window, 'scrollY'),
  scrollTo: window.scrollTo,
};

/** Put back what `fakePage` replaced, so no layout leaks into the next test. */
function restoreWindow() {
  for (const key of ['innerHeight', 'scrollY'] as const) {
    const descriptor = originalWindow[key];
    if (descriptor) {
      Object.defineProperty(window, key, descriptor);
    } else {
      delete (window as unknown as Record<string, unknown>)[key];
    }
  }
  window.scrollTo = originalWindow.scrollTo;
}

const baseProps = {
  title: 'Ch1',
  chapterNumber: 1,
  chapterCount: 10,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChapterReader', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    restoreWindow();
  });

  // -------------------------------------------------------------------------
  // Empty content state
  // -------------------------------------------------------------------------
  describe('empty content', () => {
    test('renders the empty state instead of the reading surface', () => {
      render(<ChapterReader content="" {...baseProps} />);
      expect(screen.getByText('No Content Available')).toBeInTheDocument();
      expect(screen.getByText('Select a chapter to begin reading')).toBeInTheDocument();
      expect(screen.queryByTestId('chapter-reader-prose')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Heading: eyebrow, the title once, byline
  // -------------------------------------------------------------------------
  describe('heading', () => {
    test('states the title once, as the page heading', () => {
      // The page around the reader adds no heading of its own, so this is the
      // only statement of the chapter's name.
      render(<ChapterReader content={makeParagraphs(2)} {...baseProps} title="Roast Mutton" />);
      expect(screen.getByRole('heading', { level: 1, name: 'Roast Mutton' })).toBeInTheDocument();
      expect(screen.getAllByText('Roast Mutton')).toHaveLength(1);
    });

    test('names the chapter number and the date it was recorded above the title', () => {
      render(
        <ChapterReader
          content={makeParagraphs(2)}
          {...baseProps}
          chapterNumber={4}
          byline={{ recordedBy: 'Gauthak', recordedOn: '12 March 2025' }}
        />
      );
      expect(screen.getByText('Chapter 4 · 12 March 2025')).toBeInTheDocument();
    });

    test('names the chapter number alone when the date is unknown', () => {
      render(<ChapterReader content={makeParagraphs(2)} {...baseProps} chapterNumber={4} />);
      expect(screen.getByText('Chapter 4')).toBeInTheDocument();
    });

    test('credits who recorded the chapter', () => {
      render(
        <ChapterReader
          content={makeParagraphs(2)}
          {...baseProps}
          byline={{ recordedBy: 'Gauthak', recordedOn: '12 March 2025' }}
        />
      );
      expect(screen.getByText(/Recorded by/)).toHaveTextContent('Recorded by Gauthak');
      expect(screen.queryByText(/edited by/)).not.toBeInTheDocument();
    });

    test('credits the last editor and when, when it has been edited', () => {
      render(
        <ChapterReader
          content={makeParagraphs(2)}
          {...baseProps}
          byline={{
            recordedBy: 'Gauthak',
            recordedOn: '12 March 2025',
            editedBy: 'Eowyn',
            editedOn: '2 Oct 2026',
          }}
        />
      );
      expect(screen.getByText(/edited by/)).toHaveTextContent('edited by Eowyn, 2 Oct 2026');
    });
  });

  // -------------------------------------------------------------------------
  // Content rendering
  // -------------------------------------------------------------------------
  describe('content rendering', () => {
    test('renders the title and each paragraph of the content', async () => {
      // Async because the parser is behind a dynamic import (D82): the first
      // mount in this file suspends for a microtask. `findByText` is the wrong
      // tool — see `flushLazy`.
      render(<ChapterReader content={makeBlankLineParagraphs(3)} {...baseProps} />);
      await flushLazy();
      expect(screen.getByText('Ch1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph number 1 of the chapter.')).toBeInTheDocument();
      expect(screen.getByText('Paragraph number 2 of the chapter.')).toBeInTheDocument();
      expect(screen.getByText('Paragraph number 3 of the chapter.')).toBeInTheDocument();
    });

    test('renders single-newline prose as one paragraph of line-broken text', async () => {
      // D83, and the shape of every chapter written before Phase 9. The lines
      // must all still be readable and still be visually separated - by <br>
      // now rather than by a paragraph margin.
      render(<ChapterReader content={makeParagraphs(3)} {...baseProps} />);
      await flushLazy();
      const prose = getProse();

      expect(prose.querySelectorAll('p')).toHaveLength(1);
      expect(prose.querySelectorAll('br')).toHaveLength(2);
      expect(prose.textContent).toContain('Paragraph number 1 of the chapter.');
      expect(prose.textContent).toContain('Paragraph number 3 of the chapter.');
    });

    test('renders the marks the reading design needs', async () => {
      // The point of the phase: 4b's pull quote and its emphasis have to be
      // expressible in a chapter body.
      const content = [
        'Plain opening.',
        '',
        '> They come from the fruit.',
        '> - Erky Timbers',
        '',
        'A **bold** and *quiet* close.',
      ].join('\n');
      render(<ChapterReader content={content} {...baseProps} />);
      await flushLazy();
      const prose = getProse();

      expect(prose.querySelectorAll('blockquote')).toHaveLength(1);
      expect(prose.querySelector('blockquote')?.textContent).toContain('Erky Timbers');
      expect(prose.querySelector('strong')).toHaveTextContent('bold');
      expect(prose.querySelector('em')).toHaveTextContent('quiet');
    });

    test('does not let raw HTML in a chapter body reach the DOM', async () => {
      const content = ['A chapter.', '', '<script>window.pwned = true;</script>'].join('\n');
      render(<ChapterReader content={content} {...baseProps} />);
      await flushLazy();

      expect(getProse().querySelector('script')).toBeNull();
      expect((window as unknown as Record<string, unknown>).pwned).toBeUndefined();
    });

    test('blank lines do not produce empty paragraphs', () => {
      const content = 'First paragraph.\n\n\nSecond paragraph.';
      render(<ChapterReader content={content} {...baseProps} />);
      const paragraphEls = getProse().querySelectorAll('p');
      expect(paragraphEls).toHaveLength(2);
      expect(paragraphEls[0].textContent).toBe('First paragraph.');
      expect(paragraphEls[1].textContent).toBe('Second paragraph.');
    });

    test('converts literal \\n escape sequences into real breaks', async () => {
      // Use String.raw so the prop value contains the literal two characters
      // "\" and "n", not a real newline. Stored content really does
      // contain these, and the behaviour survives the move to a parser. Since
      // D83 the break is a <br> inside one paragraph, not a paragraph split.
      const rawContent = String.raw`First paragraph\nSecond paragraph`;
      render(<ChapterReader content={rawContent} {...baseProps} />);
      await flushLazy();
      const prose = getProse();

      // String.raw so this is the literal two characters, which is what must
      // be gone; a real newline in the text is expected and harmless.
      expect(prose.textContent).not.toContain(String.raw`\n`);
      expect(prose.textContent).toContain('First paragraph');
      expect(prose.textContent).toContain('Second paragraph');
      expect(prose.querySelectorAll('br')).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Footer: position stated exactly once, buttons name where they go
  // -------------------------------------------------------------------------
  describe('footer', () => {
    test('states the chapter position exactly once', () => {
      render(<ChapterReader content={makeParagraphs(2)} title="Ch3" chapterNumber={3} chapterCount={39} />);
      expect(screen.getAllByText('Chapter 3 of 39')).toHaveLength(1);
    });

    test('does not render a page counter or progress bar', () => {
      render(<ChapterReader content={makeParagraphs(2)} {...baseProps} />);
      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
      expect(document.querySelector('.progress-bar')).not.toBeInTheDocument();
    });

    test('Next button names the next chapter title when provided', () => {
      render(
        <ChapterReader
          content={makeParagraphs(2)}
          {...baseProps}
          nextChapterTitle="The Shadow of the Past"
          hasNextChapter
        />
      );
      expect(screen.getByRole('button', { name: 'Next: The Shadow of the Past' })).toBeInTheDocument();
    });

    test('Next button falls back to plain "Next" when no title is given', () => {
      render(<ChapterReader content={makeParagraphs(2)} {...baseProps} hasNextChapter />);
      expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument();
    });

    test('Previous button names the previous chapter title when provided', () => {
      render(
        <ChapterReader
          content={makeParagraphs(2)}
          {...baseProps}
          previousChapterTitle="The Kobold Court"
          hasPreviousChapter
        />
      );
      expect(screen.getByRole('button', { name: 'Previous: The Kobold Court' })).toBeInTheDocument();
    });

    // A neighbour that doesn't exist leaves its place empty rather than
    // showing a button that does nothing.
    test('Previous is absent when there is no previous chapter, present and wired otherwise', () => {
      const onPreviousChapter = jest.fn();
      const { rerender } = render(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasPreviousChapter={false} onPreviousChapter={onPreviousChapter} />
      );
      expect(screen.queryByRole('button', { name: 'Previous' })).not.toBeInTheDocument();

      rerender(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasPreviousChapter onPreviousChapter={onPreviousChapter} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
      expect(onPreviousChapter).toHaveBeenCalledTimes(1);
    });

    test('Next is absent when there is no next chapter, present and wired otherwise', () => {
      const onNextChapter = jest.fn();
      const { rerender } = render(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasNextChapter={false} onNextChapter={onNextChapter} />
      );
      expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument();

      rerender(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasNextChapter onNextChapter={onNextChapter} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      expect(onNextChapter).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Edit affordance
  // -------------------------------------------------------------------------
  describe('edit affordance', () => {
    test('renders no Edit control when onEdit is absent', () => {
      render(<ChapterReader content={makeParagraphs(2)} {...baseProps} />);
      expect(screen.queryByRole('button', { name: /Edit/i })).not.toBeInTheDocument();
    });

    test('renders Edit and calls the handler when clicked, when onEdit is provided', () => {
      const onEdit = jest.fn();
      render(<ChapterReader content={makeParagraphs(2)} {...baseProps} onEdit={onEdit} />);
      fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Progress reporting: the emission contract (#851 / #852 regression guards)
  //
  // The page scrolls, not a box, so these drive the window and lay the prose
  // out with `fakePage`. The figures are the ones the box-based tests used:
  // a prose block 2000px tall in a 500px viewport has the same 1500px range a
  // 2000px box showing 500px had.
  // -------------------------------------------------------------------------
  describe('progress reporting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('content shorter than the viewport completes without any scroll event', () => {
      // No layout: jsdom reports the prose as 0px tall, which reads exactly as
      // "fits without scrolling" -- both report 100. This is the real
      // short-chapter case, per reading-position.ts's own doc comment.
      const onProgressChange = jest.fn();
      render(<ChapterReader content="Just one short paragraph." {...baseProps} onProgressChange={onProgressChange} />);
      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange).toHaveBeenCalledWith(100, true);
    });

    test('an ordinary scroll emits onProgressChange with exactly one argument', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);
      expect(onProgressChange).not.toHaveBeenCalled();

      page.scrollTo(200);

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange.mock.calls[0]).toHaveLength(1);
      expect(onProgressChange.mock.calls[0][1]).toBeUndefined();
      expect(onProgressChange).toHaveBeenCalledWith(pageScrollPercent(-200, 2000, 500));
    });

    test('progress counts from the top of the prose, not from the top of the page', () => {
      // The title and byline sit above the prose: scrolling them away is not
      // reading any of the chapter.
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500, proseTop: 300 });
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);

      page.scrollTo(250);
      expect(onProgressChange).toHaveBeenLastCalledWith(0);
    });

    test('reaching the bottom emits (percent, true) exactly once, and scrolling again does not re-emit true', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);

      page.scrollTo(1500);
      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange).toHaveBeenCalledWith(100, true);

      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      page.scrollTo(1500); // still at the bottom

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange.mock.calls[0]).toHaveLength(1);
      expect(onProgressChange.mock.calls[0][1]).toBeUndefined();
    });

    test('scrolling on past the prose into the footer still counts as the end', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);

      page.scrollTo(1800);
      expect(onProgressChange).toHaveBeenCalledWith(100, true);
    });

    test('throttles rapid scrolling to far fewer emissions than scroll events', () => {
      const page = fakePage({ proseHeight: 5000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);

      for (let i = 1; i <= 10; i++) {
        page.scrollTo(i * 50); // stays well below the completion threshold
      }

      // The first of the ten fires immediately (leading edge); the rest
      // collapse into a single trailing emission once the window elapses.
      expect(onProgressChange).toHaveBeenCalledTimes(1);

      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(onProgressChange).toHaveBeenCalledTimes(2);
      expect(onProgressChange.mock.calls.length).toBeLessThan(10);
    });

    test('flushes a final emission on unmount', () => {
      const page = fakePage({ proseHeight: 5000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      const { unmount } = render(
        <ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />
      );

      page.scrollTo(100); // leading-edge emit
      expect(onProgressChange).toHaveBeenCalledTimes(1);

      page.scrollTo(300); // schedules a trailing emission that has not fired yet
      expect(onProgressChange).toHaveBeenCalledTimes(1);

      unmount();

      expect(onProgressChange).toHaveBeenCalledTimes(2);
      const finalCall = onProgressChange.mock.calls[1];
      expect(finalCall).toHaveLength(1);
      expect(finalCall[0]).toBe(pageScrollPercent(-300, 5000, 500));
    });

    // Regression guard. The cleanup that flushes the last position used to
    // call whichever handler was current — and on a chapter change that is
    // already the NEXT chapter's, so the old chapter's last position was
    // written into the new chapter's progress.
    test('on a chapter change, the old chapter\'s last position goes to the old chapter\'s handler', () => {
      const page = fakePage({ proseHeight: 5000, viewportHeight: 500 });
      const reportOld = jest.fn();
      const reportNew = jest.fn();
      const { rerender } = render(
        <ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={reportOld} />
      );

      page.scrollTo(100); // leading-edge emit
      page.scrollTo(300); // pending trailing emission
      expect(reportOld).toHaveBeenCalledTimes(1);

      rerender(<ChapterReader content={makeParagraphs(6)} {...baseProps} onProgressChange={reportNew} />);

      expect(reportOld).toHaveBeenCalledTimes(2);
      expect(reportOld).toHaveBeenLastCalledWith(pageScrollPercent(-300, 5000, 500));
      expect(reportNew).not.toHaveBeenCalledWith(pageScrollPercent(-300, 5000, 500));
    });

    // T098: identity is the chapter, not its text. Two chapters with the same
    // body (a copied chapter, two one-line ones) used to share one effect
    // lifetime, so the second inherited the first's state.
    test('a second short chapter with the same text reports its own completion', () => {
      fakePage({ proseHeight: 300, viewportHeight: 500 });
      const reportFirst = jest.fn();
      const reportSecond = jest.fn();
      const { rerender } = render(
        <ChapterReader chapterId="ch-1" content={makeParagraphs(2)} {...baseProps} onProgressChange={reportFirst} />
      );
      expect(reportFirst).toHaveBeenCalledWith(100, true);

      rerender(
        <ChapterReader chapterId="ch-2" content={makeParagraphs(2)} {...baseProps} onProgressChange={reportSecond} />
      );

      expect(reportSecond).toHaveBeenCalledWith(100, true);
    });

    test('a second long chapter with the same text restores its own position', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500, proseTop: 300 });
      const { rerender } = render(
        <ChapterReader chapterId="ch-1" content={makeParagraphs(5)} {...baseProps} position={0} />
      );
      expect(page.scrollY).toBe(0);

      rerender(
        <ChapterReader chapterId="ch-2" content={makeParagraphs(5)} {...baseProps} position={40} />
      );

      // 40% of a 1500px range, below a prose block that starts 300px down.
      expect(page.scrollY).toBe(900);
    });

    test("on a change to a same-text chapter, the old chapter's last position goes to the old chapter's handler", () => {
      const page = fakePage({ proseHeight: 5000, viewportHeight: 500 });
      const reportOld = jest.fn();
      const reportNew = jest.fn();
      const { rerender } = render(
        <ChapterReader chapterId="ch-1" content={makeParagraphs(5)} {...baseProps} onProgressChange={reportOld} />
      );

      page.scrollTo(100); // leading-edge emit
      page.scrollTo(300); // pending trailing emission

      rerender(
        <ChapterReader chapterId="ch-2" content={makeParagraphs(5)} {...baseProps} onProgressChange={reportNew} />
      );

      expect(reportOld).toHaveBeenLastCalledWith(pageScrollPercent(-300, 5000, 500));
      expect(reportNew).not.toHaveBeenCalledWith(pageScrollPercent(-300, 5000, 500));
    });

    test('restores a saved position by scrolling the window', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500, proseTop: 300 });
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} position={40} />);

      // 40% of a 1500px range, below a prose block that starts 300px down.
      expect(page.scrollY).toBe(900);
    });

    test('opens a new chapter at the top, wherever the last one was left', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500, proseTop: 300 });
      const { rerender } = render(<ChapterReader content={makeParagraphs(5)} {...baseProps} position={0} />);
      page.scrollTo(1800); // at the foot of chapter one, about to press Next

      rerender(<ChapterReader content={makeParagraphs(6)} {...baseProps} position={0} />);

      expect(page.scrollY).toBe(0);
    });

    test('restoring from a saved position does not emit progress', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      render(
        <ChapterReader
          content={makeParagraphs(5)}
          {...baseProps}
          position={40}
          onProgressChange={onProgressChange}
        />
      );

      // The restore moved the window (40% of a 1500px range = 600px), so the
      // suppression is armed and the browser would now fire a scroll event.
      expect(page.scrollY).toBe(600);

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Stand in for the scroll event the browser fires as a side effect of
      // that programmatic restore -- jsdom does not fire one itself.
      page.fireScroll();
      expect(onProgressChange).not.toHaveBeenCalled();

      // A genuine subsequent scroll behaves normally -- the suppression is
      // consumed exactly once.
      page.scrollTo(900);
      expect(onProgressChange).toHaveBeenCalledTimes(1);
    });

    // Reopening a chapter already finished should cost nothing. The mount
    // check still sees 100% (the restore puts the reader back at the end), but
    // re-asserting completion the reader already has would be a wasted write
    // on every single reopen.
    test('reopening an already-completed chapter emits nothing', () => {
      const onProgressChange = jest.fn();
      render(
        <ChapterReader
          content={makeParagraphs(5)}
          {...baseProps}
          position={100}
          onProgressChange={onProgressChange}
        />
      );

      expect(onProgressChange).not.toHaveBeenCalled();
    });

    // Regression guard. Restoring arms a one-shot suppression so the scroll
    // event caused by the programmatic restore is not written straight back.
    // But scrolling to where the page already is fires no event, so an
    // unconditionally-armed flag was never consumed and swallowed the reader's
    // first genuine scroll instead. An unread chapter restores to the top and
    // is usually already there, so this hit every chapter a reader opened:
    // scroll once, navigate away, and nothing was persisted. Found in the
    // browser — jsdom fires no scroll event for a programmatic scroll, so the
    // suppression could only ever be exercised here by dispatching one by hand.
    test('a chapter restored to a position it is already at still reports the first scroll', () => {
      const page = fakePage({ proseHeight: 2000, viewportHeight: 500 });
      const onProgressChange = jest.fn();
      render(
        <ChapterReader
          content={makeParagraphs(5)}
          {...baseProps}
          position={0}
          onProgressChange={onProgressChange}
        />
      );

      page.scrollTo(200);

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange.mock.calls[0]).toHaveLength(1);
      expect(onProgressChange).toHaveBeenCalledWith(pageScrollPercent(-200, 2000, 500));
    });

    // The distinction the guard above turns on: an unread short chapter also
    // reports 100% on mount, but has no stored completion to preserve, so it
    // must still be reported.
    test('a short chapter with no stored position still reports completion', () => {
      const onProgressChange = jest.fn();
      render(
        <ChapterReader
          content="Just one short paragraph."
          {...baseProps}
          position={0}
          onProgressChange={onProgressChange}
        />
      );

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange).toHaveBeenCalledWith(100, true);
    });

    // Regression guard, found in the browser. The prose renders through a
    // lazily loaded parser, so on a cold page load it is still empty when the
    // reader mounts. Measured then, an empty block "fits on screen": the
    // chapter was marked read and restored to the top before a word of it
    // was shown. The reader now waits for the prose to take up space.
    describe('while the prose has not rendered yet', () => {
      let observed: Array<{ callback: ResizeObserverCallback; disconnected: boolean }>;
      const originalResizeObserver = (window as { ResizeObserver?: unknown }).ResizeObserver;

      beforeEach(() => {
        observed = [];
        (window as { ResizeObserver?: unknown }).ResizeObserver = class {
          private entry: { callback: ResizeObserverCallback; disconnected: boolean };
          constructor(callback: ResizeObserverCallback) {
            this.entry = { callback, disconnected: false };
            observed.push(this.entry);
          }
          observe() {}
          unobserve() {}
          disconnect() {
            this.entry.disconnected = true;
          }
        };
      });

      afterEach(() => {
        (window as { ResizeObserver?: unknown }).ResizeObserver = originalResizeObserver;
      });

      /** Deliver a resize notification, as the browser does after layout. */
      function notifyResize() {
        act(() => {
          observed
            .filter((o) => !o.disconnected)
            .forEach((o) => o.callback([], {} as ResizeObserver));
        });
      }

      test('neither marks the chapter read nor restores until the prose has height', () => {
        const page = fakePage({ proseHeight: 0, viewportHeight: 500 });
        const onProgressChange = jest.fn();
        render(
          <ChapterReader
            content={makeParagraphs(5)}
            {...baseProps}
            position={40}
            onProgressChange={onProgressChange}
          />
        );

        expect(onProgressChange).not.toHaveBeenCalled();
        expect(page.scrollY).toBe(0);

        page.setProseHeight(2000);
        notifyResize();

        expect(page.scrollY).toBe(600);
        expect(onProgressChange).not.toHaveBeenCalled();
      });

      test('ignores scrolling before the prose has rendered', () => {
        const page = fakePage({ proseHeight: 0, viewportHeight: 500 });
        const onProgressChange = jest.fn();
        render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);

        page.scrollTo(100);

        expect(onProgressChange).not.toHaveBeenCalled();
      });

      test('a short chapter is still reported read once it has rendered', () => {
        const page = fakePage({ proseHeight: 0, viewportHeight: 500 });
        const onProgressChange = jest.fn();
        render(<ChapterReader content="Just one short paragraph." {...baseProps} onProgressChange={onProgressChange} />);

        page.setProseHeight(200);
        notifyResize();

        expect(onProgressChange).toHaveBeenCalledTimes(1);
        expect(onProgressChange).toHaveBeenCalledWith(100, true);
      });
    });
  });
});
