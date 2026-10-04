// src/features/storytelling/stories/components/ChapterRail.tsx
import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import { keepTabInside } from 'core/utils/focus-trap';
import { ChapterWithProgress } from 'features/storytelling/chapters/utils/chapter-progress';

/**
 * The drawer's panel: a modal surface over the reader, so it behaves like one
 * (A11Y-004). Mounted only while the drawer is open, so mounting is opening.
 *
 * It takes focus as it opens -- on the open chapter's row, where the reader
 * left off, or else on itself -- keeps Tab inside, closes on Escape, and
 * hands focus back to whatever had it (the Chapters button) when it closes.
 * Before, focus stayed on that button behind the scrim and the next Tab went
 * into the reader the drawer covers.
 */
const ChapterDrawerPanel: React.FC<{ onClose: () => void; children: React.ReactNode }> = ({
  onClose,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  // Read while rendering the opening, before any effect can move focus.
  const [opener] = React.useState(() => document.activeElement as HTMLElement | null);

  useEffect(() => {
    const panel = panelRef.current;
    const current = panel?.querySelector<HTMLElement>('[aria-current="page"]');
    (current ?? panel)?.focus();
    return () => {
      // The opener can be gone; focusing a detached node sends focus to <body>.
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [opener]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    keepTabInside(event, panelRef.current);
  };

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label="Chapters"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="fixed top-0 left-0 h-full w-80 max-w-[85vw] shadow-lg z-50 focus:outline-none"
    >
      <div className="h-full flex flex-col card-subtle border-r sunken-divider">{children}</div>
    </div>
  );
};

/**
 * Props for {@link ChapterRail}.
 */
export interface ChapterRailProps {
  /** Every chapter, already sorted and with read state derived, from `deriveChapterProgress`. */
  items: ChapterWithProgress[];
  /** The chapter currently open in the reader. */
  currentChapterId?: string;
  onChapterSelect: (chapterId: string) => void;
  /** Navigates back to the chapters index at /story. */
  onBackToIndex: () => void;
  /** Drawer open state. Only meaningful below the `lg` breakpoint. */
  isOpen: boolean;
  onClose: () => void;
}

/** Props for the row list shared by both presentations. */
interface ChapterRailListProps {
  items: ChapterWithProgress[];
  currentChapterId?: string;
  onSelect: (chapterId: string) => void;
}

/**
 * The chapter rows themselves, in their own scroll box — rendered once here
 * and reused by both the persistent rail and the drawer, so the two
 * presentations can't drift into two different row designs (CLAUDE.md calls
 * this DRY out explicitly).
 *
 * Owns its own refs rather than taking them as props, because the persistent
 * rail and the drawer are two independent mounts of this component: a ref
 * shared between them would only ever resolve to whichever copy mounted most
 * recently.
 */
const ChapterRailList: React.FC<ChapterRailListProps> = ({
  items,
  currentChapterId,
  onSelect,
}) => {
  const listRef = useRef<HTMLDivElement | null>(null);
  const currentRowRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current chapter in view as it changes — without this, opening
  // chapter 30 of 39 leaves the rail scrolled to chapter 1. This moves the
  // list's own scroll box and nothing else. `scrollIntoView` did this until
  // the reader started scrolling with the page: it scrolls every ancestor
  // that can scroll, the window included, and would fight the reader's
  // restored position on every chapter change.
  useEffect(() => {
    const list = listRef.current;
    const row = currentRowRef.current;
    if (!list || !row) return;

    const rowTop = row.offsetTop;
    const rowBottom = rowTop + row.offsetHeight;
    if (rowTop < list.scrollTop) {
      list.scrollTop = rowTop;
    } else if (rowBottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = rowBottom - list.clientHeight;
    }
  }, [currentChapterId]);

  return (
    // `relative` makes this box the rows' offsetParent, which the effect
    // above measures against. overscroll-contain: reaching the end of the
    // list must not hand the gesture on to the page behind it.
    <div
      ref={listRef}
      className="relative flex-1 min-h-0 overflow-y-auto overscroll-contain pb-6 nav-on-sunken"
    >
      {items.map((item) => {
        const { chapter, state } = item;
        const isCurrentChapter = chapter.id === currentChapterId;

        return (
          <button
            key={chapter.id}
            ref={isCurrentChapter ? currentRowRef : undefined}
            type="button"
            onClick={() => onSelect(chapter.id)}
            aria-current={isCurrentChapter ? 'page' : undefined}
            className={clsx(
              'w-full flex items-baseline gap-3 text-left px-6 py-2.5 transition-colors',
              'nav-item',
              isCurrentChapter && 'nav-item-active',
              // Read rows fade back so unread and in-progress rows draw the
              // eye; the current row keeps full ink whatever its state.
              state === 'read' && !isCurrentChapter && 'typography-muted'
            )}
          >
            {/* The number sits in its own column so titles align. It is hidden
                from assistive tech, and the title carries it as hidden text
                instead, so the row is announced as "4. Title". */}
            <span
              aria-hidden="true"
              className={clsx(
                'w-6 shrink-0 text-right text-sm tabular-nums',
                isCurrentChapter && 'accent'
              )}
            >
              {chapter.order}
            </span>
            <span className="chapter-rail-title flex-1 min-w-0">
              <span className="sr-only">{chapter.order}. </span>
              {chapter.title}
            </span>
          </button>
        );
      })}
    </div>
  );
};

/** Props for the header shared by both presentations. */
interface ChapterRailHeaderProps {
  unreadCount: number;
  total: number;
  onBackToIndex: () => void;
  /** Present only in the drawer presentation — the persistent rail has nothing to close. */
  onClose?: () => void;
}

/**
 * The small-caps "Chapters" heading, which is also the way back to the
 * /story index, and a "14 recorded · 2 unread" line under it. `onClose` is
 * only passed by the drawer, which is how this header decides whether to
 * render the close button.
 */
const ChapterRailHeader: React.FC<ChapterRailHeaderProps> = ({
  unreadCount,
  total,
  onBackToIndex,
  onClose,
}) => (
  <div className="px-6 pt-8 pb-4 shrink-0">
    <div className="flex items-center justify-between gap-2">
      {/* Named "All chapters": a control called just "Chapters" would not say
          that it leaves the reader. The visible word is inside the name, so
          speech input still finds it. */}
      <button
        type="button"
        onClick={onBackToIndex}
        aria-label="All chapters"
        className="text-xs font-semibold uppercase tracking-wider typography-secondary hover:underline"
      >
        Chapters
      </button>
      {onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="p-1"
          aria-label="Close chapter list"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
    <Typography variant="body-sm" color="secondary" className="mt-1">
      {total} recorded · {unreadCount} unread
    </Typography>
  </div>
);

/**
 * Chapter navigation for the reader page.
 *
 * On `lg` screens and up this is a column down the left edge of the page, on
 * the sunken surface with a single rule between it and the reading column —
 * part of the page rather than a card set on top of it. The column runs the
 * full height of the page; its contents stick to the top of the viewport and
 * scroll on their own only when the list is longer than the screen.
 * `isOpen`/`onClose` are ignored by this presentation.
 *
 * Below `lg` there's no room for a permanent column, so the identical row
 * list (via `ChapterRailList`) becomes a left-side drawer instead, shown only
 * while `isOpen` is true, with a click-to-dismiss backdrop.
 *
 * The drawer is mounted only while open, rather than always-mounted and
 * translated off-screen. That trades away an exit slide animation, but the
 * persistent column is a second, always-mounted copy of the same list, and
 * Tailwind's `lg:`-prefixed visibility classes have no effect in jsdom, so an
 * always-mounted drawer would leave two live copies of every chapter row in
 * the tree whenever `isOpen` is true — duplicate accessible names, duplicate
 * tab stops, and ambiguous queries in tests. Gating the mount on `isOpen`
 * keeps exactly one drawer copy in the DOM at a time.
 */
const ChapterRail: React.FC<ChapterRailProps> = ({
  items,
  currentChapterId,
  onChapterSelect,
  onBackToIndex,
  isOpen,
  onClose,
}) => {
  const unreadCount = items.filter((item) => item.state !== 'read').length;

  /** Drawer rows both navigate and dismiss the drawer; the persistent rail's rows only navigate. */
  const handleDrawerSelect = (chapterId: string) => {
    onChapterSelect(chapterId);
    onClose();
  };

  return (
    <>
      {/* Persistent column — lg and up. isOpen/onClose intentionally unused here. */}
      <aside
        className="hidden lg:block w-72 shrink-0 card-subtle border-r sunken-divider"
        aria-label="Chapter navigation"
      >
        <div className="sticky top-0 max-h-screen flex flex-col">
          <ChapterRailHeader unreadCount={unreadCount} total={items.length} onBackToIndex={onBackToIndex} />
          <ChapterRailList items={items} currentChapterId={currentChapterId} onSelect={onChapterSelect} />
        </div>
      </aside>

      {/* Drawer — below lg only, and only while open. See the component doc
          comment above for why the mount is gated rather than translated
          off-screen. */}
      {isOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 transition-opacity dialog-backdrop"
            onClick={onClose}
          />
          <ChapterDrawerPanel onClose={onClose}>
            <ChapterRailHeader
              unreadCount={unreadCount}
              total={items.length}
              onBackToIndex={onBackToIndex}
              onClose={onClose}
            />
            <ChapterRailList
              items={items}
              currentChapterId={currentChapterId}
              onSelect={handleDrawerSelect}
            />
          </ChapterDrawerPanel>
        </div>
      )}
    </>
  );
};

export default ChapterRail;
