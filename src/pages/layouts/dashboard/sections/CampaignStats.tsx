// components/features/dashboard/CampaignStats.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import { useNavigation } from 'shared/context/NavigationContext';
import clsx from 'clsx';
import { NPC } from 'features/campaign-entities';
import type { Location } from 'features/campaign-entities';
import type { Quest } from 'features/campaign-entities';
import type { Chapter } from 'features/storytelling';
import { Rumor } from 'features/campaign-entities';

interface CampaignStatsProps {
  npcs?: NPC[];
  locations?: Location[];
  quests?: Quest[];
  chapters?: Chapter[];
  rumors?: Rumor[];
  loading?: boolean;
}

interface CountStat {
  label: string;
  value: number;
  path: string;
}

/**
 * A single count in the stats strip. Zero-value stats stay visible — an empty
 * campaign is information — but they are dimmed so they stop competing with
 * counts that actually have content behind them.
 */
const StatCount: React.FC<{ stat: CountStat; onSelect: () => void }> = ({
  stat,
  onSelect,
}) => {
  const isEmpty = stat.value === 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'flex-1 flex flex-col items-start gap-1 px-5 py-4 text-left transition-colors',
        'selectable-item'
      )}
    >
      <Typography
        variant="h4"
        className={clsx('text-2xl typography-heading', isEmpty && 'opacity-40')}
      >
        {stat.value}
      </Typography>
      <Typography
        variant="body-sm"
        color="secondary"
        className={clsx(
          'text-xs uppercase tracking-wider',
          isEmpty && 'opacity-60'
        )}
      >
        {stat.label}
      </Typography>
    </button>
  );
};

/**
 * CampaignStats — a single hairline strip of counts plus the quest fraction.
 *
 * These were six equal cards for six unequal things, so half the dashboard's best
 * real estate went to counters that are often zero. Collapsing them into one strip
 * demotes them to the reference material they are and hands the space to the
 * campaign content below. The quest progress bar now states its own fraction: it
 * previously rendered a bar with no number at all, leaving the reader to guess.
 */
const CampaignStats: React.FC<CampaignStatsProps> = ({
  npcs = [],
  locations = [],
  quests = [],
  chapters = [],
  rumors = [],
  loading = false
}) => {
  const { navigateToPage } = useNavigation();

  // Calculate quest stats - safely with default values
  const activeQuests = quests.filter(quest => quest.status === 'active').length;
  const completedQuests = quests.filter(quest => quest.status === 'completed').length;
  const totalQuests = quests.length;

  // Calculate quest completion percentage (avoid division by zero)
  const questCompletionPercentage = totalQuests > 0
    ? (completedQuests / totalQuests) * 100
    : 0;

  // `active` and `completed` do not sum to `total` — QuestStatus also has 'failed' —
  // so the remainder is named rather than implied.
  const unfinishedQuests = totalQuests - completedQuests;

  const counts: CountStat[] = [
    { label: 'Chapters', value: chapters.length, path: '/story/chapters' },
    { label: 'NPCs', value: npcs.length, path: '/npcs' },
    { label: 'Locations', value: locations.length, path: '/locations' },
    { label: 'Rumors', value: rumors.length, path: '/rumors' },
  ];

  if (loading) {
    return (
      <div
        className={clsx('rounded-lg overflow-hidden card')}
        data-testid="campaign-stats-strip"
      >
        <div className="flex flex-col sm:flex-row animate-pulse">
          {[1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              className={clsx(
                'flex-1 px-5 py-4 h-[76px]',
                i > 1 && 'border-t sm:border-t-0 sm:border-l border-card'
              )}
            >
              <div className={clsx('w-full h-full rounded-lg', `journal-loading`)}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx('rounded-lg overflow-hidden card')}
      data-testid="campaign-stats-strip"
    >
      {/* Kept as an accessible label for the region without spending a visible
          heading on counters. */}
      <Typography variant="h3" className="sr-only">Campaign Stats</Typography>

      <div className="flex flex-col sm:flex-row sm:items-stretch">
        {counts.map((stat, index) => (
          <div
            key={stat.label}
            className={clsx(
              'flex flex-1',
              index > 0 && 'border-t sm:border-t-0 sm:border-l border-card'
            )}
          >
            <StatCount stat={stat} onSelect={() => navigateToPage(stat.path)} />
          </div>
        ))}

        {/* Quest fraction — given ~2x the width of a bare count, because it is the
            one stat that carries a state rather than a total. */}
        <button
          type="button"
          onClick={() => navigateToPage('/quests')}
          className={clsx(
            'flex-[1.9] flex flex-col justify-center gap-2 px-5 py-4 text-left',
            'border-t sm:border-t-0 sm:border-l border-card bg-secondary',
            'selectable-item transition-colors'
          )}
        >
          <div className="flex items-baseline gap-2">
            <Typography variant="h4" className="text-2xl typography-heading">
              {completedQuests}
            </Typography>
            <Typography variant="body-sm" color="secondary">
              {totalQuests === 1
                ? 'of 1 quest complete'
                : `of ${totalQuests} quests complete`}
            </Typography>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={clsx('h-1.5 flex-1 rounded-full overflow-hidden', `progress-container`)}
              role="progressbar"
              aria-valuenow={Math.round(questCompletionPercentage)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Quest completion"
            >
              <div
                className={clsx('h-full rounded-full', `progress-bar`)}
                style={{ width: `${questCompletionPercentage}%` }}
              ></div>
            </div>
            <Typography variant="body-sm" color="muted" className="text-xs whitespace-nowrap">
              {activeQuests > 0
                ? `${activeQuests} active`
                : `${unfinishedQuests} unfinished`}
            </Typography>
          </div>
        </button>
      </div>
    </div>
  );
};

export default CampaignStats;
