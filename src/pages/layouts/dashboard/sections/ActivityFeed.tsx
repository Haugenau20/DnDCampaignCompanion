// components/features/dashboard/ActivityFeed.tsx
import React, { useState } from 'react';
import Typography from 'core/components/Typography';
import Card from 'core/components/Card';
import { RosterFilterPills, type RosterFilterOption } from 'core/components/Roster';
import EntitySigil from 'core/components/EntitySigil';
import clsx from 'clsx';
import { Activity } from 'pages/HomePage';
import { useActivityDisplay } from '../../../layouts/common/hooks/useActivityDisplay';
import { getContentIcon } from '../../../layouts/common/utils/contentTypeUtils';
import EmptyState from '../../../layouts/common/components/EmptyState';

interface ActivityFeedProps {
  activities: Activity[];
  loading: boolean;
}

/**
 * The filter options, in the order the design lists them.
 *
 * `useActivityDisplay` takes `null` for "no filter" while RosterFilterPills, like
 * every other filter row in the app, uses the string `'all'` — so ALL_TYPES is the
 * single place that mapping happens, rather than a nullable value leaking into the
 * shared control's API for one caller's benefit.
 */
const ALL_TYPES = 'all';

const FILTERS: RosterFilterOption[] = [
  { value: ALL_TYPES, label: 'All' },
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
    limit: 4
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
              <div className={clsx('w-full h-full rounded-lg', `section-loading`)}></div>
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

        <RosterFilterPills
          options={FILTERS}
          value={filter ?? ALL_TYPES}
          onChange={value => setFilter(value === ALL_TYPES ? null : value)}
          label="Filter activity by type"
          size="sm"
        />
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
                'w-full text-left px-5 py-4 flex items-center gap-4 transition-colors',
                'selectable-item',
                index > 0 && 'border-t border-card'
              )}
            >
              {/*
                The mark leads, then the title, then one meta line.

                The type used to be a coloured eyebrow above the title, and the
                date a column of its own -- three stacked lines and two columns
                for what is one row of information. A row states its type once,
                and a single line of metadata is the budget: type, who wrote it,
                when. Folding the date in also removes the separate column,
                which is what lets the title start at the same place on every
                row and makes the list scannable down the titles alone.
              */}
              <div className="flex gap-3 min-w-0">
                <EntitySigil
                  entityId={activity.id}
                  name={activity.title}
                  className="mt-0.5"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <Typography variant="h4" className="text-base sm:text-lg truncate">
                    {activity.title}
                  </Typography>
                  <Typography variant="body-sm" color="muted" className="text-xs truncate">
                    {[getTypeLabel(activity.type), activity.actor, formatDate(activity.timestamp)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                </div>
              </div>

              <Typography
                variant="body-sm"
                color="primary"
                className="text-sm font-medium whitespace-nowrap ml-auto shrink-0"
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
