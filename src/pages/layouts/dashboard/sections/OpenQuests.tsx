// components/features/dashboard/OpenQuests.tsx
import React from 'react';
import Typography from 'core/components/Typography';
import clsx from 'clsx';
import { useNavigation } from 'shared/context/NavigationContext';
import type { Quest } from 'features/campaign-entities';

interface OpenQuestsProps {
  quests?: Quest[];
  loading?: boolean;
  /** How many to list before linking out to the full page. */
  limit?: number;
}

/**
 * The quests the party still owes someone, named rather than counted.
 *
 * The stats strip says how many quests are open; this says which ones. That was
 * previously only available by leaving the dashboard, even though it is the most
 * actionable thing on it.
 */
const OpenQuests: React.FC<OpenQuestsProps> = ({ quests = [], loading = false, limit = 4 }) => {
  const { navigateToPage } = useNavigation();

  const openQuests = quests.filter(quest => quest.status === 'active');
  const shown = openQuests.slice(0, limit);
  const remaining = openQuests.length - shown.length;

  if (loading) {
    return (
      <div data-testid="open-quests">
        <Typography variant="h2" className="text-xl sm:text-2xl mb-4">Open quests</Typography>
        <div className="flex flex-col gap-2.5 animate-pulse">
          {[1, 2].map(i => (
            <div key={i} className={clsx('rounded-lg card h-[52px]')}>
              <div className={clsx('w-full h-full rounded-lg', `journal-loading`)}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="open-quests">
      <Typography variant="h2" className="text-xl sm:text-2xl mb-4">Open quests</Typography>

      {openQuests.length === 0 ? (
        <Typography variant="body-sm" color="muted" className="italic">
          Nothing open — every quest is settled.
        </Typography>
      ) : (
        <div className="flex flex-col gap-2.5">
          {shown.map(quest => (
            <button
              key={quest.id}
              type="button"
              onClick={() => navigateToPage(`/quests?highlight=${quest.id}`)}
              className={clsx(
                'flex items-center gap-3 px-4 py-3.5 rounded-lg text-left w-full',
                'card selectable-item transition-colors'
              )}
            >
              <span
                aria-hidden="true"
                className="w-2 h-2 rounded-full shrink-0 bg-status-unknown"
              ></span>
              <Typography variant="body" className="flex-1 min-w-0 truncate font-medium">
                {quest.title}
              </Typography>
            </button>
          ))}

          {remaining > 0 && (
            <button
              type="button"
              onClick={() => navigateToPage('/quests')}
              className="self-start text-sm font-semibold typography-primary"
            >
              {remaining === 1 ? '1 more open quest' : `${remaining} more open quests`}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default OpenQuests;
