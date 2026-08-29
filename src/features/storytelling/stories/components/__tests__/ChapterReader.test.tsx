// src/features/storytelling/stories/components/__tests__/ChapterReader.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ChapterReader from '../ChapterReader';
import { scrollPercent } from 'features/storytelling/chapters/utils/reading-position';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build `n` short, distinct paragraphs joined by real newlines. */
function makeParagraphs(n: number): string {
  return Array.from({ length: n }, (_, i) => `Paragraph number ${i + 1} of the chapter.`).join('\n');
}

/**
 * Stub the three layout properties `scrollPercent` needs, as own properties
 * on the element so they shadow jsdom's always-zero defaults. `scrollTop` is
 * left writable so a test can move it again with a plain assignment.
 */
function stubScrollMetrics(
  el: HTMLElement,
  { scrollTop = 0, scrollHeight, clientHeight }: { scrollTop?: number; scrollHeight: number; clientHeight: number }
) {
  Object.defineProperty(el, 'scrollTop', { value: scrollTop, writable: true, configurable: true });
  Object.defineProperty(el, 'scrollHeight', { value: scrollHeight, configurable: true });
  Object.defineProperty(el, 'clientHeight', { value: clientHeight, configurable: true });
}

function getScrollContainer(): HTMLElement {
  return screen.getByTestId('chapter-reader-scroll');
}

/**
 * Temporarily give every element a non-trivial scrollHeight/clientHeight via
 * the prototype, so a component's mount-time layout effect does not see
 * jsdom's usual all-zero ("fits without scrolling", i.e. already complete)
 * defaults. Needed only for tests where the mount's own completion check
 * would otherwise pre-empt the scroll behaviour under test. Returns a
 * restore function; `stubScrollMetrics` on a specific element still takes
 * precedence over this, since it defines an own property that shadows the
 * prototype.
 */
function stubNonCompletingMountDefaults(scrollHeight: number, clientHeight: number): () => void {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');
  const originalClientHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'clientHeight');
  Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: scrollHeight });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: clientHeight });
  return () => {
    // jsdom defines these on Element.prototype, not HTMLElement.prototype, so
    // there is normally no own descriptor here to put back. Guarding the
    // restore on `if (original)` therefore restored NOTHING, and the stub
    // leaked into every later test in the file — which then ran against a
    // silent global 2000/500 layout instead of jsdom's zeros. Deleting the own
    // property is what actually hands lookup back to Element.prototype.
    if (originalScrollHeight) {
      Object.defineProperty(HTMLElement.prototype, 'scrollHeight', originalScrollHeight);
    } else {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
    }

    if (originalClientHeight) {
      Object.defineProperty(HTMLElement.prototype, 'clientHeight', originalClientHeight);
    } else {
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
    }
  };
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
  // -------------------------------------------------------------------------
  // Empty content state
  // -------------------------------------------------------------------------
  describe('empty content', () => {
    test('renders the empty state instead of the reading surface', () => {
      render(<ChapterReader content="" {...baseProps} />);
      expect(screen.getByText('No Content Available')).toBeInTheDocument();
      expect(screen.getByText('Select a chapter to begin reading')).toBeInTheDocument();
      expect(screen.queryByTestId('chapter-reader-scroll')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Content rendering
  // -------------------------------------------------------------------------
  describe('content rendering', () => {
    test('renders the title and each paragraph of the content', () => {
      render(<ChapterReader content={makeParagraphs(3)} {...baseProps} />);
      expect(screen.getByText('Ch1')).toBeInTheDocument();
      expect(screen.getByText('Paragraph number 1 of the chapter.')).toBeInTheDocument();
      expect(screen.getByText('Paragraph number 2 of the chapter.')).toBeInTheDocument();
      expect(screen.getByText('Paragraph number 3 of the chapter.')).toBeInTheDocument();
    });

    test('blank lines do not produce empty paragraphs', () => {
      const content = 'First paragraph.\n\n\nSecond paragraph.';
      render(<ChapterReader content={content} {...baseProps} />);
      const container = getScrollContainer();
      const paragraphEls = container.querySelectorAll('p');
      expect(paragraphEls).toHaveLength(2);
      expect(paragraphEls[0].textContent).toBe('First paragraph.');
      expect(paragraphEls[1].textContent).toBe('Second paragraph.');
    });

    test('converts literal \\n escape sequences into separate paragraphs', () => {
      // Use String.raw so the prop value contains the literal two characters
      // "\" and "n", not a real newline.
      const rawContent = String.raw`First paragraph\nSecond paragraph`;
      render(<ChapterReader content={rawContent} {...baseProps} />);
      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Footer: position stated exactly once, Next names the next chapter
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

    test('Previous is disabled when hasPreviousChapter is false, enabled and wired otherwise', () => {
      const onPreviousChapter = jest.fn();
      const { rerender } = render(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasPreviousChapter={false} onPreviousChapter={onPreviousChapter} />
      );
      expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

      rerender(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasPreviousChapter onPreviousChapter={onPreviousChapter} />
      );
      const prevBtn = screen.getByRole('button', { name: 'Previous' });
      expect(prevBtn).not.toBeDisabled();
      fireEvent.click(prevBtn);
      expect(onPreviousChapter).toHaveBeenCalledTimes(1);
    });

    test('Next is disabled when hasNextChapter is false, enabled and wired otherwise', () => {
      const onNextChapter = jest.fn();
      const { rerender } = render(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasNextChapter={false} onNextChapter={onNextChapter} />
      );
      expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

      rerender(
        <ChapterReader content={makeParagraphs(2)} {...baseProps} hasNextChapter onNextChapter={onNextChapter} />
      );
      const nextBtn = screen.getByRole('button', { name: 'Next' });
      expect(nextBtn).not.toBeDisabled();
      fireEvent.click(nextBtn);
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
      const editBtn = screen.getByRole('button', { name: /Edit/i });
      fireEvent.click(editBtn);
      expect(onEdit).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Progress reporting: the emission contract (#851 / #852 regression guards)
  // -------------------------------------------------------------------------
  describe('progress reporting', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('content shorter than the viewport completes without any scroll event', () => {
      // No stubbing: jsdom reports scrollHeight/clientHeight as 0 for every
      // element, which scrollPercent treats identically to "fits without
      // scrolling" -- both report 100. This is the real short-chapter case,
      // not a test artifact, per reading-position.ts's own doc comment.
      const onProgressChange = jest.fn();
      render(<ChapterReader content="Just one short paragraph." {...baseProps} onProgressChange={onProgressChange} />);
      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange).toHaveBeenCalledWith(100, true);
    });

    test('an ordinary scroll emits onProgressChange with exactly one argument', () => {
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);
      const el = getScrollContainer();

      // Discard the mount-time call: jsdom's unstubbed zero layout reports
      // this chapter as instantly complete (see the test above). Clearing it
      // isolates the scroll behaviour this test actually targets.
      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      stubScrollMetrics(el, { scrollTop: 200, scrollHeight: 2000, clientHeight: 500 });
      fireEvent.scroll(el);

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange.mock.calls[0]).toHaveLength(1);
      expect(onProgressChange.mock.calls[0][1]).toBeUndefined();
      expect(onProgressChange).toHaveBeenCalledWith(scrollPercent(200, 2000, 500));
    });

    test('reaching the bottom emits (percent, true) exactly once, and scrolling again does not re-emit true', () => {
      // Without this, jsdom's default all-zero layout would mark the chapter
      // complete at mount, before the scroll under test ever happens.
      const restoreMountDefaults = stubNonCompletingMountDefaults(2000, 500);

      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);
      const el = getScrollContainer();

      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      stubScrollMetrics(el, { scrollTop: 1500, scrollHeight: 2000, clientHeight: 500 });
      fireEvent.scroll(el);
      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange).toHaveBeenCalledWith(100, true);

      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });
      el.scrollTop = 1500; // still at the bottom
      fireEvent.scroll(el);

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange.mock.calls[0]).toHaveLength(1);
      expect(onProgressChange.mock.calls[0][1]).toBeUndefined();

      restoreMountDefaults();
    });

    test('throttles rapid scrolling to far fewer emissions than scroll events', () => {
      const onProgressChange = jest.fn();
      render(<ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />);
      const el = getScrollContainer();

      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      stubScrollMetrics(el, { scrollTop: 0, scrollHeight: 5000, clientHeight: 500 });
      for (let i = 1; i <= 10; i++) {
        el.scrollTop = i * 50; // stays well below the completion threshold
        fireEvent.scroll(el);
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
      const onProgressChange = jest.fn();
      const { unmount } = render(
        <ChapterReader content={makeParagraphs(5)} {...baseProps} onProgressChange={onProgressChange} />
      );
      const el = getScrollContainer();

      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      stubScrollMetrics(el, { scrollTop: 0, scrollHeight: 5000, clientHeight: 500 });
      fireEvent.scroll(el); // leading-edge emit
      expect(onProgressChange).toHaveBeenCalledTimes(1);

      el.scrollTop = 300; // schedules a trailing emission that has not fired yet
      fireEvent.scroll(el);
      expect(onProgressChange).toHaveBeenCalledTimes(1);

      unmount();

      expect(onProgressChange).toHaveBeenCalledTimes(2);
      const finalCall = onProgressChange.mock.calls[1];
      expect(finalCall).toHaveLength(1);
      expect(finalCall[0]).toBe(scrollPercent(300, 5000, 500));
    });

    test('restoring from a saved position does not emit progress', () => {
      // The container must be scrollable BEFORE mount, otherwise the restore
      // computes a scrollTop of 0 on an element already at 0, no restore-
      // scroll happens at all, and the suppression this test is about is
      // never armed -- leaving the test asserting suppression of an event
      // that, in a real browser, would never have fired.
      const restoreMountDefaults = stubNonCompletingMountDefaults(2000, 500);

      const onProgressChange = jest.fn();
      render(
        <ChapterReader
          content={makeParagraphs(5)}
          {...baseProps}
          position={40}
          onProgressChange={onProgressChange}
        />
      );
      const el = getScrollContainer();

      // The restore moved the element (40% of a 1500px range = 600px), so the
      // suppression is armed and the browser would now fire a scroll event.
      expect(el.scrollTop).toBe(600);

      onProgressChange.mockClear();
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Stand in for the scroll event the browser fires as a side effect of
      // that programmatic restore -- jsdom does not fire one itself.
      stubScrollMetrics(el, { scrollTop: 800, scrollHeight: 2000, clientHeight: 500 });
      fireEvent.scroll(el);
      expect(onProgressChange).not.toHaveBeenCalled();

      // A genuine subsequent scroll behaves normally -- the suppression is
      // consumed exactly once.
      el.scrollTop = 900;
      fireEvent.scroll(el);
      expect(onProgressChange).toHaveBeenCalledTimes(1);

      restoreMountDefaults();
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
    // But assigning scrollTop the value it already holds fires no event, so an
    // unconditionally-armed flag was never consumed and swallowed the reader's
    // first genuine scroll instead. An unread chapter restores to 0 and is
    // already at 0, so this hit every chapter a reader opened: scroll once,
    // navigate away, and nothing was persisted. Found in the browser — jsdom
    // fires no scroll event for a programmatic assignment, so the suppression
    // could only ever be exercised here by dispatching one by hand.
    test('a chapter restored to a position it is already at still reports the first scroll', () => {
      const restoreMountDefaults = stubNonCompletingMountDefaults(2000, 500);
      const onProgressChange = jest.fn();
      render(
        <ChapterReader
          content={makeParagraphs(5)}
          {...baseProps}
          position={0}
          onProgressChange={onProgressChange}
        />
      );
      const el = getScrollContainer();
      onProgressChange.mockClear();

      stubScrollMetrics(el, { scrollTop: 200, scrollHeight: 2000, clientHeight: 500 });
      fireEvent.scroll(el);

      expect(onProgressChange).toHaveBeenCalledTimes(1);
      expect(onProgressChange.mock.calls[0]).toHaveLength(1);
      expect(onProgressChange).toHaveBeenCalledWith(scrollPercent(200, 2000, 500));

      restoreMountDefaults();
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
  });
});
