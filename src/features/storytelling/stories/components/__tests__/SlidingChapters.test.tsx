// src/features/storytelling/stories/components/__tests__/SlidingChapters.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SlidingChapters from '../SlidingChapters';
import { Chapter } from 'features/storytelling/chapters/types';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeChapter(overrides: Partial<Chapter> = {}): Chapter {
  return {
    id: 'ch-1',
    title: 'The Beginning',
    content: 'Content here.',
    order: 1,
    createdBy: 'user-1',
    createdByUsername: 'Author',
    dateAdded: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeChapters(count: number): Chapter[] {
  return Array.from({ length: count }, (_, i) =>
    makeChapter({
      id: `ch-${i + 1}`,
      title: `Chapter ${i + 1} Title`,
      order: i + 1,
    })
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SlidingChapters', () => {
  // -------------------------------------------------------------------------
  // Panel visibility
  // -------------------------------------------------------------------------
  describe('panel visibility', () => {
    test('panel has -translate-x-full class when isOpen=false', () => {
      const { container } = render(
        <SlidingChapters
          chapters={makeChapters(3)}
          isOpen={false}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      const panel = container.querySelector('.fixed.top-0.left-0') as HTMLElement;
      expect(panel).not.toBeNull();
      expect(panel.className).toMatch(/-translate-x-full/);
    });

    test('panel has translate-x-0 class when isOpen=true', () => {
      const { container } = render(
        <SlidingChapters
          chapters={makeChapters(3)}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      const panel = container.querySelector('.fixed.top-0.left-0') as HTMLElement;
      expect(panel.className).toMatch(/translate-x-0/);
    });

    test('overlay is NOT rendered when isOpen=false', () => {
      const { container } = render(
        <SlidingChapters
          chapters={makeChapters(2)}
          isOpen={false}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      // Overlay has the z-40 class and dialog-backdrop
      expect(container.querySelector('.dialog-backdrop')).toBeNull();
    });

    test('overlay IS rendered when isOpen=true', () => {
      const { container } = render(
        <SlidingChapters
          chapters={makeChapters(2)}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      expect(container.querySelector('.dialog-backdrop')).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Chapter list rendering
  // -------------------------------------------------------------------------
  describe('chapter list rendering', () => {
    test('renders "Chapters" heading', () => {
      render(
        <SlidingChapters
          chapters={makeChapters(1)}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.getByText('Chapters')).toBeInTheDocument();
    });

    test('renders each chapter with its order and title', () => {
      render(
        <SlidingChapters
          chapters={makeChapters(3)}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.getByText('1. Chapter 1 Title')).toBeInTheDocument();
      expect(screen.getByText('2. Chapter 2 Title')).toBeInTheDocument();
      expect(screen.getByText('3. Chapter 3 Title')).toBeInTheDocument();
    });

    test('renders chapter summary when provided', () => {
      render(
        <SlidingChapters
          chapters={[makeChapter({ summary: 'A brief description' })]}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.getByText('A brief description')).toBeInTheDocument();
    });

    test('does NOT render summary text when chapter has no summary', () => {
      render(
        <SlidingChapters
          chapters={[makeChapter({ summary: undefined })]}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      expect(screen.queryByText('A brief description')).not.toBeInTheDocument();
    });

    test('renders empty chapter list without crashing', () => {
      expect(() =>
        render(
          <SlidingChapters
            chapters={[]}
            isOpen={true}
            onClose={jest.fn()}
            onChapterSelect={jest.fn()}
          />
        )
      ).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // Active chapter highlighting
  // -------------------------------------------------------------------------
  describe('active chapter highlighting', () => {
    test('active chapter button has navigation-item-active class', () => {
      render(
        <SlidingChapters
          chapters={makeChapters(3)}
          currentChapterId="ch-2"
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      const activeBtn = screen.getByText('2. Chapter 2 Title').closest('button') as HTMLElement;
      expect(activeBtn.className).toMatch(/navigation-item-active/);
    });

    test('inactive chapter buttons have navigation-item class (not active)', () => {
      render(
        <SlidingChapters
          chapters={makeChapters(3)}
          currentChapterId="ch-2"
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={jest.fn()}
        />
      );
      const inactiveBtn = screen.getByText('1. Chapter 1 Title').closest('button') as HTMLElement;
      expect(inactiveBtn.className).toMatch(/navigation-item/);
      expect(inactiveBtn.className).not.toMatch(/navigation-item-active/);
    });
  });

  // -------------------------------------------------------------------------
  // Chapter selection
  // -------------------------------------------------------------------------
  describe('chapter selection', () => {
    test('clicking a chapter calls onChapterSelect with its id', () => {
      const onChapterSelect = jest.fn();
      render(
        <SlidingChapters
          chapters={makeChapters(3)}
          isOpen={true}
          onClose={jest.fn()}
          onChapterSelect={onChapterSelect}
        />
      );
      fireEvent.click(screen.getByText('2. Chapter 2 Title'));
      expect(onChapterSelect).toHaveBeenCalledWith('ch-2');
    });

    test('clicking a chapter also calls onClose', () => {
      const onClose = jest.fn();
      render(
        <SlidingChapters
          chapters={makeChapters(3)}
          isOpen={true}
          onClose={onClose}
          onChapterSelect={jest.fn()}
        />
      );
      fireEvent.click(screen.getByText('1. Chapter 1 Title'));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('clicking a chapter calls both onChapterSelect AND onClose in sequence', () => {
      const calls: string[] = [];
      const onChapterSelect = jest.fn(() => calls.push('select'));
      const onClose = jest.fn(() => calls.push('close'));
      render(
        <SlidingChapters
          chapters={makeChapters(2)}
          isOpen={true}
          onClose={onClose}
          onChapterSelect={onChapterSelect}
        />
      );
      fireEvent.click(screen.getByText('1. Chapter 1 Title'));
      expect(calls).toEqual(['select', 'close']);
    });
  });

  // -------------------------------------------------------------------------
  // Close button
  // -------------------------------------------------------------------------
  describe('close button', () => {
    test('close button in header calls onClose', () => {
      const onClose = jest.fn();
      render(
        <SlidingChapters
          chapters={makeChapters(2)}
          isOpen={true}
          onClose={onClose}
          onChapterSelect={jest.fn()}
        />
      );
      // The close button contains an X icon — find by its position in header
      const closeBtn = screen
        .getAllByRole('button')
        .find((btn) => btn.querySelector('svg'));
      expect(closeBtn).toBeDefined();
      fireEvent.click(closeBtn!);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Overlay click
  // -------------------------------------------------------------------------
  describe('overlay click', () => {
    test('clicking the overlay calls onClose', () => {
      const onClose = jest.fn();
      const { container } = render(
        <SlidingChapters
          chapters={makeChapters(2)}
          isOpen={true}
          onClose={onClose}
          onChapterSelect={jest.fn()}
        />
      );
      const overlay = container.querySelector('.dialog-backdrop') as HTMLElement;
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
