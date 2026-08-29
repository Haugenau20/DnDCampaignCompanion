// src/features/storytelling/stories/components/__tests__/ChapterRail.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ChapterRail from '../ChapterRail';
import { Chapter, StoryProgress } from 'features/storytelling/chapters/types';
import { deriveChapterProgress } from 'features/storytelling/chapters/utils/chapter-progress';

// ---------------------------------------------------------------------------
// Fixture helpers — built through deriveChapterProgress, the same derivation
// the real reader page uses, so these fixtures can't drift from it.
// ---------------------------------------------------------------------------

function makeChapter(order: number, overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: `ch-${order}`,
    title: `Chapter ${order} Title`,
    content: 'Content here.',
    order,
    createdBy: 'user-1',
    createdByUsername: 'Author',
    dateAdded: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeProgress(
  entries: Record<string, { lastPosition?: number; isComplete?: boolean }>,
  currentChapter = ''
): StoryProgress {
  return {
    currentChapter,
    lastRead: new Date(),
    chapterProgress: Object.fromEntries(
      Object.entries(entries).map(([id, v]) => [
        id,
        {
          chapterId: id,
          lastPosition: v.lastPosition ?? 0,
          isComplete: v.isComplete ?? false,
          lastRead: new Date(),
        },
      ])
    ),
  };
}

/** Three chapters: one read, one in progress (current), one untouched. */
function threeMixedChapters() {
  const chapters = [makeChapter(1), makeChapter(2), makeChapter(3)];
  const progress = makeProgress(
    {
      'ch-1': { isComplete: true },
      'ch-2': { lastPosition: 40 },
    },
    'ch-2'
  );
  return deriveChapterProgress(chapters, progress);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ChapterRail', () => {
  // The persistent rail is always mounted, so any test that doesn't care
  // about the drawer renders with isOpen=false — that keeps exactly one copy
  // of the chapter list in the tree and lets plain screen.getByText queries
  // work without ambiguity.

  describe('persistent rail', () => {
    test('renders every chapter with its number and title', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByText('1. Chapter 1 Title')).toBeInTheDocument();
      expect(screen.getByText('2. Chapter 2 Title')).toBeInTheDocument();
      expect(screen.getByText('3. Chapter 3 Title')).toBeInTheDocument();
    });

    test('clicking a row calls onChapterSelect with that chapter id', () => {
      const onChapterSelect = jest.fn();
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={onChapterSelect}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      fireEvent.click(screen.getByText('3. Chapter 3 Title'));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-3');
    });

    test('clicking a row in the persistent rail does not call onClose', () => {
      const onClose = jest.fn();
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={onClose}
        />
      );
      fireEvent.click(screen.getByText('1. Chapter 1 Title'));
      expect(onClose).not.toHaveBeenCalled();
    });

    test('the current chapter is marked with aria-current="page"', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          currentChapterId="ch-2"
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      const currentRow = screen.getByText('2. Chapter 2 Title').closest('button') as HTMLElement;
      expect(currentRow).toHaveAttribute('aria-current', 'page');

      const otherRow = screen.getByText('1. Chapter 1 Title').closest('button') as HTMLElement;
      expect(otherRow).not.toHaveAttribute('aria-current');
    });

    test('the current chapter row has navigation-item-active, others have navigation-item', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          currentChapterId="ch-2"
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      const currentRow = screen.getByText('2. Chapter 2 Title').closest('button') as HTMLElement;
      expect(currentRow.className).toMatch(/navigation-item-active/);

      const otherRow = screen.getByText('3. Chapter 3 Title').closest('button') as HTMLElement;
      expect(otherRow.className).toMatch(/navigation-item/);
      expect(otherRow.className).not.toMatch(/navigation-item-active/);
    });

    test('"All chapters" calls onBackToIndex', () => {
      const onBackToIndex = jest.fn();
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={onBackToIndex}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'All chapters' }));
      expect(onBackToIndex).toHaveBeenCalledTimes(1);
    });

    test('a read chapter shows a check icon and is muted; an unread chapter shows neither', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      const readRow = screen.getByText('1. Chapter 1 Title').closest('button') as HTMLElement;
      expect(readRow.querySelector('svg')).toBeInTheDocument();
      expect(readRow.textContent).toContain('1. Chapter 1 Title');

      const unreadRow = screen.getByText('3. Chapter 3 Title').closest('button') as HTMLElement;
      expect(unreadRow.querySelector('svg')).not.toBeInTheDocument();
    });

    test('shows "N of M read"', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      // One of the three fixture chapters is complete.
      expect(screen.getByText('1 of 3 read')).toBeInTheDocument();
    });

    test('renders an empty items array without crashing', () => {
      expect(() =>
        render(
          <ChapterRail
            items={[]}
            onChapterSelect={jest.fn()}
            onBackToIndex={jest.fn()}
            isOpen={false}
            onClose={jest.fn()}
          />
        )
      ).not.toThrow();
      expect(screen.getByText('0 of 0 read')).toBeInTheDocument();
    });
  });

  // The drawer is only mounted while isOpen is true. At that point the
  // persistent rail is *also* mounted (it's always-on), so these tests scope
  // their queries to the drawer's own fixed panel rather than using
  // screen.getByText directly — mirroring how SlidingChapters.test.tsx finds
  // its panel via container.querySelector.
  describe('drawer', () => {
    function getDrawerPanel(container: HTMLElement): HTMLElement {
      const panel = container.querySelector('.fixed.top-0.left-0');
      expect(panel).not.toBeNull();
      return panel as HTMLElement;
    }

    test('is not present in the DOM when isOpen=false', () => {
      const { container } = render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      expect(container.querySelector('.dialog-backdrop')).toBeNull();
      expect(container.querySelector('.fixed.top-0.left-0')).toBeNull();
    });

    test('backdrop and panel are present when isOpen=true', () => {
      const { container } = render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={true}
          onClose={jest.fn()}
        />
      );
      expect(container.querySelector('.dialog-backdrop')).not.toBeNull();
      expect(container.querySelector('.fixed.top-0.left-0')).not.toBeNull();
    });

    test('clicking the backdrop calls onClose', () => {
      const onClose = jest.fn();
      const { container } = render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={true}
          onClose={onClose}
        />
      );
      fireEvent.click(container.querySelector('.dialog-backdrop') as HTMLElement);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('clicking the close button calls onClose', () => {
      const onClose = jest.fn();
      const { container } = render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={true}
          onClose={onClose}
        />
      );
      const panel = getDrawerPanel(container);
      const closeButton = within(panel).getByRole('button', { name: 'Close chapter list' });
      fireEvent.click(closeButton);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('selecting a chapter in the drawer calls both onChapterSelect and onClose', () => {
      const onChapterSelect = jest.fn();
      const onClose = jest.fn();
      const { container } = render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={onChapterSelect}
          onBackToIndex={jest.fn()}
          isOpen={true}
          onClose={onClose}
        />
      );
      const panel = getDrawerPanel(container);
      fireEvent.click(within(panel).getByText('3. Chapter 3 Title'));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-3');
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('the drawer\'s "All chapters" also calls onBackToIndex', () => {
      const onBackToIndex = jest.fn();
      const { container } = render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={onBackToIndex}
          isOpen={true}
          onClose={jest.fn()}
        />
      );
      const panel = getDrawerPanel(container);
      fireEvent.click(within(panel).getByRole('button', { name: 'All chapters' }));
      expect(onBackToIndex).toHaveBeenCalledTimes(1);
    });
  });
});
