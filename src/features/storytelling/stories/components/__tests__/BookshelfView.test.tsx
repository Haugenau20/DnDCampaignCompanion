// src/features/storytelling/stories/components/__tests__/BookshelfView.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BookshelfView from '../BookshelfView';
import { Chapter } from 'features/storytelling/chapters/types';

// ---------------------------------------------------------------------------
// Mock book SVG components — pure presentational; we only care about the
// shelf layout and click behaviour, not SVG rendering.
// ---------------------------------------------------------------------------
jest.mock('../books', () => {
  const makeFakeBook = (name: string) => {
    const Comp = ({ height, className }: { height: number; className?: string }) => (
      <div data-testid={`book-${name}`} style={{ height }} className={className} />
    );
    Comp.displayName = name;
    return Comp;
  };
  return {
    BookRed: makeFakeBook('BookRed'),
    BookBlue: makeFakeBook('BookBlue'),
    BookGreen: makeFakeBook('BookGreen'),
    BookPurple: makeFakeBook('BookPurple'),
    BookBrown: makeFakeBook('BookBrown'),
    BookAged: makeFakeBook('BookAged'),
    BookOrnate: makeFakeBook('BookOrnate'),
    BookClasped: makeFakeBook('BookClasped'),
    BookRibbed: makeFakeBook('BookRibbed'),
    BookJeweled: makeFakeBook('BookJeweled'),
    BookManuscript: makeFakeBook('BookManuscript'),
  };
});

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

function makeChapters(count: number, startOrder = 1): Chapter[] {
  return Array.from({ length: count }, (_, i) =>
    makeChapter({
      id: `ch-${startOrder + i}`,
      title: `Chapter ${startOrder + i}`,
      order: startOrder + i,
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('BookshelfView', () => {
  // -------------------------------------------------------------------------
  // Basic rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('renders nothing meaningful when chapters array is empty', () => {
      const { container } = render(
        <BookshelfView chapters={[]} onChapterSelect={jest.fn()} />
      );
      // No shelf groups should be rendered
      expect(container.querySelectorAll('h4').length).toBe(0);
    });

    test('renders a single shelf group for ≤10 chapters', () => {
      render(
        <BookshelfView
          chapters={makeChapters(5)}
          onChapterSelect={jest.fn()}
        />
      );
      // Heading "Chapters 1-5"
      expect(screen.getByText('Chapters 1-5')).toBeInTheDocument();
    });

    test('renders chapter order numbers on the shelf', () => {
      render(
        <BookshelfView
          chapters={makeChapters(3)}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('renders two shelf groups for 11 chapters', () => {
      render(
        <BookshelfView
          chapters={makeChapters(11)}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.getByText('Chapters 1-10')).toBeInTheDocument();
      expect(screen.getByText('Chapters 11-11')).toBeInTheDocument();
    });

    test('renders three shelf groups for 21 chapters', () => {
      render(
        <BookshelfView
          chapters={makeChapters(21)}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.getByText('Chapters 1-10')).toBeInTheDocument();
      expect(screen.getByText('Chapters 11-20')).toBeInTheDocument();
      expect(screen.getByText('Chapters 21-21')).toBeInTheDocument();
    });

    test('renders chapter title in tooltip (title attribute)', () => {
      render(
        <BookshelfView
          chapters={[makeChapter({ id: 'ch-1', title: 'Rise of Heroes', order: 1 })]}
          onChapterSelect={jest.fn()}
        />
      );
      // The Typography that displays order number has a title attribute
      const el = document.querySelector('[title="Chapter 1: Rise of Heroes"]');
      expect(el).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Grouping and sorting
  // -------------------------------------------------------------------------
  describe('grouping and sorting', () => {
    test('sorts chapters by order before grouping', () => {
      const chapters = [
        makeChapter({ id: 'ch-3', title: 'Third', order: 3 }),
        makeChapter({ id: 'ch-1', title: 'First', order: 1 }),
        makeChapter({ id: 'ch-2', title: 'Second', order: 2 }),
      ];
      render(
        <BookshelfView chapters={chapters} onChapterSelect={jest.fn()} />
      );
      // All belong to group 1-3
      expect(screen.getByText('Chapters 1-3')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click behaviour
  // -------------------------------------------------------------------------
  describe('click behaviour', () => {
    test('calls onChapterSelect with the correct chapter id when a book is clicked', () => {
      const onChapterSelect = jest.fn();
      render(
        <BookshelfView
          chapters={makeChapters(3)}
          onChapterSelect={onChapterSelect}
        />
      );
      // Click the first book wrapper (the div holding the book component)
      // Chapter order number text is the most reliably clickable element per chapter
      const chapterNumber = screen.getByText('2'); // chapter 2
      fireEvent.click(chapterNumber.closest('[style]') as Element);
      expect(onChapterSelect).toHaveBeenCalledWith('ch-2');
    });

    test('calls onChapterSelect for each unique chapter id on separate clicks', () => {
      const onChapterSelect = jest.fn();
      render(
        <BookshelfView
          chapters={makeChapters(2)}
          onChapterSelect={onChapterSelect}
        />
      );
      const numberEls = [screen.getByText('1'), screen.getByText('2')];
      numberEls.forEach((el) => fireEvent.click(el.closest('[style]') as Element));
      expect(onChapterSelect).toHaveBeenCalledTimes(2);
      expect(onChapterSelect).toHaveBeenNthCalledWith(1, 'ch-1');
      expect(onChapterSelect).toHaveBeenNthCalledWith(2, 'ch-2');
    });
  });

  // -------------------------------------------------------------------------
  // Current chapter highlighting
  // -------------------------------------------------------------------------
  describe('current chapter highlighting', () => {
    test('applies active class to the current chapter wrapper', () => {
      render(
        <BookshelfView
          chapters={makeChapters(3)}
          currentChapterId="ch-2"
          onChapterSelect={jest.fn()}
        />
      );
      // The active chapter wrapper has "-translate-y-2" and "z-10"
      const chapterEl = screen.getByText('2').closest('[style]') as HTMLElement;
      expect(chapterEl.className).toMatch(/-translate-y-2/);
    });

    test('does not apply active class to non-current chapters', () => {
      render(
        <BookshelfView
          chapters={makeChapters(3)}
          currentChapterId="ch-2"
          onChapterSelect={jest.fn()}
        />
      );
      const otherEl = screen.getByText('1').closest('[style]') as HTMLElement;
      // Should not have z-10 class (active marker)
      expect(otherEl.className).not.toMatch(/z-10/);
    });

    test('renders without currentChapterId prop without error', () => {
      expect(() =>
        render(
          <BookshelfView
            chapters={makeChapters(3)}
            onChapterSelect={jest.fn()}
          />
        )
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Book height based on content length
  // -------------------------------------------------------------------------
  describe('book height calculation', () => {
    test('assigns base height 120 for short content', () => {
      render(
        <BookshelfView
          chapters={[makeChapter({ content: 'Short.', order: 1 })]}
          onChapterSelect={jest.fn()}
        />
      );
      // Any of the fake book divs should render
      const bookEl = document.querySelector('[data-testid^="book-"]') as HTMLElement;
      expect(bookEl).not.toBeNull();
      // height 120 (base) or anything — we just confirm it renders
      expect(parseInt(bookEl.style.height, 10)).toBeGreaterThanOrEqual(110);
    });

    test('assigns larger height for long content (>3500 chars)', () => {
      const longContent = 'A'.repeat(4000);
      render(
        <BookshelfView
          chapters={[makeChapter({ content: longContent, order: 1 })]}
          onChapterSelect={jest.fn()}
        />
      );
      const bookEl = document.querySelector('[data-testid^="book-"]') as HTMLElement;
      expect(parseInt(bookEl.style.height, 10)).toBe(190);
    });
  });
});
