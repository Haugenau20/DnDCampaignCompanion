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

/**
 * A chapter's row, by its accessible name. The number and title are separate
 * spans, so the visible text is not one string to `getByText`; the name still
 * reads "3. Chapter 3 Title".
 */
function row(name: string, scope: Pick<typeof screen, 'getByRole'> = screen): HTMLElement {
  return scope.getByRole('button', { name });
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
      expect(row('1. Chapter 1 Title')).toBeInTheDocument();
      expect(row('2. Chapter 2 Title')).toBeInTheDocument();
      expect(row('3. Chapter 3 Title')).toBeInTheDocument();
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
      fireEvent.click(row('3. Chapter 3 Title'));
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
      fireEvent.click(row('1. Chapter 1 Title'));
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
      expect(row('2. Chapter 2 Title')).toHaveAttribute('aria-current', 'page');
      expect(row('1. Chapter 1 Title')).not.toHaveAttribute('aria-current');
    });

    test('the current chapter row has nav-item-active, others have nav-item', () => {
      // Was `navigation-item-active` / `navigation-item` until D90, which built
      // `rail-item` to fix an active row measuring ~1.04:1 on the rail's own
      // surface (R32). D107 replaced both pairs with one `nav-item` that takes
      // its ink from whichever surface the container declares -- here `sunken`.
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
      const currentRow = row('2. Chapter 2 Title');
      expect(currentRow.className).toMatch(/nav-item-active/);

      const otherRow = row('3. Chapter 3 Title');
      expect(otherRow.className).toMatch(/nav-item/);
      expect(otherRow.className).not.toMatch(/nav-item-active/);
    });

    test('no row wears a chrome surface class', () => {
      // The regression guard for R32. The rail does not sit on the chrome, so
      // a chrome class here is a token used against the wrong ground -- the
      // exact defect the pair model exists to make unrepresentable.
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

      screen.getAllByRole('button').forEach((row) => {
        expect(row.className).not.toMatch(/navigation-item/);
      });
      // And the surface it does declare is the sunken one.
      const container = row('2. Chapter 2 Title').parentElement;
      expect(container?.className).toMatch(/nav-on-sunken/);
    });

    test('the rail sits on the sunken surface, not on card', () => {
      // Q17, settled as D90: A4 asks for `sunken`, and measurement showed the
      // rail and the reading column were rendering the *same* colour, so
      // `card` was expressing no hierarchy at all.
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

      const rail = screen.getByRole('complementary', { name: 'Chapter navigation' });
      expect(rail.className).toMatch(/card-subtle/);
      expect(rail.className).not.toMatch(/(^|\s)card($|\s)/);
    });

    test('the rail is part of the page, ruled off by one line rather than boxed', () => {
      // The reader page reads as one surface: the rail meets the reading
      // column at a single rule in the sunken border colour, not as a card
      // with a border all round.
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );

      const rail = screen.getByRole('complementary', { name: 'Chapter navigation' });
      expect(rail.className).toMatch(/(^|\s)border-r($|\s)/);
      expect(rail.className).toMatch(/sunken-divider/);
      expect(rail.className).not.toMatch(/sunken-border|rounded/);
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

    test('a read chapter is muted; an unread one is not', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      expect(row('1. Chapter 1 Title').className).toMatch(/typography-muted/);
      expect(row('3. Chapter 3 Title').className).not.toMatch(/typography-muted/);
    });

    test('the open chapter keeps full ink even when it has been read', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          currentChapterId="ch-1"
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      expect(row('1. Chapter 1 Title').className).not.toMatch(/typography-muted/);
    });

    test('shows how many chapters there are and how many are unread', () => {
      render(
        <ChapterRail
          items={threeMixedChapters()}
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );
      // One of the three fixture chapters is complete; "reading" is unread.
      expect(screen.getByText('3 recorded · 2 unread')).toBeInTheDocument();
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
      expect(screen.getByText('0 recorded · 0 unread')).toBeInTheDocument();
    });

    // The reader scrolls with the page now. `scrollIntoView` scrolls every
    // scrollable ancestor, the window included, so keeping the open chapter
    // in view that way would drag the page away from the reader's restored
    // position on every chapter change. Only the list's own box may move.
    test('keeps the open chapter in view by scrolling the list, not the page', () => {
      const scrollIntoView = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoView;
      const items = deriveChapterProgress(
        Array.from({ length: 30 }, (_, i) => makeChapter(i + 1)),
        makeProgress({})
      );
      const { rerender } = render(
        <ChapterRail
          items={items}
          currentChapterId="ch-1"
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );

      // jsdom does no layout: rows 40px apart in a 400px window onto the list.
      const list = row('1. Chapter 1 Title').parentElement as HTMLElement;
      Object.defineProperty(list, 'clientHeight', { configurable: true, value: 400 });
      list.querySelectorAll('button').forEach((button, i) => {
        Object.defineProperty(button, 'offsetTop', { configurable: true, value: i * 40 });
        Object.defineProperty(button, 'offsetHeight', { configurable: true, value: 40 });
      });

      rerender(
        <ChapterRail
          items={items}
          currentChapterId="ch-25"
          onChapterSelect={jest.fn()}
          onBackToIndex={jest.fn()}
          isOpen={false}
          onClose={jest.fn()}
        />
      );

      // Row 25 spans 960-1000: the list scrolls just far enough to show it.
      expect(list.scrollTop).toBe(600);
      expect(scrollIntoView).not.toHaveBeenCalled();
      delete (Element.prototype as Partial<Element>).scrollIntoView;
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

    // A11Y-004: the drawer covered the reader but left focus on the trigger
    // behind its scrim, ignored Escape, and had no modal boundary.
    describe('keyboard', () => {
      /** A trigger outside the rail, focused before the drawer opens. */
      function renderWithTrigger(onClose = jest.fn()) {
        const Harness: React.FC<{ open: boolean }> = ({ open }) => (
          <>
            <button>Chapters</button>
            <ChapterRail
              items={threeMixedChapters()}
              currentChapterId="ch-2"
              onChapterSelect={jest.fn()}
              onBackToIndex={jest.fn()}
              isOpen={open}
              onClose={onClose}
            />
          </>
        );
        const view = render(<Harness open={false} />);
        screen.getByRole('button', { name: 'Chapters' }).focus();
        view.rerender(<Harness open />);
        return { ...view, onClose, close: () => view.rerender(<Harness open={false} />) };
      }

      test('is a named modal dialog that takes focus as it opens', () => {
        renderWithTrigger();
        const drawer = screen.getByRole('dialog', { name: 'Chapters' });
        expect(drawer).toHaveAttribute('aria-modal', 'true');
        // Focus lands on the open chapter, where the reader left off.
        expect(within(drawer).getByRole('button', { name: '2. Chapter 2 Title' })).toHaveFocus();
      });

      test('closes on Escape', () => {
        const { onClose } = renderWithTrigger();
        fireEvent.keyDown(screen.getByRole('dialog', { name: 'Chapters' }), { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
      });

      test('keeps Tab inside the drawer', () => {
        renderWithTrigger();
        const drawer = screen.getByRole('dialog', { name: 'Chapters' });
        const stops = within(drawer).getAllByRole('button');
        stops[stops.length - 1].focus();

        fireEvent.keyDown(stops[stops.length - 1], { key: 'Tab' });

        expect(stops[0]).toHaveFocus();
      });

      test('hands focus back to the trigger when it closes', () => {
        const { close } = renderWithTrigger();
        close();
        expect(screen.getByRole('button', { name: 'Chapters' })).toHaveFocus();
      });
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
      fireEvent.click(row('3. Chapter 3 Title', within(panel)));
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
