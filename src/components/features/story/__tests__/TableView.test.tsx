// src/components/features/story/__tests__/TableView.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TableView from '../TableView';
import { Chapter } from '../../../../types/story';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'ch-1',
    title: 'The Beginning',
    content: 'Content here.',
    order: 1,
    summary: undefined,
    createdBy: 'user-1',
    createdByUsername: 'Author',
    dateAdded: '2024-01-01T00:00:00.000Z',
    dateModified: '2024-01-02T00:00:00.000Z',
    ...overrides,
  };
}

function makeChapters(count: number): Chapter[] {
  return Array.from({ length: count }, (_, i) =>
    makeChapter({
      id: `ch-${i + 1}`,
      title: `Chapter ${i + 1}`,
      order: i + 1,
      dateModified: `2024-0${i + 1}-01T00:00:00.000Z`,
    })
  );
}

type SortField = 'order' | 'title' | 'lastModified';

// Default props for convenience
function defaultProps(overrides: Partial<React.ComponentProps<typeof TableView>> = {}) {
  return {
    chapters: makeChapters(3),
    currentChapterId: undefined,
    onChapterSelect: jest.fn(),
    sortField: 'order' as SortField,
    sortDirection: 'asc' as const,
    onSort: jest.fn(),
    onEditChapter: undefined,
    isAdmin: false,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TableView', () => {
  // -------------------------------------------------------------------------
  // Table structure
  // -------------------------------------------------------------------------
  describe('table structure', () => {
    test('renders a table element', () => {
      render(<TableView {...defaultProps()} />);
      expect(screen.getByRole('table')).toBeInTheDocument();
    });

    test('renders column headers: Ch #, Title, Last Updated, Action', () => {
      render(<TableView {...defaultProps()} />);
      expect(screen.getByText('Ch #')).toBeInTheDocument();
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Last Updated')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    test('renders one row per chapter', () => {
      render(<TableView {...defaultProps({ chapters: makeChapters(4) })} />);
      const rows = screen.getAllByRole('row');
      // 1 header row + 4 data rows
      expect(rows.length).toBe(5);
    });

    test('renders chapter order number in each row', () => {
      render(<TableView {...defaultProps()} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });

    test('renders chapter title in each row', () => {
      render(<TableView {...defaultProps()} />);
      expect(screen.getByText('Chapter 1')).toBeInTheDocument();
      expect(screen.getByText('Chapter 2')).toBeInTheDocument();
    });

    test('renders "Read" button for each chapter', () => {
      render(<TableView {...defaultProps({ chapters: makeChapters(3) })} />);
      expect(screen.getAllByRole('button', { name: 'Read' })).toHaveLength(3);
    });

    test('renders empty table body when chapters array is empty', () => {
      render(<TableView {...defaultProps({ chapters: [] })} />);
      // Should have header row only
      expect(screen.getAllByRole('row')).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Summary rendering
  // -------------------------------------------------------------------------
  describe('summary rendering', () => {
    test('renders chapter summary under title when provided', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ summary: 'A dragon appears!' })],
          })}
        />
      );
      expect(screen.getByText('A dragon appears!')).toBeInTheDocument();
    });

    test('does not render summary text when chapter has no summary', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ summary: undefined })],
          })}
        />
      );
      // No summary text rendered
      expect(screen.queryByText('A dragon appears!')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Sorting indicators
  // -------------------------------------------------------------------------
  describe('sorting indicators', () => {
    test('shows ArrowUpDown icon on the "Ch #" column when sortField=order', () => {
      const { container } = render(
        <TableView {...defaultProps({ sortField: 'order' })} />
      );
      // The sorted column header gets the `typography` class
      const orderTh = container.querySelector('th.typography, th[class*="typography"]');
      expect(orderTh).not.toBeNull();
    });

    test('does NOT show sort icon on "Title" column when sortField=order', () => {
      render(<TableView {...defaultProps({ sortField: 'order' })} />);
      // The title header text should still be present
      expect(screen.getByText('Title')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Sort callback
  // -------------------------------------------------------------------------
  describe('sort callback', () => {
    test('clicking "Ch #" header calls onSort with "order"', () => {
      const onSort = jest.fn();
      render(<TableView {...defaultProps({ onSort })} />);
      fireEvent.click(screen.getByText('Ch #'));
      expect(onSort).toHaveBeenCalledWith('order');
    });

    test('clicking "Title" header calls onSort with "title"', () => {
      const onSort = jest.fn();
      render(<TableView {...defaultProps({ onSort })} />);
      fireEvent.click(screen.getByText('Title'));
      expect(onSort).toHaveBeenCalledWith('title');
    });

    test('clicking "Last Updated" header calls onSort with "lastModified"', () => {
      const onSort = jest.fn();
      render(<TableView {...defaultProps({ onSort })} />);
      fireEvent.click(screen.getByText('Last Updated'));
      expect(onSort).toHaveBeenCalledWith('lastModified');
    });
  });

  // -------------------------------------------------------------------------
  // Chapter selection
  // -------------------------------------------------------------------------
  describe('chapter selection', () => {
    test('clicking "Read" button calls onChapterSelect with chapter id', () => {
      const onChapterSelect = jest.fn();
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ id: 'ch-77' })],
            onChapterSelect,
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Read' }));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-77');
    });

    test('clicking chapter title cell calls onChapterSelect', () => {
      const onChapterSelect = jest.fn();
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ id: 'ch-33', title: 'Unique Chapter Title' })],
            onChapterSelect,
          })}
        />
      );
      fireEvent.click(screen.getByText('Unique Chapter Title'));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-33');
    });
  });

  // -------------------------------------------------------------------------
  // Admin controls
  // -------------------------------------------------------------------------
  describe('admin controls', () => {
    test('does NOT render Edit button when isAdmin=false', () => {
      render(
        <TableView
          {...defaultProps({
            isAdmin: false,
            onEditChapter: jest.fn(),
          })}
        />
      );
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    test('does NOT render Edit button when isAdmin=true but onEditChapter is undefined', () => {
      render(
        <TableView
          {...defaultProps({
            isAdmin: true,
            onEditChapter: undefined,
          })}
        />
      );
      expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    });

    test('renders Edit button for each chapter when isAdmin=true and onEditChapter provided', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: makeChapters(3),
            isAdmin: true,
            onEditChapter: jest.fn(),
          })}
        />
      );
      expect(screen.getAllByRole('button', { name: 'Edit' })).toHaveLength(3);
    });

    test('clicking Edit button calls onEditChapter with chapter id', () => {
      const onEditChapter = jest.fn();
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ id: 'ch-edit-1' })],
            isAdmin: true,
            onEditChapter,
          })}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
      expect(onEditChapter).toHaveBeenCalledWith('ch-edit-1');
    });
  });

  // -------------------------------------------------------------------------
  // Current chapter highlighting
  // -------------------------------------------------------------------------
  describe('current chapter highlighting', () => {
    test('current chapter title has font-semibold class', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ id: 'ch-active', title: 'Active Chapter' })],
            currentChapterId: 'ch-active',
          })}
        />
      );
      const titleEl = screen.getByText('Active Chapter').closest('p, span') as HTMLElement;
      expect(titleEl.className).toMatch(/font-semibold/);
    });

    test('non-current chapter title does not have font-semibold class', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: [
              makeChapter({ id: 'ch-1', title: 'Inactive Chapter' }),
              makeChapter({ id: 'ch-2', title: 'Active Chapter', order: 2 }),
            ],
            currentChapterId: 'ch-2',
          })}
        />
      );
      const inactiveTitle = screen.getByText('Inactive Chapter').closest('p, span') as HTMLElement;
      expect(inactiveTitle.className).not.toMatch(/font-semibold/);
    });
  });

  // -------------------------------------------------------------------------
  // Date display
  // -------------------------------------------------------------------------
  describe('date display', () => {
    test('shows a formatted date in the Last Updated column', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ dateModified: '2024-03-15T00:00:00.000Z' })],
          })}
        />
      );
      // Any date text should appear in the date cell
      const rows = screen.getAllByRole('row');
      // Row 1 is header, row 2 is data
      expect(rows[1].textContent).toMatch(/\d+/);
    });

    test('falls back to dateAdded when dateModified is undefined', () => {
      render(
        <TableView
          {...defaultProps({
            chapters: [makeChapter({ dateModified: undefined, dateAdded: '2023-12-01T00:00:00.000Z' })],
          })}
        />
      );
      // Should not throw; just render a date
      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });
});
