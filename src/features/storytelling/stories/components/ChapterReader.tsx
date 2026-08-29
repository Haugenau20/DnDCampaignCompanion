// src/features/storytelling/stories/components/ChapterReader.tsx
import React, { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, Edit } from 'lucide-react';
import Typography from 'core/components/Typography';
import Card from 'core/components/Card';
import Button from 'core/components/Button';
import clsx from 'clsx';
import {
  scrollPercent,
  positionToScrollTop,
  isAtCompletion,
} from 'features/storytelling/chapters/utils/reading-position';

/**
 * How often a scroll position is allowed to reach `onProgressChange`, in
 * milliseconds. Every emission is a Firestore write, and a reader scrolls far
 * more often than that write needs to happen — this throttles to a
 * leading-edge-plus-trailing-edge cadence: the first scroll after a quiet
 * period reports immediately, further scrolls within the window collapse
 * into one trailing report at the end of it.
 */
const PROGRESS_THROTTLE_MS = 1500;

export interface ChapterReaderProps {
  /** Raw chapter body. May contain literal "\n" escape sequences as well as real newlines. */
  content: string;
  /** Display title, already numbered by the caller, e.g. "1. A Long-expected Party". */
  title: string;
  /** Stored scroll position as a percentage 0-100, restored on mount and on chapter change. */
  position?: number;
  /** This chapter's 1-based number, for the footer's "Chapter 1 of 39". */
  chapterNumber: number;
  /** Total chapters in the story. */
  chapterCount: number;
  /** Title of the next chapter, so the Next button can name where it goes. */
  nextChapterTitle?: string;
  onNextChapter?: () => void;
  onPreviousChapter?: () => void;
  hasNextChapter?: boolean;
  hasPreviousChapter?: boolean;
  /**
   * Reports reading progress for persistence. See the emission contract below —
   * getting this wrong reintroduces a fixed bug.
   */
  onProgressChange?: (percent: number, isComplete?: boolean) => void;
  /** When provided, renders the Edit affordance. Omitted for readers who cannot edit. */
  onEdit?: () => void;
  className?: string;
}

/**
 * Convert raw chapter body into paragraph strings.
 *
 * Two steps, both carried over from `BookViewer` because they fix real bugs
 * there: literal `\n` escape sequences (as opposed to real newlines) are
 * turned into real newlines before splitting, and blank lines are dropped
 * rather than rendered — an empty line used to become an empty `<p
 * class="mb-4">`, an invisible node that still carried a 1rem margin and
 * cluttered the accessibility tree.
 */
function toParagraphs(rawContent: string): string[] {
  return rawContent
    .replace(/\\n/g, '\n')
    .trim()
    .split('\n')
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/**
 * Scrolling reader for a single chapter.
 *
 * Replaces `BookViewer`'s pagination for chapter reading: the prose is one
 * continuous scrolling column instead of 250-word pages, and the reader's
 * position in the book is stated exactly once, in the footer row. `BookViewer`
 * itself is untouched and still serves `SagaPage`'s continuous saga view.
 */
const ChapterReader: React.FC<ChapterReaderProps> = ({
  content,
  title,
  position,
  chapterNumber,
  chapterCount,
  nextChapterTitle,
  onNextChapter,
  onPreviousChapter,
  hasNextChapter = false,
  hasPreviousChapter = false,
  onProgressChange,
  onEdit,
  className,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Always call the latest callback, even from a timeout or an unmount
  // cleanup scheduled several renders ago — those closures would otherwise
  // capture a stale `onProgressChange` from the render that scheduled them.
  // Reassigning on every render (rather than in an effect) keeps the ref
  // current before any scroll handler attached during this render can fire.
  const onProgressChangeRef = useRef(onProgressChange);
  onProgressChangeRef.current = onProgressChange;

  // Per-chapter emission state. All of these are reset when `content` changes
  // (see the layout effect below) so a new chapter starts with a clean slate.
  /** True once `onProgressChange(percent, true)` has fired for this chapter — guards against re-emitting completion on every subsequent scroll. */
  const hasEmittedCompletionRef = useRef(false);
  /** True for exactly one scroll event: the echo of the programmatic restore-scroll below. */
  const suppressScrollEmitRef = useRef(false);
  /** Timestamp of the last emission, for the leading/trailing throttle. */
  const lastEmitTimeRef = useRef(0);
  /** Pending trailing-edge timer, if one is scheduled. */
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Most recent percent computed but not yet emitted — what a flush sends. */
  const pendingPercentRef = useRef<number | null>(null);

  const paragraphs = useMemo(() => toParagraphs(content), [content]);

  /**
   * Scroll handler for the prose container. Computes the scroll percentage,
   * then either reports it immediately, collapses it into a pending
   * trailing-edge emission, or — on first reaching completion — reports it
   * right away, bypassing the throttle (it only happens once per chapter, so
   * there is no write-storm to guard against).
   */
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;

    if (suppressScrollEmitRef.current) {
      // This scroll event is the browser's echo of the programmatic restore
      // scroll, not a reader action. Swallow it once — otherwise every
      // chapter open would write straight back the value it just read.
      suppressScrollEmitRef.current = false;
      return;
    }

    const percent = scrollPercent(el.scrollTop, el.scrollHeight, el.clientHeight);
    pendingPercentRef.current = percent;

    if (!hasEmittedCompletionRef.current && isAtCompletion(percent)) {
      hasEmittedCompletionRef.current = true;
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
      pendingPercentRef.current = null;
      lastEmitTimeRef.current = Date.now();
      onProgressChangeRef.current?.(percent, true);
      return;
    }

    const now = Date.now();
    const elapsed = now - lastEmitTimeRef.current;

    if (elapsed >= PROGRESS_THROTTLE_MS) {
      lastEmitTimeRef.current = now;
      pendingPercentRef.current = null;
      // Exactly one argument. Omitting the completion flag — never passing an
      // explicit `false` — leaves any stored `isComplete` untouched, because
      // `updateChapterProgress` merges over the stored entry. Passing `false`
      // here would clear a completed chapter's stored completion on every
      // ordinary scroll (bug #852).
      onProgressChangeRef.current?.(percent);
    } else if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        lastEmitTimeRef.current = Date.now();
        const pending = pendingPercentRef.current;
        pendingPercentRef.current = null;
        if (pending !== null) {
          onProgressChangeRef.current?.(pending);
        }
      }, PROGRESS_THROTTLE_MS - elapsed);
    }
  }, []);

  // Runs on mount and whenever the chapter changes (deliberately not on every
  // `position` update — see below). Resets per-chapter emission state,
  // restores the saved scroll position, and checks for immediate completion
  // (a chapter shorter than the viewport reports 100% with no scroll event
  // ever firing, so that check can't live only in `handleScroll`). The
  // cleanup flushes any not-yet-emitted percent, so a reader who scrolls and
  // immediately navigates away — or unmounts the reader entirely — doesn't
  // lose their position.
  useLayoutEffect(() => {
    hasEmittedCompletionRef.current = false;
    suppressScrollEmitRef.current = false;
    pendingPercentRef.current = null;
    lastEmitTimeRef.current = 0;
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }

    const el = scrollContainerRef.current;
    if (!el) return;

    if (typeof position === 'number') {
      const scrollTop = positionToScrollTop(position, el.scrollHeight, el.clientHeight);

      // Only arm the suppression when the assignment will actually move the
      // element. Setting scrollTop to the value it already holds fires no
      // scroll event, so an unconditionally-armed flag is never consumed — it
      // sits waiting and swallows the reader's FIRST REAL scroll instead.
      // That is the common case, not an edge one: an unread chapter restores
      // to 0 and is already at 0, so opening a chapter, scrolling once and
      // navigating away used to persist nothing at all.
      if (scrollTop !== el.scrollTop) {
        // Restoring is a read of already-stored progress, not new progress.
        // Emitting from the scroll event this causes would write straight back
        // the value just loaded, on every chapter open.
        suppressScrollEmitRef.current = true;
        el.scrollTop = scrollTop;
      }
    }

    // A chapter that needs no scrolling reports 100% here and would otherwise
    // never complete, since no scroll event will ever fire for it. But if the
    // position we just restored *from* was already at completion, this chapter
    // has been finished before and re-asserting it only costs a redundant
    // write on every reopen — so the flag is set without emitting. Progress
    // writes to this collection failed silently for a year (see StoryContext),
    // which is reason enough not to make needless ones.
    const percent = scrollPercent(el.scrollTop, el.scrollHeight, el.clientHeight);
    if (isAtCompletion(percent)) {
      const restoredAlreadyComplete =
        typeof position === 'number' && isAtCompletion(position);

      hasEmittedCompletionRef.current = true;
      if (!restoredAlreadyComplete) {
        lastEmitTimeRef.current = Date.now();
        onProgressChangeRef.current?.(percent, true);
      }
    }

    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
        if (pendingPercentRef.current !== null) {
          onProgressChangeRef.current?.(pendingPercentRef.current);
          pendingPercentRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore only on mount/chapter change, not on every `position` update from the caller (which would otherwise fight the reader's own scrolling).
  }, [content]);

  if (!content) {
    return (
      <Card className={clsx('w-full max-w-4xl mx-auto p-8 text-center card', className)}>
        <BookOpen className="w-16 h-16 mx-auto mb-4 primary" />
        <Typography variant="h3" className="mb-2">
          No Content Available
        </Typography>
        <Typography color="secondary">Select a chapter to begin reading</Typography>
      </Card>
    );
  }

  return (
    <div className={clsx('relative w-full max-w-4xl mx-auto', className)}>
      <Card className="card card-border p-6 md:p-8">
        {onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            startIcon={<Edit size={16} />}
            className="absolute top-4 right-4 md:top-6 md:right-6"
          >
            Edit
          </Button>
        )}

        <Typography variant="h3" className="mb-6 text-center">
          {title}
        </Typography>

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          data-testid="chapter-reader-scroll"
          className="max-h-[70vh] overflow-y-auto"
        >
          <div
            className="reader-prose mx-auto max-w-[68ch]"
            style={{ fontSize: '19px', lineHeight: 1.75 }}
          >
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="mb-4">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-6 pt-4 border-t divider">
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousChapter}
            disabled={!hasPreviousChapter}
            startIcon={<ChevronLeft className="w-4 h-4" />}
          >
            Previous
          </Button>

          <Typography variant="body-sm" color="secondary">
            Chapter {chapterNumber} of {chapterCount}
          </Typography>

          <Button
            variant="ghost"
            size="sm"
            onClick={onNextChapter}
            disabled={!hasNextChapter}
            endIcon={<ChevronRight className="w-4 h-4" />}
          >
            {nextChapterTitle ? `Next: ${nextChapterTitle}` : 'Next'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default ChapterReader;
