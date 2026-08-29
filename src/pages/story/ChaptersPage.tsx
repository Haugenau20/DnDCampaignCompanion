// pages/story/ChaptersPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useStory, BookshelfView, ChapterList } from 'features/storytelling';
import {
  deriveChapterProgress,
  summariseProgress,
  filterChapters,
} from 'features/storytelling/chapters/utils/chapter-progress';
import { useNavigation } from 'shared/context/NavigationContext';
import { useAuth } from 'features/user-management';
import Typography from 'core/components/Typography';
import Breadcrumb from 'shared/components/Breadcrumb';
import Button from 'core/components/Button';
import ResumeBar from './components/ResumeBar';
import StoryViewTabs from './components/StoryViewTabs';
import { Plus, List, Grid } from 'lucide-react';
import { clsx } from 'clsx';

/** localStorage key for the list/shelf view toggle. */
const VIEW_PREFERENCE_KEY = 'chapters-view-preference';
/** localStorage key for the all/unread filter pill. */
const FILTER_PREFERENCE_KEY = 'chapters-filter-preference';

type ViewMode = 'list' | 'shelf';
type FilterMode = 'all' | 'unread';

/**
 * Normalises a stored view preference. The pre-redesign page stored
 * `'table' | 'bookshelf'`; those values are read as `'list'` and `'shelf'`
 * respectively so an existing visitor's preference survives the rename.
 */
function normaliseViewMode(stored: string | null): ViewMode {
  if (stored === 'list' || stored === 'table') return 'list';
  return 'shelf';
}

function normaliseFilterMode(stored: string | null): FilterMode {
  return stored === 'unread' ? 'unread' : 'all';
}

/**
 * Session chapters index: campaign-wide resume bar, a search + unread
 * filter row, and the chapter list itself in either list or shelf form.
 *
 * Also serves as the `/story` landing route (see `app/App.tsx`) now that
 * the dedicated selection page is gone — the segmented control
 * (`StoryViewTabs`) is what lets a visitor get to the saga from here.
 */
const ChaptersPage: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    normaliseViewMode(localStorage.getItem(VIEW_PREFERENCE_KEY))
  );
  const [filterMode, setFilterMode] = useState<FilterMode>(() =>
    normaliseFilterMode(localStorage.getItem(FILTER_PREFERENCE_KEY))
  );
  const [searchQuery, setSearchQuery] = useState('');

  const { chapters, storyProgress, isLoading } = useStory();
  const { navigateToPage } = useNavigation();
  const { user } = useAuth();

  useEffect(() => {
    localStorage.setItem(VIEW_PREFERENCE_KEY, viewMode);
  }, [viewMode]);

  useEffect(() => {
    localStorage.setItem(FILTER_PREFERENCE_KEY, filterMode);
  }, [filterMode]);

  // Campaign-wide progress, independent of the search/filter row below —
  // the resume bar always reflects the whole campaign, not the current view.
  const items = useMemo(
    () => deriveChapterProgress(chapters, storyProgress),
    [chapters, storyProgress]
  );
  const summary = useMemo(() => summariseProgress(items), [items]);

  // Search narrows the pool the filter pills count and operate over, so the
  // pill counts stay live as the reader types.
  const searchedItems = useMemo(
    () => filterChapters(items, searchQuery),
    [items, searchQuery]
  );
  const allCount = searchedItems.length;
  const unreadCount = useMemo(
    () => searchedItems.filter((item) => item.state !== 'read').length,
    [searchedItems]
  );
  const visibleItems = useMemo(
    () =>
      filterMode === 'unread'
        ? searchedItems.filter((item) => item.state !== 'read')
        : searchedItems,
    [searchedItems, filterMode]
  );

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Story', href: '/story' },
    { label: 'Chapters' },
  ];

  const handleChapterSelect = (chapterId: string) => {
    navigateToPage(`/story/chapters/${chapterId}`);
  };

  const handleCreateChapter = () => {
    navigateToPage('/story/chapters/create');
  };

  const handleEditChapter = (chapterId: string) => {
    navigateToPage(`/story/chapters/edit/${chapterId}`);
  };

  // `position` is deliberately not passed along. Resuming mid-chapter does
  // work now, but the reader restores the position itself from stored
  // progress — the same source this summary was derived from — so putting it
  // in the URL would duplicate the fact and let the two disagree. The
  // parameter stays on the callback because it is part of ResumeBar's
  // contract and reads as intent at the call site.
  const handleResume = (chapterId: string, _position: number) => {
    navigateToPage(`/story/chapters/${chapterId}`);
  };

  if (isLoading) {
    return <Typography>Loading chapters...</Typography>;
  }

  return (
    <div className="min-h-screen p-4 content">
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={breadcrumbItems} className="mb-4" />

        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <Typography variant="h2" className="typography-heading">
            Session Chronicles
          </Typography>

          <div className="flex items-center gap-3">
            <StoryViewTabs />
            {user && (
              <Button
                variant="primary"
                startIcon={<Plus />}
                onClick={handleCreateChapter}
              >
                New Chapter
              </Button>
            )}
          </div>
        </div>

        <ResumeBar summary={summary} onResume={handleResume} />

        {chapters.length === 0 ? (
          <div className="p-8 text-center rounded-lg card">
            <Typography>No chapters available yet.</Typography>
          </div>
        ) : (
          <>
            {/* Search + filter + view toggle row */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <input
                type="text"
                className="input flex-1 min-w-[200px]"
                placeholder="Search chapter titles and summaries"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search chapter titles and summaries"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  aria-pressed={filterMode === 'all'}
                  onClick={() => setFilterMode('all')}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filterMode === 'all'
                      ? 'bg-accent accent'
                      : 'typography-secondary selectable-item'
                  )}
                >
                  All {allCount}
                </button>
                <button
                  type="button"
                  aria-pressed={filterMode === 'unread'}
                  onClick={() => setFilterMode('unread')}
                  className={clsx(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    filterMode === 'unread'
                      ? 'bg-accent accent'
                      : 'typography-secondary selectable-item'
                  )}
                >
                  Unread {unreadCount}
                </button>
              </div>

              <div className="flex rounded-lg p-1 bg-secondary ml-auto">
                <button
                  type="button"
                  aria-current={viewMode === 'list' ? 'page' : undefined}
                  onClick={() => setViewMode('list')}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded-md transition-colors',
                    viewMode === 'list' ? 'card' : 'typography-secondary'
                  )}
                >
                  <List className="w-4 h-4" />
                  <span className="hidden sm:inline">List</span>
                </button>

                <button
                  type="button"
                  aria-current={viewMode === 'shelf' ? 'page' : undefined}
                  onClick={() => setViewMode('shelf')}
                  className={clsx(
                    'flex items-center gap-1 px-3 py-1 rounded-md transition-colors',
                    viewMode === 'shelf' ? 'card' : 'typography-secondary'
                  )}
                >
                  <Grid className="w-4 h-4" />
                  <span className="hidden sm:inline">Shelf</span>
                </button>
              </div>
            </div>

            {visibleItems.length === 0 ? (
              <div className="p-8 text-center rounded-lg card">
                <Typography>No chapters match your search.</Typography>
              </div>
            ) : viewMode === 'list' ? (
              <ChapterList
                items={visibleItems}
                onChapterSelect={handleChapterSelect}
                onEditChapter={handleEditChapter}
                isAdmin={!!user}
              />
            ) : (
              <BookshelfView
                items={visibleItems}
                onChapterSelect={handleChapterSelect}
                onEditChapter={handleEditChapter}
                isAdmin={!!user}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ChaptersPage;
