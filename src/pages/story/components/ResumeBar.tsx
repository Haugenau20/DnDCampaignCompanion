// pages/story/components/ResumeBar.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import Button from 'core/components/Button';
import type { StorySummary } from 'features/storytelling/chapters/utils/chapter-progress';
import { clsx } from 'clsx';

export interface ResumeBarProps {
  summary: StorySummary;
  onResume: (chapterId: string, position: number) => void;
}

/**
 * Full-width banner under the page header, offering one click back into
 * the campaign: either "start reading" for a fresh campaign, or "resume"
 * at the chapter and position the reader last left off.
 *
 * Renders nothing when there are no chapters at all — an empty campaign
 * has nothing to resume and no "chapter 1" to start.
 */
const ResumeBar: React.FC<ResumeBarProps> = ({ summary, onResume }) => {
  if (summary.total === 0) {
    return null;
  }

  const handleResumeClick = () => {
    if (summary.resumeChapterId) {
      onResume(summary.resumeChapterId, summary.resumePosition);
    }
  };

  if (!summary.hasStarted) {
    return (
      <div className="card card-border rounded-lg p-4 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Typography variant="h4" className="typography-heading">
            Start reading
          </Typography>
          <Typography variant="body-sm" color="secondary">
            Begin your journey with Chapter 1.
          </Typography>
        </div>
        <Button variant="primary" onClick={handleResumeClick}>
          Start reading
        </Button>
      </div>
    );
  }

  // `summary.current` is the chapter explicitly marked as current
  // (`storyProgress.currentChapter`). It is possible to have started reading
  // — a chapter left part-way through — without any chapter being "current"
  // (e.g. `currentChapter` was cleared). `StorySummary` doesn't carry that
  // partially-read chapter's title, only its id via `resumeChapterId`, so
  // the heading falls back to a generic label rather than fabricating one.
  const current = summary.current;
  const isFullyComplete = summary.percentComplete >= 100;

  const captionParts = [
    `${summary.read} ${summary.read === 1 ? 'chapter' : 'chapters'} read`,
    `${summary.remaining} to go`,
  ];
  if (summary.resumePosition > 0) {
    captionParts.push(`you stopped ${Math.round(summary.resumePosition)}% through`);
  }

  return (
    <div className="card card-border rounded-lg p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <Typography
            variant="caption"
            color="muted"
            className="uppercase tracking-wide"
          >
            Continue reading
          </Typography>
          <Typography variant="h4" className="typography-heading truncate">
            {current
              ? `Chapter ${current.chapter.order}: ${current.chapter.title}`
              : 'Continue where you left off'}
          </Typography>
        </div>
        <Button variant="primary" onClick={handleResumeClick}>
          Resume
        </Button>
      </div>

      <div
        className="h-1.5 rounded-full overflow-hidden progress-container mt-3"
        role="progressbar"
        aria-valuenow={summary.percentComplete}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Campaign progress"
      >
        <div
          className={clsx(
            'h-full rounded-full',
            isFullyComplete ? 'progress-bar-completed' : 'progress-bar-active'
          )}
          style={{ width: `${summary.percentComplete}%` }}
        />
      </div>

      <Typography variant="body-sm" color="secondary" className="mt-2">
        {captionParts.join(' · ')}
      </Typography>
    </div>
  );
};

export default ResumeBar;
