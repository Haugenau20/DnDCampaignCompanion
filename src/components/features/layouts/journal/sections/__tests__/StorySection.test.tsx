// src/components/features/layouts/journal/sections/__tests__/StorySection.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import StorySection from '../StorySection';
import { Chapter } from '../../../../../../types/story';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

// Mock lucide-react to avoid SVG rendering issues
jest.mock('lucide-react', () => ({
  BookOpen: () => <svg data-testid="icon-bookopen" />,
  Bookmark: () => <svg data-testid="icon-bookmark" />,
}));

// Mock the Button core component (it's a child; we test StorySection's behaviour)
jest.mock('../../../../../core/Button', () => ({
  __esModule: true,
  default: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

const { useNavigation } = require('../../../../../../context/NavigationContext');
const mockNavigateToPage = jest.fn();

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
const BASE_CHAPTER: Chapter = {
  id: 'ch-1',
  title: 'The Beginning',
  content: 'It all started in a tavern.',
  order: 1,
  createdBy: 'user-1',
  createdByUsername: 'user1',
  dateAdded: '2024-01-01',
};

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    ...BASE_CHAPTER,
    id: `ch-${Math.random().toString(36).slice(2)}`,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StorySection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------
  describe('section heading', () => {
    it('renders "The Story So Far" heading', () => {
      render(<StorySection chapters={[]} loading={false} />);
      expect(screen.getByText('The Story So Far')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders loading skeleton when loading=true', () => {
      const { container } = render(<StorySection chapters={[]} loading={true} />);
      const pulse = container.querySelector('.animate-pulse');
      expect(pulse).toBeInTheDocument();
    });

    it('does not render chapter content while loading', () => {
      const chapters = [makeChapter({ title: 'Hidden Chapter' })];
      render(<StorySection chapters={chapters} loading={true} />);
      expect(screen.queryByText('Hidden Chapter')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "Your story has yet to begin..." when chapters list is empty', () => {
      render(<StorySection chapters={[]} loading={false} />);
      expect(screen.getByText('Your story has yet to begin...')).toBeInTheDocument();
    });

    it('prompts user to add chapters when empty', () => {
      render(<StorySection chapters={[]} loading={false} />);
      expect(screen.getByText(/Add chapters to track/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Latest chapter preview
  // -------------------------------------------------------------------------
  describe('latest chapter preview', () => {
    it('renders the latest chapter title', () => {
      const chapters = [makeChapter({ title: 'The Final Battle', order: 1 })];
      render(<StorySection chapters={chapters} loading={false} />);
      expect(screen.getByText('The Final Battle')).toBeInTheDocument();
    });

    it('shows "Chapter N:" prefix when chapter has an order number', () => {
      const chapters = [makeChapter({ title: 'Revelations', order: 3 })];
      render(<StorySection chapters={chapters} loading={false} />);
      expect(screen.getByText(/Chapter 3:/)).toBeInTheDocument();
    });

    it('does not show "Chapter N:" prefix when chapter has no order', () => {
      const chapters = [makeChapter({ title: 'Prologue', order: undefined as any })];
      render(<StorySection chapters={chapters} loading={false} />);
      expect(screen.queryByText(/Chapter \d+:/)).not.toBeInTheDocument();
    });

    it('renders the chapter summary when provided', () => {
      const chapters = [makeChapter({ summary: 'Heroes defeat the villain.' })];
      render(<StorySection chapters={chapters} loading={false} />);
      expect(screen.getByText('Heroes defeat the villain.')).toBeInTheDocument();
    });

    it('renders truncated content when no summary but content exists', () => {
      const longContent = 'A'.repeat(250);
      const chapters = [makeChapter({ summary: undefined, content: longContent })];
      render(<StorySection chapters={chapters} loading={false} />);
      // Component shows content.substring(0,200)...
      expect(screen.getByText(/A{200}\.\.\./)).toBeInTheDocument();
    });

    it('renders the dateModified when provided', () => {
      const chapters = [makeChapter({ dateModified: '2024-06-15' })];
      render(<StorySection chapters={chapters} loading={false} />);
      // toLocaleDateString varies by locale; check the date div is rendered
      const dateDiv = screen.getByText(new Date('2024-06-15').toLocaleDateString());
      expect(dateDiv).toBeInTheDocument();
    });

    it('does not render dateModified when absent', () => {
      const chapters = [makeChapter({ dateModified: undefined })];
      render(<StorySection chapters={chapters} loading={false} />);
      // The date div is empty — no visible date text
      // Confirm no date string appears
      const typographyDivs = document.querySelectorAll('.typography-secondary');
      typographyDivs.forEach(div => {
        expect(div.textContent?.trim()).toBe('');
      });
    });

    it('latest chapter is the last in sorted order (highest order number)', () => {
      const chapters = [
        makeChapter({ title: 'Chapter One', order: 1 }),
        makeChapter({ title: 'Chapter Three', order: 3 }),
        makeChapter({ title: 'Chapter Two', order: 2 }),
      ];
      render(<StorySection chapters={chapters} loading={false} />);
      // Latest chapter (order 3) should be shown in the preview (h4 heading)
      const previewTitle = screen.getByRole('heading', { level: 4 });
      expect(previewTitle.textContent).toContain('Chapter Three');
    });
  });

  // -------------------------------------------------------------------------
  // Previous chapters list
  // -------------------------------------------------------------------------
  describe('previous chapters list', () => {
    it('shows "No previous chapters" when there is only one chapter', () => {
      const chapters = [makeChapter({ title: 'Only Chapter' })];
      render(<StorySection chapters={chapters} loading={false} />);
      expect(screen.getByText('No previous chapters')).toBeInTheDocument();
    });

    it('renders previous chapters in the list when there are multiple', () => {
      const chapters = [
        makeChapter({ title: 'First Chapter', order: 1 }),
        makeChapter({ title: 'Second Chapter', order: 2 }),
        makeChapter({ title: 'Third Chapter', order: 3 }),
      ];
      render(<StorySection chapters={chapters} loading={false} />);
      // Previous chapters list includes all except the latest (Third)
      expect(screen.getByText('First Chapter')).toBeInTheDocument();
      expect(screen.getByText('Second Chapter')).toBeInTheDocument();
    });

    it('does not show the latest chapter in the previous list', () => {
      const chapters = [
        makeChapter({ title: 'First Chapter', order: 1 }),
        makeChapter({ title: 'Latest Chapter', order: 2 }),
      ];
      render(<StorySection chapters={chapters} loading={false} />);
      // Latest Chapter should appear once (in preview) not in previous list
      const els = screen.getAllByText('Latest Chapter');
      // Only one instance — in the h4 preview
      expect(els).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('click navigation', () => {
    it('calls navigateToPage for the latest chapter when its title is clicked', () => {
      const chapter = makeChapter({ id: 'ch-latest', title: 'Epic Finale', order: 1 });
      render(<StorySection chapters={[chapter]} loading={false} />);

      // The latest chapter title is in an h4 with onClick
      const h4 = screen.getByRole('heading', { level: 4 });
      fireEvent.click(h4);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/ch-latest');
    });

    it('calls navigateToPage for a previous chapter when its list item is clicked', () => {
      const ch1 = makeChapter({ id: 'ch-prev', title: 'Chapter One', order: 1 });
      const ch2 = makeChapter({ id: 'ch-last', title: 'Chapter Two', order: 2 });
      render(<StorySection chapters={[ch1, ch2]} loading={false} />);

      const prevItem = screen.getByText('Chapter One').closest('li');
      expect(prevItem).not.toBeNull();
      fireEvent.click(prevItem!);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/ch-prev');
    });

    it('navigates to /story/chapters when "View All Chapters" button is clicked', () => {
      const chapters = [makeChapter({ title: 'Some Chapter' })];
      render(<StorySection chapters={chapters} loading={false} />);

      const viewAllBtn = screen.getByRole('button', { name: /View All Chapters/i });
      fireEvent.click(viewAllBtn);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters');
    });
  });
});
