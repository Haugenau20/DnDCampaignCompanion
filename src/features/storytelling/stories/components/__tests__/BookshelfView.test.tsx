// src/features/storytelling/stories/components/__tests__/BookshelfView.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookshelfView from '../BookshelfView';
import { Chapter } from 'features/storytelling/chapters/types';
import { ChapterWithProgress } from 'features/storytelling/chapters/utils/chapter-progress';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'ch-1',
    title: 'The Beginning',
    content: 'Once upon a time...',
    order: 1,
    createdBy: 'user-1',
    createdByUsername: 'Author',
    dateAdded: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeItem(
  chapterOverrides: Partial<Chapter> = {},
  itemOverrides: Partial<Omit<ChapterWithProgress, 'chapter'>> = {}
): ChapterWithProgress {
  return {
    chapter: makeChapter(chapterOverrides),
    state: 'unread',
    percentRead: 0,
    isCurrent: false,
    ...itemOverrides,
  };
}

function makeItems(count: number, startOrder = 1): ChapterWithProgress[] {
  return Array.from({ length: count }, (_, i) =>
    makeItem(
      { id: `ch-${startOrder + i}`, title: `Chapter ${startOrder + i}`, order: startOrder + i },
      { state: 'unread' }
    )
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookshelfView', () => {
  describe('rendering and grouping', () => {
    test('renders nothing meaningful when items is empty', () => {
      render(<BookshelfView items={[]} onChapterSelect={jest.fn()} />);
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
      expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    test('renders a single group heading for 5 chapters', () => {
      render(<BookshelfView items={makeItems(5)} onChapterSelect={jest.fn()} />);
      expect(screen.getByText('Chapters 1–5')).toBeInTheDocument();
    });

    test('renders two group headings for 11 chapters', () => {
      render(<BookshelfView items={makeItems(11)} onChapterSelect={jest.fn()} />);
      expect(screen.getByText('Chapters 1–10')).toBeInTheDocument();
      expect(screen.getByText('Chapters 11–11')).toBeInTheDocument();
    });
  });

  describe('spines are real, keyboard-reachable buttons', () => {
    test('gives each spine an accessible name of the form "Chapter N: Title — state"', () => {
      const items = [
        makeItem({ id: 'ch-4', title: 'Over Hill and Under Hill', order: 4 }, { state: 'read' }),
      ];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      expect(
        screen.getByRole('button', { name: 'Chapter 4: Over Hill and Under Hill — read' })
      ).toBeInTheDocument();
    });

    test('reflects reading and unread states in the accessible name', () => {
      const items = [
        makeItem({ id: 'ch-1', title: 'Reading One', order: 1 }, { state: 'reading' }),
        makeItem({ id: 'ch-2', title: 'Unread Two', order: 2 }, { state: 'unread' }),
      ];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      expect(
        screen.getByRole('button', { name: 'Chapter 1: Reading One — reading' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Chapter 2: Unread Two — unread' })
      ).toBeInTheDocument();
    });

    test('clicking a spine calls onChapterSelect with the chapter id', () => {
      const onChapterSelect = jest.fn();
      const items = [makeItem({ id: 'ch-9', title: 'Ninth Chapter', order: 9 }, { state: 'read' })];
      render(<BookshelfView items={items} onChapterSelect={onChapterSelect} />);
      fireEvent.click(screen.getByRole('button', { name: /Ninth Chapter/ }));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-9');
    });
  });

  describe('read state treatment', () => {
    // Read state is drawn as a treatment applied OVER the book illustration,
    // not as a replacement for it. The shelf briefly rendered every chapter as
    // an identical coloured rectangle, which bought at-a-glance progress at the
    // cost of the shelf reading as a bar chart rather than a shelf. Identity
    // (which illustration, how thick, how tall) and state (these filters) were
    // never competing for the same channel.
    const bookOf = (name: RegExp) =>
      screen.getByRole('button', { name }).querySelector('span') as HTMLElement;

    test('a read book is drawn at full colour', () => {
      const items = [makeItem({ id: 'ch-1', title: 'Read Chapter', order: 1 }, { state: 'read' })];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const book = bookOf(/Read Chapter/);
      expect(book.className).toMatch(/opacity-100/);
      expect(book.className).not.toMatch(/grayscale/);
    });

    test('an unread book is faded and drained of colour, but still a book', () => {
      const items = [makeItem({ id: 'ch-1', title: 'Unread Chapter', order: 1 }, { state: 'unread' })];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const book = bookOf(/Unread Chapter/);
      expect(book.className).toMatch(/grayscale/);
      expect(book.className).toMatch(/opacity-45/);
      // The illustration is still rendered -- unread must not flatten the book
      // into a different kind of object.
      expect(book.querySelector('svg')).toBeInTheDocument();
    });

    test('the chapter being read is lifted off the shelf', () => {
      const items = [
        makeItem({ id: 'ch-1', title: 'Reading Chapter', order: 1 }, { state: 'reading' }),
        makeItem({ id: 'ch-2', title: 'Unread Chapter', order: 2 }, { state: 'unread' }),
      ];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      // Anchored to a class boundary: every book carries
      // `group-hover:-translate-y-2`, which contains this substring, so an
      // unanchored match would pass for a book that is not lifted at rest.
      const liftedAtRest = /(^|\s)-translate-y-2/;
      expect(bookOf(/Reading Chapter/).className).toMatch(liftedAtRest);
      expect(bookOf(/Unread Chapter/).className).not.toMatch(liftedAtRest);
    });

    test('the current chapter is ringed', () => {
      const items = [
        makeItem({ id: 'ch-1', title: 'Current Chapter', order: 1 }, { state: 'reading', isCurrent: true }),
        makeItem({ id: 'ch-2', title: 'Other Chapter', order: 2 }, { state: 'unread' }),
      ];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      expect(bookOf(/Current Chapter/).className).toMatch(/ring-accent/);
      expect(bookOf(/Other Chapter/).className).not.toMatch(/ring-accent/);
    });
  });

  describe('book illustrations', () => {
    // The point of the shelf existing beside the list view: thirty chapters
    // should look like thirty books, not thirty identical boxes.
    test('neighbouring chapters are drawn as different books', () => {
      const items = [
        makeItem({ id: 'ch-1', title: 'One', order: 1 }, { state: 'unread' }),
        makeItem({ id: 'ch-2', title: 'Two', order: 2 }, { state: 'unread' }),
      ];
      const { container } = render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const svgs = [...container.querySelectorAll('button svg')];
      expect(svgs).toHaveLength(2);
      expect(svgs[0].innerHTML).not.toBe(svgs[1].innerHTML);
    });

    // A ~40px spine cannot carry a full title at a readable size; it clipped
    // mid-word and lost the chapter number, the one part identifying the book.
    // Titles live in the list view; the shelf shows the number and keeps the
    // title one hover -- or one screen reader stop -- away.
    test('shows the chapter number, with the title available but not set on the spine', () => {
      const items = [makeItem({ id: 'ch-9', title: 'A Very Long Chapter Title Indeed', order: 9 }, { state: 'unread' })];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const button = screen.getByRole('button', { name: /A Very Long Chapter Title Indeed/ });
      expect(button).toHaveTextContent('9');
      expect(button).not.toHaveTextContent('A Very Long Chapter Title Indeed');
      expect(button).toHaveAttribute('title', 'Chapter 9: A Very Long Chapter Title Indeed');
    });
  });

  describe('legend', () => {
    test('renders Read, Reading now and Unread once chapters exist', () => {
      render(<BookshelfView items={makeItems(2)} onChapterSelect={jest.fn()} />);
      expect(screen.getByText('Read')).toBeInTheDocument();
      expect(screen.getByText('Reading now')).toBeInTheDocument();
      expect(screen.getByText('Unread')).toBeInTheDocument();
    });

    test('does not render the legend when there are no chapters', () => {
      render(<BookshelfView items={[]} onChapterSelect={jest.fn()} />);
      expect(screen.queryByText('Reading now')).not.toBeInTheDocument();
    });
  });

  describe('shared props contract', () => {
    test('accepts isAdmin and onEditChapter without rendering an edit affordance', () => {
      const onEditChapter = jest.fn();
      render(
        <BookshelfView
          items={makeItems(1)}
          onChapterSelect={jest.fn()}
          isAdmin
          onEditChapter={onEditChapter}
        />
      );
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
      expect(onEditChapter).not.toHaveBeenCalled();
    });
  });
});
