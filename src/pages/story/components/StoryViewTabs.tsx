// pages/story/components/StoryViewTabs.tsx
import React from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from 'shared/context/NavigationContext';
import { clsx } from 'clsx';

/** One segment of the story view switcher. */
interface StorySegment {
  label: string;
  path: string;
  /** Whether this segment counts as active for a given pathname. */
  isActiveFor: (pathname: string) => boolean;
}

// `/story` itself renders ChaptersPage (see App.tsx), so the "Session chapters"
// segment has to claim both `/story` and `/story/chapters` — otherwise landing
// on the bare index route would show the tabs with neither segment marked
// current.
const SEGMENTS: StorySegment[] = [
  {
    label: 'Session chapters',
    path: '/story/chapters',
    isActiveFor: (pathname) => pathname === '/story' || pathname.startsWith('/story/chapters'),
  },
  {
    label: 'Campaign saga',
    path: '/story/saga',
    isActiveFor: (pathname) => pathname.startsWith('/story/saga'),
  },
];

export interface StoryViewTabsProps {
  className?: string;
}

/**
 * Segmented control switching between the session-chapters index and the
 * campaign saga. Rendered in the page header of both ChaptersPage and
 * SagaPage so either view is always one click from the other.
 */
const StoryViewTabs: React.FC<StoryViewTabsProps> = ({ className }) => {
  const { navigateToPage } = useNavigation();
  const { pathname } = useLocation();

  return (
    <div
      role="group"
      aria-label="Story view"
      className={clsx('inline-flex rounded-lg p-1 bg-secondary', className)}
    >
      {SEGMENTS.map((segment) => {
        const isActive = segment.isActiveFor(pathname);

        return (
          <button
            key={segment.path}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => navigateToPage(segment.path)}
            className={clsx(
              'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
              isActive ? 'card' : 'typography-secondary'
            )}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
};

export default StoryViewTabs;
