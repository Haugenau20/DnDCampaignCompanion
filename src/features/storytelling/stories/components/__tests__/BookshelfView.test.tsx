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

  describe('read state is the only visual encoding', () => {
    test('a read spine is filled with the completed status colour', () => {
      const items = [makeItem({ id: 'ch-1', title: 'Read Chapter', order: 1 }, { state: 'read' })];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const spine = screen.getByRole('button', { name: /Read Chapter/ });
      expect(spine.className).toMatch(/bg-status-completed/);
    });

    test('a reading spine is filled with the active status colour, ringed, and taller', () => {
      const items = [
        makeItem({ id: 'ch-1', title: 'Reading Chapter', order: 1 }, { state: 'reading' }),
        makeItem({ id: 'ch-2', title: 'Unread Chapter', order: 2 }, { state: 'unread' }),
      ];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const reading = screen.getByRole('button', { name: /Reading Chapter/ });
      const unread = screen.getByRole('button', { name: /Unread Chapter/ });
      expect(reading.className).toMatch(/bg-status-active/);
      expect(reading.className).toMatch(/border-accent/);
      expect(reading.className).toMatch(/h-40/);
      expect(unread.className).not.toMatch(/h-40/);
    });

    test('an unread spine has a pale, dashed outline', () => {
      const items = [makeItem({ id: 'ch-1', title: 'Unread Chapter', order: 1 }, { state: 'unread' })];
      render(<BookshelfView items={items} onChapterSelect={jest.fn()} />);
      const spine = screen.getByRole('button', { name: /Unread Chapter/ });
      expect(spine.className).toMatch(/border-dashed/);
      expect(spine.className).not.toMatch(/bg-status-completed|bg-status-active/);
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
