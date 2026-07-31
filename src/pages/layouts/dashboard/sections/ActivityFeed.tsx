// components/features/dashboard/ActivityFeed.tsx
import React, { useState } from 'react';
import Typography from 'core/components/Typography';
import Card from 'core/components/Card';
import clsx from 'clsx';
import { Activity } from 'pages/HomePage';
import { useActivityDisplay } from '../../../layouts/common/hooks/useActivityDisplay';
import { getContentIcon } from '../../../layouts/common/utils/contentTypeUtils';
import EmptyState from '../../../layouts/common/components/EmptyState';

interface ActivityFeedProps {
  activities: Activity[];
  loading: boolean;
}

/** The filter options, in the order the design lists them. `null` means "All". */
const FILTERS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'All' },
  { value: 'chapter', label: 'Story' },
  { value: 'quest', label: 'Quests' },
  { value: 'npc', label: 'NPCs' },
  { value: 'location', label: 'Locations' },
  { value: 'rumor', label: 'Rumors' },
];

/**
 * ActivityFeed component that displays recent activity across content types.
 *
 * This answers "what happened since we last played", which is the question the
 * dashboard exists to answer, so it now occupies the wide column rather than a
 * third-width sidebar. Each entry is a row in one bordered list instead of its own
 * card: the date leads, the type is a small eyebrow, and the title carries the
 * heading serif, so the rows have hierarchy instead of being four identical blocks.
 * The filter is a visible pill row rather than a <select> that hid five of its six
 * options behind a click.
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({ activities, loading }) => {

  // State for filtering activities
  const [filter, setFilter] = useState<string | null>(null);

  // Use the activity display hook
  const {
    activities: filteredActivities,
    formatDate,
    handleActivityClick,
    getTypeLabel
  } = useActivityDisplay({
    activities,
    filter,
    limit: 4,
    journalStyle: false
  });

  const heading = (
    <Typography variant="h2" className="text-xl sm:text-2xl whitespace-nowrap">
      Since you last played
    </Typography>
  );

  if (loading) {
    return (
      <div data-testid="activity-feed">
        <div className="flex justify-between items-center mb-4 flex-nowrap">
          {heading}
        </div>
        {/* LoadingState's `type="card"` has no branch and silently falls through to a
            spinner, ignoring count/height — so the skeleton is inlined here to
            actually match the shape of the list it stands in for. */}
        <div className={clsx('rounded-lg overflow-hidden card animate-pulse')}>
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={clsx('px-5 py-5 h-[92px]', i > 1 && 'border-t border-card')}
            >
              <div className={clsx('w-full h-full rounded-lg', `journal-loading`)}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="activity-feed">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {heading}

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter activity by type">
          {FILTERS.map(({ value, label }) => {
            const isActive = filter === value;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setFilter(value)}
                aria-pressed={isActive}
                className={clsx(
                  'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                  isActive
                    ? 'bg-status-general text-status-text'
                    : 'bg-secondary typography-secondary selectable-item'
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {filteredActivities.length === 0 ? (
        <Card>
          <Card.Content className="text-center py-12">
            <EmptyState
              icon={getContentIcon('chapter', 28)}
              title="No Recent Activity"
              message={filter
                ? `No ${getTypeLabel(filter)} activity found. Try a different filter.`
                : 'Start creating content to see activity here'
              }
              actionLabel={filter ? "Show All Activity" : undefined}
              onAction={filter ? () => setFilter(null) : undefined}
            />
          </Card.Content>
        </Card>
      ) : (
        <div className={clsx('rounded-lg overflow-hidden card')}>
          {filteredActivities.map((activity, index) => (
            <button
              key={`${activity.type}-${activity.id}`}
              type="button"
              onClick={() => handleActivityClick(activity)}
              className={clsx(
                'w-full text-left px-5 py-4 grid gap-4 items-baseline transition-colors',
                'grid-cols-[1fr_auto] sm:grid-cols-[88px_1fr_auto]',
                'selectable-item',
                index > 0 && 'border-t border-card'
              )}
            >
              <Typography
                variant="body-sm"
                color="muted"
                className="text-xs font-medium col-start-1 row-start-2 sm:row-start-1 whitespace-nowrap"
              >
                {formatDate(activity.timestamp)}
              </Typography>

              <div className="flex flex-col gap-1 min-w-0 col-start-1 row-start-1 sm:col-start-2">
                <Typography
                  variant="body-sm"
                  color="primary"
                  className="text-[11px] font-semibold uppercase tracking-wider"
                >
                  {getTypeLabel(activity.type)}
                </Typography>
                <Typography variant="h4" className="text-base sm:text-lg truncate">
                  {activity.title}
                </Typography>
                {activity.actor && (
                  <Typography variant="body-sm" color="muted" className="text-xs">
                    {activity.actor}
                  </Typography>
                )}
              </div>

              <Typography
                variant="body-sm"
                color="primary"
                className="text-sm font-medium whitespace-nowrap row-start-1 col-start-2 sm:col-start-3"
              >
                {activity.type === 'chapter' ? 'Read' : 'Open'}
              </Typography>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityFeed;
