// src/features/storytelling/stories/components/BookshelfView.tsx
import React, { useMemo } from 'react';
import Typography from 'core/components/Typography';
import clsx from 'clsx';
import {
  ChapterWithProgress,
  ChapterReadState,
  groupChaptersByTens,
} from 'features/storytelling/chapters/utils/chapter-progress';
import { deriveBookAppearances } from 'features/storytelling/stories/utils/book-appearance';
import {
  BookRed,
  BookBlue,
  BookGreen,
  BookPurple,
  BookBrown,
  BookAged,
  BookOrnate,
  BookClasped,
  BookRibbed,
  BookJeweled,
  BookManuscript,
} from './books';

/**
 * Props shared by both chapter views (this component and `ChapterList`). See
 * the fuller note on `ChapterViewProps` in `ChapterList.tsx` — both mirror
 * the page's contract exactly so either view can be swapped in without the
 * page changing what it passes down.
 *
 * `onEditChapter` / `isAdmin` round-trip through this component's props for
 * that same reason, but the shelf itself has no per-book edit affordance —
 * there isn't room on a book spine for a second control, and admins can
 * still edit from `ChapterList`. They are intentionally unused here.
 */
export interface ChapterViewProps {
  items: ChapterWithProgress[];
  onChapterSelect: (chapterId: string) => void;
  onEditChapter?: (chapterId: string) => void;
  isAdmin?: boolean;
}

/** The illustrated spines a chapter can be drawn as. Order is load-bearing:
 *  `pickBookIndex` indexes into this array, so reordering it reassigns every
 *  chapter's book. Append, don't insert. */
const BOOK_COMPONENTS = [
  BookRed,
  BookBlue,
  BookGreen,
  BookPurple,
  BookBrown,
  BookAged,
  BookOrnate,
  BookClasped,
  BookRibbed,
  BookJeweled,
  BookManuscript,
];

/**
 * How read state is drawn — as a treatment applied *over* the book art, never
 * as a replacement for it.
 *
 * This is the whole correction to the flat-rectangle shelf that came before.
 * That version encoded read state by making every chapter an identical
 * coloured box, which bought at-a-glance progress at the cost of the shelf
 * being a shelf. State and identity were never competing for the same channel:
 * the illustration says *which chapter*, and these filters say *how far you
 * got*. Both survive.
 */
const STATE_TREATMENT: Record<ChapterReadState, string> = {
  // Finished: full colour, standing proud of the shelf.
  read: 'opacity-100',
  // In progress: full colour and lifted, so the eye lands here first.
  reading: 'opacity-100 -translate-y-2',
  // Untouched: drained of colour and pushed back, so it reads as a book you
  // have not opened rather than as a different kind of object.
  unread: 'opacity-45 grayscale',
};

/** A single book on the shelf. */
const Book: React.FC<{
  item: ChapterWithProgress;
  width: number;
  height: number;
  bookIndex: number;
  onSelect: (chapterId: string) => void;
}> = ({ item, width, height, bookIndex, onSelect }) => {
  const { chapter, state, isCurrent } = item;
  const BookComponent = BOOK_COMPONENTS[bookIndex] ?? BOOK_COMPONENTS[0];

  return (
    <button
      type="button"
      onClick={() => onSelect(chapter.id)}
      // The visible label is only the chapter number (see below), so the
      // accessible name has to carry the title and state that sighted readers
      // get from the illustration and the tooltip.
      aria-label={`Chapter ${chapter.order}: ${chapter.title} — ${state}`}
      title={`Chapter ${chapter.order}: ${chapter.title}`}
      aria-current={isCurrent ? 'page' : undefined}
      className="flex flex-col items-center shrink-0 group"
      style={{ width }}
    >
      <span
        className={clsx(
          'block w-full rounded-t-sm overflow-hidden shadow-md transition-all duration-200',
          'group-hover:-translate-y-2 group-hover:shadow-lg',
          STATE_TREATMENT[state],
          isCurrent && 'ring-2 ring-accent rounded-sm'
        )}
      >
        <BookComponent height={height} className="w-full block" />
      </span>

      {/* The chapter number, and only the number.
          A full title set down a ~40px spine cannot be read at any usable
          size — it clipped mid-word, losing the number, which is the one part
          that identifies the book. Titles belong to the list view, which is
          built for scanning them; the shelf is for seeing the shape of the
          book at a glance. The full title is still one hover (or one screen
          reader stop) away. */}
      <Typography
        variant="caption"
        color={state === 'unread' ? 'secondary' : undefined}
        className={clsx('mt-2', isCurrent && 'font-bold')}
      >
        {chapter.order}
      </Typography>
    </button>
  );
};

/** A legend entry: a miniature book carrying the same treatment as the shelf. */
const LegendItem: React.FC<{ treatment: string; label: string }> = ({ treatment, label }) => (
  <div className="flex items-center gap-2">
    {/* The book components take only height and className, so the swatch's
        width is set on this wrapper rather than passed down. */}
    <span
      className={clsx('block shrink-0 rounded-t-sm overflow-hidden', treatment)}
      style={{ width: 12 }}
      aria-hidden="true"
    >
      <BookBrown height={22} className="w-full block" />
    </span>
    <Typography variant="body-sm" color="secondary">{label}</Typography>
  </div>
);

/** Legend for the one thing the treatments encode: read state. */
const Legend: React.FC = () => (
  <div className="flex flex-wrap items-center gap-4 px-4 py-3 border-t card-border bg-secondary">
    <LegendItem treatment={STATE_TREATMENT.read} label="Read" />
    <LegendItem treatment="opacity-100 ring-2 ring-accent" label="Reading now" />
    <LegendItem treatment={STATE_TREATMENT.unread} label="Unread" />
  </div>
);

/**
 * A shelf of illustrated chapter spines, grouped by tens.
 *
 * The card is deliberately capped rather than full-bleed. Ten books of a
 * plausible spine width occupy roughly 600–700px; in a full-width card on a
 * wide screen that left every row a bit under half full, which read as
 * unfinished rather than as a shelf with room on it. Narrowing the shelf to
 * about a book rack's width fills the rows without inflating the books into
 * something that stops looking like a spine.
 */
const BookshelfView: React.FC<ChapterViewProps> = ({ items, onChapterSelect }) => {
  const groups = useMemo(() => groupChaptersByTens(items), [items]);
  const appearances = useMemo(
    () => deriveBookAppearances(items, BOOK_COMPONENTS.length),
    [items]
  );

  return (
    <div className="rounded-lg overflow-hidden card max-w-2xl mx-auto">
      {groups.map((group) => (
        <div key={group.label} className="p-4">
          <Typography variant="h4" className="mb-4">{group.label}</Typography>

          {/* The board is sized to the books rather than to the card, and the
              pair is centred together.
              Books vary in thickness, so a row can never be relied on to fill a
              fixed width exactly — and a board running out past the last book
              is what made the shelf read as half-empty rather than as a shelf
              with room on it. Hugging the books removes that signal entirely,
              and it degrades gracefully for a partial final group of two. */}
          <div className="flex justify-center">
            <div className="inline-flex flex-col">
              {/* items-end so books of differing heights stand on the board
                  rather than floating from a shared top edge. */}
              <div className="flex items-end gap-2">
                {group.items.map((item) => {
                  const appearance = appearances.get(item.chapter.id);
                  return (
                    <Book
                      key={item.chapter.id}
                      item={item}
                      width={appearance?.width ?? 44}
                      height={appearance?.height ?? 140}
                      bookIndex={appearance?.bookIndex ?? 0}
                      onSelect={onChapterSelect}
                    />
                  );
                })}
              </div>

              {/* Wooden shelf edge */}
              <div className="mt-1 h-3 rounded-sm bg-secondary border-t card-border" aria-hidden="true" />
            </div>
          </div>
        </div>
      ))}

      {groups.length > 0 && <Legend />}
    </div>
  );
};

export default BookshelfView;
