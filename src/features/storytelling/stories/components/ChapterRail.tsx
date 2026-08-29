// src/features/storytelling/stories/components/ChapterRail.tsx
import React, { useEffect, useRef } from 'react';
import clsx from 'clsx';
import { Check, X } from 'lucide-react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import { ChapterWithProgress } from 'features/storytelling/chapters/utils/chapter-progress';

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
 * The chapter rows themselves — rendered once here and reused by both the
 * persistent rail and the drawer, so the two presentations can't drift into
 * two different row designs (CLAUDE.md calls this DRY out explicitly).
 *
 * Owns its own ref to the current row rather than taking one as a prop,
 * because the persistent rail and the drawer are two independent mounts of
 * this component: a ref shared between them would only ever resolve to
 * whichever copy mounted most recently.
 */
const ChapterRailList: React.FC<ChapterRailListProps> = ({
  items,
  currentChapterId,
  onSelect,
}) => {
  const currentRowRef = useRef<HTMLButtonElement | null>(null);

  // Keep the current chapter in view as it changes — without this, opening
  // chapter 30 of 39 leaves the rail scrolled to chapter 1. jsdom doesn't
  // implement scrollIntoView, so the call is optional-chained; without that
  // guard this effect throws in every test that renders the component.
  useEffect(() => {
    currentRowRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [currentChapterId]);

  return (
    <div className="space-y-1">
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
              'w-full flex items-center gap-2 text-left px-2 py-1.5 rounded-lg transition-colors',
              isCurrentChapter ? 'navigation-item-active' : 'navigation-item'
            )}
          >
            <Typography
              variant="body-sm"
              className={clsx(
                'flex-1 truncate',
                // Read rows fade back so unread/in-progress rows draw the eye,
                // mirroring ChapterList's promoted-row treatment; reading rows
                // get a quiet accent tint rather than a label, since a rail
                // row has no room for one.
                state === 'read' && !isCurrentChapter && 'typography-muted',
                state === 'reading' && !isCurrentChapter && 'accent'
              )}
            >
              {chapter.order}. {chapter.title}
            </Typography>
            {state === 'read' && (
              <Check className="w-3.5 h-3.5 text-success shrink-0" aria-hidden="true" />
            )}
          </button>
        );
      })}
    </div>
  );
};

/** Props for the header shared by both presentations. */
interface ChapterRailHeaderProps {
  readCount: number;
  total: number;
  onBackToIndex: () => void;
  /** Present only in the drawer presentation — the persistent rail has nothing to close. */
  onClose?: () => void;
}

/**
 * Heading, "N of M read" progress line, and the "All chapters" control back
 * to the /story index. `onClose` is only passed by the drawer, which is how
 * this header decides whether to render the close button.
 */
const ChapterRailHeader: React.FC<ChapterRailHeaderProps> = ({
  readCount,
  total,
  onBackToIndex,
  onClose,
}) => (
  <div className="p-3 border-b card-border shrink-0">
    <div className="flex items-center justify-between gap-2">
      <Typography variant="h4">Chapters</Typography>
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
      {readCount} of {total} read
    </Typography>
    <Button variant="ghost" size="sm" onClick={onBackToIndex} className="mt-2">
      All chapters
    </Button>
  </div>
);

/**
 * Persistent chapter navigation for the reader page.
 *
 * On `lg` screens and up this renders as an always-visible column down the
 * left side of the reader, so the reader can see where they are in the book
 * without opening anything — `isOpen`/`onClose` are ignored by this
 * presentation, matching the contract's note that they only matter below
 * `lg`. Below `lg` there's no room for a permanent column, so the identical
 * row list (via `ChapterRailList`) becomes a left-side drawer instead, shown
 * only while `isOpen` is true, with a click-to-dismiss backdrop.
 *
 * This replaces `SlidingChapters` (deleted in the same change that added this
 * file; see git history), which was a drawer and nothing else — the reader had
 * to open an overlay, covering the prose, just to see where they were.
 *
 * The drawer here is mounted only while open, rather than always-mounted and
 * translated off-screen the way `SlidingChapters` did it. That trades away an
 * exit slide animation, but it matters more here: unlike that component, this
 * one also renders a second, always-mounted copy of the same list (the
 * persistent rail). Tailwind's `lg:`-prefixed visibility classes have no
 * effect in jsdom, so an always-mounted drawer would leave two live copies of
 * every chapter row in the tree whenever `isOpen` is true — duplicate
 * accessible names, duplicate tab stops, and ambiguous queries in tests.
 * Gating the mount on `isOpen` keeps exactly one drawer copy in the DOM at a
 * time.
 */
const ChapterRail: React.FC<ChapterRailProps> = ({
  items,
  currentChapterId,
  onChapterSelect,
  onBackToIndex,
  isOpen,
  onClose,
}) => {
  const readCount = items.filter((item) => item.state === 'read').length;

  /** Drawer rows both navigate and dismiss the drawer; the persistent rail's rows only navigate. */
  const handleDrawerSelect = (chapterId: string) => {
    onChapterSelect(chapterId);
    onClose();
  };

  return (
    <>
      {/* Persistent column — lg and up. isOpen/onClose intentionally unused here. */}
      <aside
        className="hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen w-[236px] shrink-0 card card-border rounded-lg overflow-hidden"
        aria-label="Chapter navigation"
      >
        <ChapterRailHeader readCount={readCount} total={items.length} onBackToIndex={onBackToIndex} />
        <div className="flex-1 overflow-y-auto p-3 content">
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
          <div className="fixed top-0 left-0 h-full w-80 shadow-lg z-50">
            <div className="h-full flex flex-col card card-border">
              <ChapterRailHeader
                readCount={readCount}
                total={items.length}
                onBackToIndex={onBackToIndex}
                onClose={onClose}
              />
              <div className="flex-1 overflow-y-auto p-3 content">
                <ChapterRailList
                  items={items}
                  currentChapterId={currentChapterId}
                  onSelect={handleDrawerSelect}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChapterRail;
