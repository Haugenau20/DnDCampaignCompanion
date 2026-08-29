// src/features/storytelling/stories/components/__tests__/ChapterList.test.tsx

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import ChapterList from '../ChapterList';
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

/** 10 sequential unread chapters starting at `startOrder`, all in one group of tens. */
function makeUnreadGroup(startOrder: number, count = 10): ChapterWithProgress[] {
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

describe('ChapterList', () => {
  describe('read state rendering', () => {
    const items: ChapterWithProgress[] = [
      makeItem({ id: 'ch-1', title: 'Read One', order: 1 }, { state: 'read' }),
      makeItem({ id: 'ch-2', title: 'Reading Two', order: 2 }, { state: 'reading' }),
      makeItem({ id: 'ch-3', title: 'Unread Three', order: 3 }, { state: 'unread' }),
    ];

    test('shows "Read" with a check for a read chapter', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      const row = screen.getByText('Read One').closest('div[class*="border-b"]') as HTMLElement;
      expect(within(row).getByText('Read')).toBeInTheDocument();
    });

    test('shows "Reading" for an in-progress, non-current chapter', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      const row = screen.getByText('Reading Two').closest('div[class*="border-b"]') as HTMLElement;
      expect(within(row).getByText('Reading')).toBeInTheDocument();
    });

    test('shows neither a check icon nor a "Reading" label for an unread chapter', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      const row = screen.getByText('Unread Three').closest('div[class*="border-b"]') as HTMLElement;
      // The action button also happens to read "Read" for an unread chapter,
      // so the state column is distinguished by the absence of the check icon
      // (svg) rather than by text.
      expect(row.querySelector('svg')).not.toBeInTheDocument();
      expect(within(row).queryByText('Reading')).not.toBeInTheDocument();
    });

    test('action label reflects state: Reread / Resume / Read', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      expect(screen.getByRole('button', { name: 'Reread' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Resume' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Read' })).toBeInTheDocument();
    });

    test('clicking the action button calls onChapterSelect with the chapter id', () => {
      const onChapterSelect = jest.fn();
      render(<ChapterList items={items} onChapterSelect={onChapterSelect} />);
      fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-2');
    });

    test('clicking the row itself also calls onChapterSelect', () => {
      const onChapterSelect = jest.fn();
      render(<ChapterList items={items} onChapterSelect={onChapterSelect} />);
      fireEvent.click(screen.getByText('Unread Three'));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-3');
    });
  });

  describe('promoted current row', () => {
    test('renders a larger title, accent border and inline progress for the current chapter', () => {
      const items: ChapterWithProgress[] = [
        makeItem({ id: 'ch-1', title: 'Not Current', order: 1 }, { state: 'unread' }),
        makeItem(
          { id: 'ch-2', title: 'Current Chapter', order: 2 },
          { state: 'reading', isCurrent: true, percentRead: 62 }
        ),
      ];
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);

      expect(screen.getByText('62% through')).toBeInTheDocument();

      const title = screen.getByText('Current Chapter');
      // Promoted title renders as an h4 (the larger variant).
      expect(title.tagName).toBe('H4');

      const row = title.closest('div[class*="border-b"]') as HTMLElement;
      expect(row.className).toMatch(/border-l-accent/);
      expect(row.className).toMatch(/bg-accent/);
    });

    test('non-current chapter title is not promoted to h4', () => {
      const items: ChapterWithProgress[] = [
        makeItem({ id: 'ch-1', title: 'Plain Chapter', order: 1 }, { state: 'unread' }),
      ];
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      expect(screen.getByText('Plain Chapter').tagName).not.toBe('H4');
    });

    test('read chapters that are not current are muted', () => {
      const items: ChapterWithProgress[] = [
        makeItem({ id: 'ch-1', title: 'Old Chapter', order: 1 }, { state: 'read' }),
      ];
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      expect(screen.getByText('Old Chapter').className).toMatch(/typography-muted/);
    });
  });

  describe('run collapsing and expansion', () => {
    // 10 chapters: 1-2 unread, 3-5 read (a 3-run), 6-7 unread, 8 current/reading,
    // 9-10 unread. The 3-run does not touch the current chapter (order 8), so it
    // collapses per chapter-progress.ts's collapseReadRuns.
    const items: ChapterWithProgress[] = [
      makeItem({ id: 'ch-1', title: 'Chapter 1', order: 1 }, { state: 'unread' }),
      makeItem({ id: 'ch-2', title: 'Chapter 2', order: 2 }, { state: 'unread' }),
      makeItem({ id: 'ch-3', title: 'Chapter 3', order: 3 }, { state: 'read' }),
      makeItem({ id: 'ch-4', title: 'Chapter 4', order: 4 }, { state: 'read' }),
      makeItem({ id: 'ch-5', title: 'Chapter 5', order: 5 }, { state: 'read' }),
      makeItem({ id: 'ch-6', title: 'Chapter 6', order: 6 }, { state: 'unread' }),
      makeItem({ id: 'ch-7', title: 'Chapter 7', order: 7 }, { state: 'unread' }),
      makeItem(
        { id: 'ch-8', title: 'Chapter 8', order: 8 },
        { state: 'reading', isCurrent: true, percentRead: 40 }
      ),
      makeItem({ id: 'ch-9', title: 'Chapter 9', order: 9 }, { state: 'unread' }),
      makeItem({ id: 'ch-10', title: 'Chapter 10', order: 10 }, { state: 'unread' }),
    ];

    test('collapses the read run into a single summary row', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      expect(screen.getByText(/3–5/)).toBeInTheDocument();
      expect(screen.getByText(/Three more read chapters/)).toBeInTheDocument();
      // The individual collapsed chapters are not rendered as their own rows.
      expect(screen.queryByText('Chapter 4')).not.toBeInTheDocument();
    });

    test('expands the run in place when "Show" is clicked', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show' }));
      expect(screen.getByText('Chapter 3')).toBeInTheDocument();
      expect(screen.getByText('Chapter 4')).toBeInTheDocument();
      expect(screen.getByText('Chapter 5')).toBeInTheDocument();
      // The summary label is still present, now paired with a "Hide" control.
      expect(screen.getByRole('button', { name: 'Hide' })).toBeInTheDocument();
    });

    test('collapses the run again when "Hide" is clicked', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show' }));
      fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
      expect(screen.queryByText('Chapter 4')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Show' })).toBeInTheDocument();
    });
  });

  describe('trailing-group collapse', () => {
    // Group 1 (1-10) has activity; groups 2 (11-20) and 3 (21-25) are entirely
    // unread, so they collapse into a single "none opened yet" line.
    const activeGroup = makeUnreadGroup(1, 9).concat(
      makeItem({ id: 'ch-10', title: 'Chapter 10', order: 10 }, { state: 'read' })
    );
    const items: ChapterWithProgress[] = [
      ...activeGroup,
      ...makeUnreadGroup(11, 10),
      ...makeUnreadGroup(21, 5),
    ];

    test('renders the active group normally and collapses trailing inactive groups', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      expect(screen.getByText('Chapters 1–10')).toBeInTheDocument();
      expect(screen.getByText('Chapters 11–25 · none opened yet')).toBeInTheDocument();
      expect(screen.queryByText('Chapters 11–20')).not.toBeInTheDocument();
      expect(screen.queryByText('Chapters 21–25')).not.toBeInTheDocument();
    });

    test('"Show all" reveals the individual trailing groups', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} />);
      fireEvent.click(screen.getByRole('button', { name: 'Show all' }));
      expect(screen.getByText('Chapters 11–20')).toBeInTheDocument();
      expect(screen.getByText('Chapters 21–25')).toBeInTheDocument();
      expect(screen.queryByText('Chapters 11–25 · none opened yet')).not.toBeInTheDocument();
    });
  });

  describe('admin controls', () => {
    const items: ChapterWithProgress[] = [
      makeItem({ id: 'ch-1', title: 'Chapter One', order: 1 }, { state: 'unread' }),
    ];

    test('does not render Edit when isAdmin is false', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} onEditChapter={jest.fn()} />);
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    test('does not render Edit when onEditChapter is missing, even if isAdmin', () => {
      render(<ChapterList items={items} onChapterSelect={jest.fn()} isAdmin />);
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    test('renders Edit and calls onEditChapter with the chapter id', () => {
      const onEditChapter = jest.fn();
      render(
        <ChapterList items={items} onChapterSelect={jest.fn()} isAdmin onEditChapter={onEditChapter} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(onEditChapter).toHaveBeenCalledWith('ch-1');
    });
  });

  describe('empty state', () => {
    test('renders no group headers when items is empty', () => {
      render(<ChapterList items={[]} onChapterSelect={jest.fn()} />);
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });
  });
});
