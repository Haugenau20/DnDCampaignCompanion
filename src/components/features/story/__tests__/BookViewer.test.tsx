// src/components/features/story/__tests__/BookViewer.test.tsx

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BookViewer from '../BookViewer';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a string of N words so we can test exact pagination thresholds. */
function makeWords(n: number, word = 'word'): string {
  return Array(n).fill(word).join(' ');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookViewer', () => {
  // -------------------------------------------------------------------------
  // Empty content state
  // -------------------------------------------------------------------------
  describe('empty content', () => {
    test('renders "No Content Available" card when content is empty string', () => {
      render(<BookViewer content="" title="My Story" />);
      expect(screen.getByText('No Content Available')).toBeInTheDocument();
    });

    test('renders instructional text when content is empty', () => {
      render(<BookViewer content="" title="My Story" />);
      expect(screen.getByText('Select a chapter to begin reading')).toBeInTheDocument();
    });

    test('does not render the book container when content is empty', () => {
      render(<BookViewer content="" title="My Story" />);
      expect(screen.queryByText('Page 1 of')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Content display
  // -------------------------------------------------------------------------
  describe('content display', () => {
    test('renders the chapter title in the book header', () => {
      render(<BookViewer content="Some story text." title="Chapter One" />);
      expect(screen.getByText('Chapter One')).toBeInTheDocument();
    });

    test('shows "Page 1 of 1" for short single-page content', () => {
      render(<BookViewer content={makeWords(10)} title="Ch1" />);
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });

    test('paginates correctly — 250 words per page', () => {
      // 500 words => 2 pages of 250
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    test('renders content text on the first page', () => {
      render(<BookViewer content="hello world adventure begins" title="Ch1" />);
      expect(screen.getByText('hello world adventure begins')).toBeInTheDocument();
    });

    test('converts escaped \\n sequences to paragraph breaks', () => {
      // The component replaces the literal two-char sequence \n (backslash + n)
      // with a real newline, then splits on '\n' to render separate <p> tags.
      // To produce the literal \n in the DOM string we use a raw string via
      // String.raw so the prop value contains the two characters \ and n.
      const rawContent = String.raw`First paragraph\nSecond paragraph`;
      render(<BookViewer content={rawContent} title="Ch1" />);
      // After formatContent the content becomes "First paragraph\nSecond paragraph"
      // (real newline), and renderContent splits on '\n' producing two <p> elements.
      expect(screen.getByText('First paragraph')).toBeInTheDocument();
      expect(screen.getByText('Second paragraph')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard shortcut hint
  // -------------------------------------------------------------------------
  describe('keyboard shortcut hint', () => {
    test('shows keyboard hint on initial render', () => {
      render(<BookViewer content="Some content here." title="Ch1" />);
      expect(screen.getByText(/Use arrow keys or spacebar/i)).toBeInTheDocument();
    });

    test('hint disappears after 5 seconds', () => {
      jest.useFakeTimers();
      render(<BookViewer content="Some content here." title="Ch1" />);
      expect(screen.getByText(/Use arrow keys or spacebar/i)).toBeInTheDocument();
      act(() => { jest.advanceTimersByTime(5001); });
      expect(screen.queryByText(/Use arrow keys or spacebar/i)).not.toBeInTheDocument();
      jest.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Page navigation buttons
  // -------------------------------------------------------------------------
  describe('page navigation buttons', () => {
    test('"Previous page" button is disabled on first page', () => {
      render(<BookViewer content={makeWords(10)} title="Ch1" hasPreviousChapter={false} />);
      const prevBtn = screen.getByRole('button', { name: 'Previous page' });
      expect(prevBtn).toBeDisabled();
    });

    test('"Next page" button is disabled on last page when no next chapter', () => {
      render(<BookViewer content={makeWords(10)} title="Ch1" hasNextChapter={false} />);
      const nextBtn = screen.getByRole('button', { name: 'Next page' });
      expect(nextBtn).toBeDisabled();
    });

    test('clicking "Next page" advances to page 2', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    test('clicking "Previous page" goes back to page 1', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    test('"Previous page" button enabled on page 2', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      const prevBtn = screen.getByRole('button', { name: 'Previous page' });
      expect(prevBtn).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Chapter navigation buttons
  // -------------------------------------------------------------------------
  describe('chapter navigation buttons', () => {
    test('"Previous Chapter" button is disabled when hasPreviousChapter=false', () => {
      render(
        <BookViewer content="some text" title="Ch1" hasPreviousChapter={false} />
      );
      expect(screen.getByRole('button', { name: /Previous Chapter/i })).toBeDisabled();
    });

    test('"Next Chapter" button is disabled when hasNextChapter=false', () => {
      render(
        <BookViewer content="some text" title="Ch1" hasNextChapter={false} />
      );
      expect(screen.getByRole('button', { name: /Next Chapter/i })).toBeDisabled();
    });

    test('clicking "Next Chapter" calls onNextChapter callback', () => {
      const onNextChapter = jest.fn();
      render(
        <BookViewer
          content="some text"
          title="Ch1"
          hasNextChapter={true}
          onNextChapter={onNextChapter}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Next Chapter/i }));
      expect(onNextChapter).toHaveBeenCalledTimes(1);
    });

    test('clicking "Previous Chapter" calls onPreviousChapter callback', () => {
      const onPreviousChapter = jest.fn();
      render(
        <BookViewer
          content="some text"
          title="Ch1"
          hasPreviousChapter={true}
          onPreviousChapter={onPreviousChapter}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: /Previous Chapter/i }));
      expect(onPreviousChapter).toHaveBeenCalledTimes(1);
    });

    test('"Next page" button not disabled on last page when hasNextChapter=true', () => {
      render(
        <BookViewer
          content={makeWords(10)}
          title="Ch1"
          hasNextChapter={true}
        />
      );
      const nextPageBtn = screen.getByRole('button', { name: 'Next page' });
      expect(nextPageBtn).not.toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // onPageChange callback
  // -------------------------------------------------------------------------
  describe('onPageChange callback', () => {
    test('calls onPageChange with page number when navigating forward', () => {
      const onPageChange = jest.fn();
      render(
        <BookViewer
          content={makeWords(500)}
          title="Ch1"
          onPageChange={onPageChange}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(onPageChange).toHaveBeenCalledWith(2);
    });

    test('calls onPageChange with isComplete=true on reaching last page', () => {
      const onPageChange = jest.fn();
      render(
        <BookViewer
          content={makeWords(500)}
          title="Ch1"
          onPageChange={onPageChange}
        />
      );
      // Navigate to last page (page 2 of 2)
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      // onPageChange should be called first with (2) then with (2, true)
      const calls = onPageChange.mock.calls;
      const completeCall = calls.find((c) => c[1] === true);
      expect(completeCall).toBeDefined();
      expect(completeCall![0]).toBe(2);
    });
  });

  // -------------------------------------------------------------------------
  // Keyboard navigation
  // -------------------------------------------------------------------------
  describe('keyboard navigation', () => {
    test('ArrowRight key advances page', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    test('ArrowLeft key goes to previous page', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'ArrowLeft' });
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });

    test('Space key advances page', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      fireEvent.keyDown(window, { key: ' ' });
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    });

    test('Home key goes to first page', () => {
      render(<BookViewer content={makeWords(750)} title="Ch1" />);
      // 750 words = 3 pages
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      fireEvent.keyDown(window, { key: 'ArrowRight' });
      expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Home' });
      expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    });

    test('End key goes to last page', () => {
      render(<BookViewer content={makeWords(750)} title="Ch1" />);
      // 3 pages; starting on page 1
      fireEvent.keyDown(window, { key: 'End' });
      expect(screen.getByText('Page 3 of 3')).toBeInTheDocument();
    });

    test('keyboard navigation does not fire when focused in input', () => {
      render(
        <div>
          <input data-testid="inp" />
          <BookViewer content={makeWords(500)} title="Ch1" />
        </div>
      );
      const input = screen.getByTestId('inp');
      // Simulate keydown with the input as the target
      fireEvent.keyDown(input, { key: 'ArrowRight', target: input });
      // Page should remain at 1
      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Progress bar
  // -------------------------------------------------------------------------
  describe('progress bar', () => {
    test('progress bar starts at 100% for single-page content', () => {
      render(<BookViewer content={makeWords(10)} title="Ch1" />);
      // 1/1 * 100 = 100%
      const progressBar = document.querySelector('.progress-bar') as HTMLElement;
      expect(progressBar).not.toBeNull();
      expect(progressBar.style.width).toBe('100%');
    });

    test('progress bar shows 50% on page 1 of 2', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      const progressBar = document.querySelector('.progress-bar') as HTMLElement;
      expect(progressBar.style.width).toBe('50%');
    });

    test('progress bar shows 100% on page 2 of 2', () => {
      render(<BookViewer content={makeWords(500)} title="Ch1" />);
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      const progressBar = document.querySelector('.progress-bar') as HTMLElement;
      expect(progressBar.style.width).toBe('100%');
    });
  });

  // -------------------------------------------------------------------------
  // Content change resets to page 1
  // -------------------------------------------------------------------------
  describe('content change', () => {
    test('resets to page 1 when content prop changes', () => {
      const { rerender } = render(
        <BookViewer content={makeWords(500)} title="Ch1" />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
      expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
      rerender(<BookViewer content={makeWords(10)} title="Ch2" />);
      expect(screen.getByText('Page 1 of 1')).toBeInTheDocument();
    });
  });
});
