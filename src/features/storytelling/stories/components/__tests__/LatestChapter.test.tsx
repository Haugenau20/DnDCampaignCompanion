// src/features/storytelling/stories/components/__tests__/LatestChapter.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import LatestChapter from '../LatestChapter';

// ---------------------------------------------------------------------------
// Mock NavigationContext
// ---------------------------------------------------------------------------

const mockNavigateToPage = jest.fn();

jest.mock('context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('context/NavigationContext');

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

interface ChapterStub {
  id: string;
  title: string;
  content: string;
  order: number;
  lastModified: string;
  summary?: string;
}

function makeChapter(overrides: Partial<ChapterStub> = {}): ChapterStub {
  return {
    id: 'ch-1',
    title: 'The Dragon Awakens',
    content: 'The dragon stirred from its ancient slumber, shaking the mountain...',
    order: 3,
    lastModified: '2024-06-15T12:00:00.000Z',
    summary: 'The group encounters a sleeping dragon.',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LatestChapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('renders "Latest Chapter" section header', () => {
      render(<LatestChapter chapter={makeChapter()} />);
      expect(screen.getByText('Latest Chapter')).toBeInTheDocument();
    });

    test('renders chapter order and title', () => {
      render(<LatestChapter chapter={makeChapter({ order: 3, title: 'The Dragon Awakens' })} />);
      expect(screen.getByText('Chapter 3: The Dragon Awakens')).toBeInTheDocument();
    });

    test('renders chapter content preview', () => {
      render(<LatestChapter chapter={makeChapter()} />);
      expect(
        screen.getByText('The dragon stirred from its ancient slumber, shaking the mountain...')
      ).toBeInTheDocument();
    });

    test('renders chapter summary when provided', () => {
      render(
        <LatestChapter
          chapter={makeChapter({ summary: 'The group encounters a sleeping dragon.' })}
        />
      );
      expect(
        screen.getByText('The group encounters a sleeping dragon.')
      ).toBeInTheDocument();
    });

    test('does NOT render summary section when summary is undefined', () => {
      render(<LatestChapter chapter={makeChapter({ summary: undefined })} />);
      // Without summary the specific text does not appear
      expect(
        screen.queryByText('The group encounters a sleeping dragon.')
      ).not.toBeInTheDocument();
    });

    test('renders formatted last-modified date', () => {
      // '2024-06-15T12:00:00.000Z' → locale date string in en-UK format
      render(<LatestChapter chapter={makeChapter({ lastModified: '2024-06-15T12:00:00.000Z' })} />);
      // The component uses toLocaleDateString('en-uk', ...) — output depends on locale
      // We just verify a date-like string is present (contains '2024' or digits)
      const dateText = screen.getByText(/\d{2}\/\d{2}\/\d{4}/);
      expect(dateText).toBeInTheDocument();
    });

    test('renders "Continue Reading" button', () => {
      render(<LatestChapter chapter={makeChapter()} />);
      expect(screen.getByRole('button', { name: /Continue Reading/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------
  describe('navigation', () => {
    test('clicking "Continue Reading" navigates to chapter detail page', () => {
      render(<LatestChapter chapter={makeChapter({ id: 'ch-42' })} />);
      fireEvent.click(screen.getByRole('button', { name: /Continue Reading/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/ch-42');
    });

    test('navigates to the correct chapter id when multiple renders use different ids', () => {
      const { rerender } = render(<LatestChapter chapter={makeChapter({ id: 'ch-1' })} />);
      fireEvent.click(screen.getByRole('button', { name: /Continue Reading/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/ch-1');

      jest.clearAllMocks();
      rerender(<LatestChapter chapter={makeChapter({ id: 'ch-99' })} />);
      fireEvent.click(screen.getByRole('button', { name: /Continue Reading/i }));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/story/chapters/ch-99');
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe('edge cases', () => {
    test('renders chapter order 1 correctly', () => {
      render(<LatestChapter chapter={makeChapter({ order: 1, title: 'Prologue' })} />);
      expect(screen.getByText('Chapter 1: Prologue')).toBeInTheDocument();
    });

    test('renders without summary (undefined) without crashing', () => {
      expect(() =>
        render(<LatestChapter chapter={makeChapter({ summary: undefined })} />)
      ).not.toThrow();
    });
  });
});
