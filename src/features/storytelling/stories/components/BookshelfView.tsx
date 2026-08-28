// src/features/storytelling/stories/components/BookshelfView.tsx
import React, { useMemo } from 'react';
import Typography from 'core/components/Typography';
import clsx from 'clsx';
import {
  ChapterWithProgress,
  ChapterReadState,
  groupChaptersByTens,
} from 'features/storytelling/chapters/utils/chapter-progress';

/**
 * Props shared by both chapter views (this component and `ChapterList`). See
 * the fuller note on `ChapterViewProps` in `ChapterList.tsx` — both mirror
 * the page's contract exactly so either view can be swapped in without the
 * page changing what it passes down.
 *
 * `onEditChapter` / `isAdmin` round-trip through this component's props for
 * that same reason, but the shelf itself has no per-spine edit affordance —
 * there isn't room on a book spine for a second control, and admins can
 * still edit from `ChapterList`. They are intentionally unused here.
 */
export interface ChapterViewProps {
  items: ChapterWithProgress[];
  onChapterSelect: (chapterId: string) => void;
  onEditChapter?: (chapterId: string) => void;
  isAdmin?: boolean;
}

/** Spine height class per read state — "reading" stands slightly taller. */
const SPINE_HEIGHT: Record<ChapterReadState, string> = {
  read: 'h-36',
  reading: 'h-40',
  unread: 'h-36',
};

/**
 * Spine fill per read state. Read state is the *only* thing a spine encodes
 * now — no more per-chapter colour/height rotation that encoded nothing
 * (previously `(order + title.length) % 11` for colour, content length for
 * height). Read = solid fill; reading = accent fill with a ring; unread =
 * pale with a dashed outline, so an untouched chapter reads as "empty slot"
 * rather than just another book.
 */
const SPINE_FILL: Record<ChapterReadState, string> = {
  read: 'bg-status-completed',
  reading: 'bg-status-active border-2 border-accent',
  unread: 'bg-secondary border-2 border-dashed border-card',
};

/** Spine text colour — white reads on the two filled states, muted on the pale unread one. */
const SPINE_TEXT_COLOR: Record<ChapterReadState, 'white' | 'secondary'> = {
  read: 'white',
  reading: 'white',
  unread: 'secondary',
};

/**
 * A single book spine. Titles are readable without hovering — chapter number
 * and title run down the spine via `writing-mode: vertical-rl` — and the
 * whole spine is a real `<button>` so the shelf is keyboard-navigable.
 */
const Spine: React.FC<{
  item: ChapterWithProgress;
  onSelect: (chapterId: string) => void;
}> = ({ item, onSelect }) => {
  const { chapter, state } = item;

  return (
    <button
      type="button"
      onClick={() => onSelect(chapter.id)}
      aria-label={`Chapter ${chapter.order}: ${chapter.title} — ${state}`}
      className={clsx(
        'w-10 shrink-0 rounded-t-sm transition-transform hover:-translate-y-1',
        // items-START, not items-end. With `writing-mode: vertical-rl` the label
        // runs top-to-bottom and grows past the spine on longer titles; aligning
        // to the end pushed that overflow out of the TOP, so "1. A Long-expected
        // Party" rendered as "ong-expected Party" — losing the chapter number,
        // which is the one part of the label that identifies the spine. Starting
        // at the top clips the tail of the title instead, which is recoverable
        // from context and from the aria-label.
        'flex items-start justify-center overflow-hidden py-2',
        SPINE_HEIGHT[state],
        SPINE_FILL[state]
      )}
    >
      <Typography
        as="span"
        variant="caption"
        color={SPINE_TEXT_COLOR[state]}
        className="whitespace-nowrap"
        style={{ writingMode: 'vertical-rl' }}
      >
        {chapter.order}. {chapter.title}
      </Typography>
    </button>
  );
};

/** A single legend entry: a swatch matching a spine state, plus its label. */
const LegendItem: React.FC<{ swatchClassName: string; label: string }> = ({
  swatchClassName,
  label,
}) => (
  <div className="flex items-center gap-2">
    <span
      className={clsx('inline-block w-4 h-4 rounded-sm shrink-0', swatchClassName)}
      aria-hidden="true"
    />
    <Typography variant="body-sm" color="secondary">{label}</Typography>
  </div>
);

/** Legend explaining the shelf's only encoding: read state. */
const Legend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t card-border bg-secondary">
    <LegendItem swatchClassName={SPINE_FILL.read} label="Read" />
    <LegendItem swatchClassName={SPINE_FILL.reading} label="Reading now" />
    <LegendItem swatchClassName={SPINE_FILL.unread} label="Unread" />
  </div>
);

/**
 * A shelf of chapter spines, grouped by tens. Spines are left-aligned and
 * wrap onto further rows instead of centring a fixed-width block inside a
 * full-width card, and every spine is the same size — finding a chapter
 * means reading titles, not hovering every spine on the shelf.
 */
const BookshelfView: React.FC<ChapterViewProps> = ({ items, onChapterSelect }) => {
  const groups = useMemo(() => groupChaptersByTens(items), [items]);

  return (
    <div className="rounded-lg overflow-hidden card">
      {groups.map((group) => (
        <div key={group.label} className="p-4">
          <Typography variant="h4" className="mb-4">{group.label}</Typography>

          <div className="flex flex-wrap items-end gap-3">
            {group.items.map((item) => (
              <Spine key={item.chapter.id} item={item} onSelect={onChapterSelect} />
            ))}
          </div>

          {/* Wooden shelf edge */}
          <div className="mt-2 h-3 rounded-sm bg-secondary border-t card-border" aria-hidden="true" />
        </div>
      ))}

      {groups.length > 0 && <Legend />}
    </div>
  );
};

export default BookshelfView;
