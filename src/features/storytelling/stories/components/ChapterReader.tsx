// src/features/storytelling/stories/components/ChapterReader.tsx
import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import Markdown from 'core/components/Markdown';
import clsx from 'clsx';
import {
  pageScrollPercent,
  percentToPageScrollY,
  isAtCompletion,
} from 'features/storytelling/chapters/utils/reading-position';
import type { ChapterByline } from 'features/storytelling/chapters/utils/chapter-byline';

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
  /** The chapter's own title, unnumbered: the eyebrow above it carries the number. */
  title: string;
  /** Stored scroll position as a percentage 0-100, restored on mount and on chapter change. */
  position?: number;
  /** This chapter's 1-based number, for the eyebrow and the footer's "Chapter 1 of 39". */
  chapterNumber: number;
  /** Total chapters in the story. */
  chapterCount: number;
  /** Who recorded the chapter and when, and who last edited it. */
  byline?: ChapterByline;
  /** Title of the previous chapter, so the Previous button can name where it goes. */
  previousChapterTitle?: string;
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
 * The reading column for a single chapter: eyebrow, title, byline, prose and
 * the footer that moves between chapters.
 *
 * The prose scrolls with the page. It used to sit in a box of its own, capped
 * at 70vh, which on a phone meant two scrollbars, one inside the other, for
 * every long chapter. Reading progress is therefore measured from where the
 * prose block sits in the window (`pageScrollPercent`), not from a box's
 * `scrollTop`.
 *
 * The title is rendered here, once, as the page's `h1`; the page around it
 * adds no heading of its own. The reader's position in the book is stated
 * once too, in the footer row. `BookViewer` is untouched and still serves
 * `SagaPage`'s continuous saga view.
 */
const ChapterReader: React.FC<ChapterReaderProps> = ({
  content,
  title,
  position,
  chapterNumber,
  chapterCount,
  byline,
  previousChapterTitle,
  nextChapterTitle,
  onNextChapter,
  onPreviousChapter,
  hasNextChapter = false,
  hasPreviousChapter = false,
  onProgressChange,
  onEdit,
  className,
}) => {
  /** The prose block, whose place in the window is the reading position. */
  const proseRef = useRef<HTMLDivElement>(null);

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
  /**
   * False until this chapter's prose has rendered and its position has been
   * restored. Until then the prose block measures 0px tall, which reads as
   * "fits on screen", i.e. 100% — so nothing may be reported from it.
   */
  const settledRef = useRef(false);

  /**
   * Window scroll handler. Computes the reading percentage,
   * then either reports it immediately, collapses it into a pending
   * trailing-edge emission, or — on first reaching completion — reports it
   * right away, bypassing the throttle (it only happens once per chapter, so
   * there is no write-storm to guard against).
   */
  const handleScroll = useCallback(() => {
    const el = proseRef.current;
    if (!el || !settledRef.current) return;

    if (suppressScrollEmitRef.current) {
      // This scroll event is the browser's echo of the programmatic restore
      // scroll, not a reader action. Swallow it once — otherwise every
      // chapter open would write straight back the value it just read.
      suppressScrollEmitRef.current = false;
      return;
    }

    // Prose with no height has nothing rendered in it, and would read as 100%.
    // A short chapter's completion is the settle step's to report, not this.
    const rect = el.getBoundingClientRect();
    if (rect.height === 0) return;
    const percent = pageScrollPercent(rect.top, rect.height, window.innerHeight);
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

  // The page scrolls, not a box, so the reader listens to the window.
  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Runs on mount and whenever the chapter changes (deliberately not on every
  // `position` update — see below). Resets per-chapter emission state, then,
  // once the prose is on the page, restores the saved position and checks for
  // immediate completion (a chapter shorter than the viewport reports 100%
  // with no scroll event ever firing, so that check can't live only in
  // `handleScroll`). The cleanup flushes any not-yet-emitted percent, so a
  // reader who scrolls and immediately navigates away — or unmounts the
  // reader entirely — doesn't lose their position.
  useLayoutEffect(() => {
    hasEmittedCompletionRef.current = false;
    suppressScrollEmitRef.current = false;
    pendingPercentRef.current = null;
    lastEmitTimeRef.current = 0;
    settledRef.current = false;
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }

    // The cleanup's flush must reach THIS chapter's handler. By the time a
    // chapter change runs that cleanup, the ref already holds the handler
    // rendered for the next chapter, and the last moments of scrolling in the
    // old chapter would be written into the new one's progress.
    const reportForThisChapter = onProgressChangeRef.current;

    const el = proseRef.current;
    if (!el) return;

    /** Restore the saved position and check for completion, once per chapter. */
    const settle = () => {
      if (settledRef.current) return;
      settledRef.current = true;

      // Every chapter change sets the window's scroll, even to the top: the
      // page is one document across chapters, so without this a reader who
      // clicked Next at the bottom of one chapter would land at the bottom of
      // the next.
      const before = el.getBoundingClientRect();
      const target = percentToPageScrollY(
        position ?? 0,
        before.top + window.scrollY,
        before.height,
        window.innerHeight
      );

      // Only arm the suppression when the scroll will actually move the page.
      // Scrolling to where the page already is fires no scroll event, so an
      // unconditionally-armed flag is never consumed — it sits waiting and
      // swallows the reader's FIRST REAL scroll instead. That is the common
      // case, not an edge one: an unread chapter restores to the top and is
      // usually already there, so opening a chapter, scrolling once and
      // navigating away used to persist nothing at all.
      if (target !== window.scrollY) {
        // Restoring is a read of already-stored progress, not new progress.
        // Emitting from the scroll event this causes would write straight
        // back the value just loaded, on every chapter open. 'instant',
        // because a smooth scroll fires a train of events and only the first
        // is swallowed.
        suppressScrollEmitRef.current = true;
        window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
      }

      // A chapter that needs no scrolling reports 100% here and would
      // otherwise never complete, since no scroll event will ever fire for
      // it. But if the position we just restored *from* was already at
      // completion, this chapter has been finished before and re-asserting it
      // only costs a redundant write on every reopen — so the flag is set
      // without emitting. Progress writes to this collection failed silently
      // for a year (see StoryContext), which is reason enough not to make
      // needless ones.
      const after = el.getBoundingClientRect();
      const percent = pageScrollPercent(after.top, after.height, window.innerHeight);
      if (isAtCompletion(percent)) {
        const restoredAlreadyComplete =
          typeof position === 'number' && isAtCompletion(position);

        hasEmittedCompletionRef.current = true;
        if (!restoredAlreadyComplete) {
          lastEmitTimeRef.current = Date.now();
          reportForThisChapter?.(percent, true);
        }
      }
    };

    // The prose renders through a lazily loaded markdown parser, so on a cold
    // page load it is still empty here. An empty block is 0px tall, which
    // reads as a chapter that fits on screen: settling now would restore to
    // the top and mark the chapter read before a word of it was shown. Wait
    // for it to take up space. Where there is no ResizeObserver (jsdom), or
    // the prose is already laid out, settle straight away.
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver === 'undefined' || el.getBoundingClientRect().height > 0) {
      settle();
    } else {
      observer = new ResizeObserver(() => {
        if (el.getBoundingClientRect().height > 0) {
          observer?.disconnect();
          settle();
        }
      });
      observer.observe(el);
    }

    return () => {
      observer?.disconnect();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
        if (pendingPercentRef.current !== null) {
          reportForThisChapter?.(pendingPercentRef.current);
          pendingPercentRef.current = null;
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore only on mount/chapter change, not on every `position` update from the caller (which would otherwise fight the reader's own scrolling).
  }, [content]);

  if (!content) {
    return (
      <div className={clsx('w-full max-w-[68ch] mx-auto py-16 text-center', className)}>
        <BookOpen className="w-16 h-16 mx-auto mb-4 primary" aria-hidden="true" />
        <Typography variant="h3" className="mb-2">
          No Content Available
        </Typography>
        <Typography color="secondary">Select a chapter to begin reading</Typography>
      </div>
    );
  }

  // "CHAPTER 4 · 12 MARCH 2025". The date is when it was recorded.
  const eyebrow = [`Chapter ${chapterNumber}`, byline?.recordedOn].filter(Boolean).join(' · ');

  // Recorded by, edited by and Edit, each separated by a middle dot.
  const bylineParts: React.ReactNode[] = [];
  if (byline?.recordedBy) {
    bylineParts.push(
      <span key="recorded">
        Recorded by <strong className="font-semibold typography-heading">{byline.recordedBy}</strong>
      </span>
    );
  }
  if (byline?.editedBy) {
    bylineParts.push(
      <span key="edited">
        edited by <strong className="font-semibold typography-heading">{byline.editedBy}</strong>
        {byline.editedOn && `, ${byline.editedOn}`}
      </span>
    );
  }
  if (onEdit) {
    bylineParts.push(
      <Button key="edit" variant="link" onClick={onEdit} className="text-sm">
        Edit
      </Button>
    );
  }

  return (
    <article className={clsx('w-full max-w-[68ch] mx-auto', className)}>
      <header className="pb-6 mb-8 border-b divider">
        <Typography
          variant="body-sm"
          color="secondary"
          className="text-xs font-semibold uppercase tracking-wider mb-3"
        >
          {eyebrow}
        </Typography>

        <Typography variant="h1" className="mb-4 leading-tight">
          {title}
        </Typography>

        {bylineParts.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm typography-secondary">
            {bylineParts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span aria-hidden="true">·</span>}
                {part}
              </React.Fragment>
            ))}
          </div>
        )}
      </header>

      <div
        ref={proseRef}
        data-testid="chapter-reader-prose"
        className="reader-prose"
        style={{ fontSize: '19px', lineHeight: 1.75 }}
      >
        <Markdown content={content} />
      </div>

      {/* Previous at the start, the position in the middle, Next at the end.
          A neighbour that doesn't exist leaves its cell empty rather than
          showing a dead button. On a phone the buttons drop the titles, which
          stay in their accessible names. */}
      <footer className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 mt-12 pt-6 border-t divider">
        <div className="justify-self-start min-w-0">
          {hasPreviousChapter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousChapter}
              startIcon={<ChevronLeft className="w-4 h-4" />}
              aria-label={previousChapterTitle ? `Previous: ${previousChapterTitle}` : undefined}
            >
              {previousChapterTitle ? (
                <>
                  <span className="sm:hidden">Previous</span>
                  <span className="hidden sm:inline">{previousChapterTitle}</span>
                </>
              ) : (
                'Previous'
              )}
            </Button>
          )}
        </div>

        <Typography variant="body-sm" color="secondary" className="text-center whitespace-nowrap">
          Chapter {chapterNumber} of {chapterCount}
        </Typography>

        <div className="justify-self-end min-w-0">
          {hasNextChapter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextChapter}
              endIcon={<ChevronRight className="w-4 h-4" />}
              aria-label={nextChapterTitle ? `Next: ${nextChapterTitle}` : undefined}
            >
              {nextChapterTitle ? (
                <>
                  <span className="sm:hidden">Next</span>
                  <span className="hidden sm:inline">{nextChapterTitle}</span>
                </>
              ) : (
                'Next'
              )}
            </Button>
          )}
        </div>
      </footer>
    </article>
  );
};

export default ChapterReader;
