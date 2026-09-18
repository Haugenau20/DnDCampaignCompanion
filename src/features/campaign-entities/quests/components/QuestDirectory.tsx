// src/features/campaign-entities/quests/components/QuestDirectory.tsx
import React, { useState, useMemo, useCallback } from 'react';
import { Quest, QuestStatus } from '../types';
import { useQuests } from '../context/QuestContext';
import { useNPCs } from '../../npcs/context/NPCContext';
import { useLocations } from '../../locations/context/LocationContext';
import { resolveLocationName } from '../../locations/utils/location-display';
import Button from '../../../../core/components/Button';
import Typography from '../../../../core/components/Typography';
import { useNavigation } from 'shared/hooks/useNavigation';
import clsx from 'clsx';
import useHighlightTarget from 'shared/hooks/useHighlightTarget';
import QuestRowSummary from './QuestRowSummary';
import { Plus } from 'lucide-react';
import {
  RosterStatusBar,
  RosterFilterBar,
  RosterFilterSelect,
  RosterGroup,
  RosterRow,
  type RosterSegment,
  type RosterFilterOption,
  RosterSkeleton,
  RosterEmpty,
  RosterStatus,
  type RosterStatusTone,
} from 'core/components/Roster';

interface QuestDirectoryProps {
  quests: Quest[];
  isLoading?: boolean;
}

/** Column template shared by every row, so the columns line up across groups. */
const ROW_GRID =
  'grid-cols-[1fr_auto] md:grid-cols-[1.7fr_130px_190px_150px_26px]';

/**
 * Fixed, ordered groups instead of the location-based grouping NPCs use.
 *
 * `QuestStatus` has exactly three members, so grouping by status gives every
 * quest list the same stable shape -- "what's still open", "what's done",
 * "what failed" -- regardless of how many quests exist. Location, by contrast,
 * is open-ended and often unset, and would scatter quests across a long tail of
 * mostly-singleton groups. Location stays as a dedicated filter below instead.
 */
const STATUS_GROUPS: { key: QuestStatus; title: string }[] = [
  { key: 'active', title: 'Active Quests' },
  { key: 'completed', title: 'Completed Quests' },
  { key: 'failed', title: 'Failed Quests' },
];

/**
 * Quest state on the shared valence ramp, best to worst.
 *
 * Completed is stop 0 and failed is stop 3 -- the ends of the ramp, which
 * resolve to the same values `outcome.succeeded` and `outcome.failed.ink`
 * always had, so a quest looks exactly as it did. Active is the middle rather
 * than the accent now, because the accent means "interactive" everywhere else
 * and a quest that is merely open is not an action.
 */
const STATUS_TONE: Record<QuestStatus, RosterStatusTone> = {
  completed: 'valence-0',
  active: 'valence-1',
  failed: 'valence-3',
};

/**
 * The progress bar's fill, per state.
 *
 * Spelled out rather than built as `progress-bar-${quest.status}`. A class
 * name assembled from a variable is invisible to grep, which is how a token
 * survives a migration that was supposed to delete it -- and this phase has
 * now been bitten by exactly that twice.
 */
const PROGRESS_FILL: Record<QuestStatus, string> = {
  active: 'progress-bar-open',
  completed: 'progress-bar-succeeded',
  failed: 'progress-bar-failed',
};

const STATUS_COLOR: Record<QuestStatus, string> = {
  active: 'bg-valence-1',
  completed: 'bg-valence-0',
  failed: 'bg-valence-3',
};

/**
 * The quest roster: status bar, filters, status-grouped rows that expand in place.
 *
 * Extracted from QuestsPage, which was 613 lines against 84-114 for the other three
 * entity pages because it was the only one carrying its own roster. That asymmetry
 * is what left Quests behind on every pass over the directories -- it kept its stat
 * cards when the other three lost theirs, and kept the pre-redesign filter row when
 * the other three moved to the shared one. Now all four pages are a header plus a
 * directory, and a change to the roster shape is one edit in four sibling files
 * rather than three plus a page.
 */
const QuestDirectory: React.FC<QuestDirectoryProps> = ({
  quests,
  isLoading = false,
}) => {
  const { updateQuest, updateQuestObjective } = useQuests();
  const { getNPCById } = useNPCs();
  const { locations } = useLocations();
  const { navigateToPage, createPath, getCurrentQueryParams } = useNavigation();
  // T014: one hook, four consumers. This directory used to set a prop and do
  // nothing else, so a highlighted quest could sit off screen entirely.
  const { highlightedId: highlightedQuestId } = useHighlightTarget({
    items: quests,
    highlight: getCurrentQueryParams().highlight,
    idOf: (quest) => quest.id,
    domIdPrefix: 'quest',
    onReveal: ([questId]) => setExpandedQuestId(questId),
  });

  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'all'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedQuestId, setExpandedQuestId] = useState<string | null>(null);

  // Status counts drive the one bar that replaced three stat cards. All three
  // segments always sum to the total -- unlike a two-way "active vs completed"
  // split, there is no silently-implied remainder, since every quest has
  // exactly one of these three statuses.
  const statusSegments: RosterSegment[] = useMemo(() => {
    const count = (status: QuestStatus) =>
      quests.filter(q => q.status === status).length;
    return [
      // Best to worst, left to right, like every other directory's bar. The
      // grouped sections below keep active first, because a quest log is read
      // for what is still open; the bar is read as a ranking.
      { key: 'completed', label: 'completed', count: count('completed'), colorClass: STATUS_COLOR.completed },
      { key: 'active', label: 'active', count: count('active'), colorClass: STATUS_COLOR.active },
      { key: 'failed', label: 'failed', count: count('failed'), colorClass: STATUS_COLOR.failed },
    ];
  }, [quests]);

  // `quest.location` holds the location's id, so both the filter options and the
  // row's location cell used to read as slugs -- "mines-of-moria" where the
  // Locations page says "Mines of Moria" (#1412, the same defect NPCDirectory
  // had). Resolve once here and key everything -- display, options and the
  // filter comparison -- off the resolved name, so the three cannot disagree.
  //
  // `resolveLocationName` prefers `quest.locationId` (the canonical
  // reference) and falls back to the legacy `quest.location` free text for
  // documents written before that field existed; see the contract on
  // `NPC.location`.
  const questLocationName = useMemo(() => {
    const names = new Map<string, string>();
    quests.forEach(quest => {
      const resolved = resolveLocationName(
        { locationId: quest.locationId, location: quest.location },
        locations
      );
      if (resolved) {
        names.set(quest.id, resolved);
      }
    });
    return names;
  }, [quests, locations]);

  // Locations come from the quest data, so the option set is unbounded -- this is
  // the one filter dimension in any directory that pills cannot serve, and the
  // reason RosterFilterSelect exists.
  const locationOptions: RosterFilterOption[] = useMemo(() => {
    const uniqueLocations = new Set(questLocationName.values());
    return [
      { value: 'all', label: 'All Locations' },
      ...Array.from(uniqueLocations).sort().map(location => ({
        value: location,
        label: location,
      })),
    ];
  }, [questLocationName]);

  // Filter quests based on status, location and search query
  const filteredQuests = useMemo(() => {
    return quests.filter(quest => {
      // Status filter
      if (statusFilter !== 'all' && quest.status !== statusFilter) {
        return false;
      }

      // Location filter - must match exactly, on the same resolved name the
      // options were built from.
      if (locationFilter !== 'all') {
        if (questLocationName.get(quest.id)?.toLowerCase() !== locationFilter.toLowerCase()) {
          return false;
        }
      }

      // Search filter
      if (searchQuery) {
        const search = searchQuery.toLowerCase();
        return (
          quest.title.toLowerCase().includes(search) ||
          quest.description.toLowerCase().includes(search) ||
          quest.objectives.some(obj => obj.description.toLowerCase().includes(search)) ||
          quest.relatedNPCIds?.some(id => {
            // Resolve the id to its NPC's display name -- the same lookup the
            // expanded row below uses -- so a user typing a person's name
            // actually finds the quest. The raw id is still matched as a
            // fallback (`||`, never replacing the name check) so deep links
            // and copy-pasted ids keep working. An id that doesn't resolve
            // (deleted NPC) is never silently dropped: it still matches on
            // its raw text, mirroring the expanded row, which surfaces an
            // unresolvable id as "<id> (not found in NPC directory)" rather
            // than hiding it.
            const npc = getNPCById(id);
            return (
              npc?.name.toLowerCase().includes(search) ||
              id.toLowerCase().includes(search)
            );
          })
        );
      }

      return true;
    });
  }, [quests, statusFilter, locationFilter, searchQuery, getNPCById, questLocationName]);

  // Grouped by status, in the fixed order above, skipping groups with nothing
  // left after filtering.
  const groupedQuests = useMemo(() => {
    return STATUS_GROUPS.map(group => ({
      ...group,
      quests: filteredQuests.filter(q => q.status === group.key),
    })).filter(group => group.quests.length > 0);
  }, [filteredQuests]);

  /** An NPC id as a name and the line that tells two of them apart. */
  const npcFor = useCallback(
    (npcId: string) => {
      const npc = getNPCById(npcId);
      if (!npc) return null;
      return { name: npc.name, line: npc.occupation || '' };
    },
    [getNPCById]
  );

  if (isLoading) {
    return <RosterSkeleton label="Loading quests" />;
  }

  return (
    <div className="space-y-6">
      {/* One status bar that also filters, replacing three non-clickable stat cards */}
      <RosterStatusBar
        total={quests.length}
        totalLabel="sworn so far"
        segments={statusSegments}
        activeKey={statusFilter}
        onSelect={value => setStatusFilter(value as QuestStatus | 'all')}
      />

      {/* Search and location filter, on the row every directory shares */}
      <RosterFilterBar
        placeholder="Search quests..."
        value={searchQuery}
        onChange={setSearchQuery}
      >
        {locationOptions.length > 1 && (
          <RosterFilterSelect
            options={locationOptions}
            value={locationFilter}
            onChange={setLocationFilter}
            label="Filter by location"
          />
        )}
      </RosterFilterBar>

      {/* Quest roster by status */}
      {groupedQuests.length > 0 ? (
        groupedQuests.map(group => (
          <RosterGroup
            key={group.key}
            title={group.title}
            count={group.quests.length}
            // T015: completed and failed quests are history, not work. They
            // stay reachable and stay counted; they stop taking the top of the
            // list.
            collapsible={group.key === 'completed' || group.key === 'failed'}
            defaultCollapsed={group.key === 'completed' || group.key === 'failed'}
          >
            {group.quests.map((quest, index) => {
              const isExpanded = expandedQuestId === quest.id;
              const completedObjectives = quest.objectives.filter(obj => obj.completed).length;
              const totalObjectives = quest.objectives.length;

              return (
                <RosterRow
                  key={quest.id}
                  id={`quest-${quest.id}`}
                  entityId={quest.id}
                  entityName={quest.title}
                  gridClassName={ROW_GRID}
                  isFirst={index === 0}
                  highlighted={highlightedQuestId === quest.id}
                  expanded={isExpanded}
                  toggleLabel={quest.title}
                  onToggle={() => setExpandedQuestId(isExpanded ? null : quest.id)}
                  expandedContent={
                    <QuestRowSummary
                      quest={quest}
                      npcFor={npcFor}
                      onToggleObjective={(objectiveId, completed) =>
                        updateQuestObjective(quest.id, objectiveId, completed)
                      }
                      onChangeStatus={(status) => updateQuest({ ...quest, status })}
                      onOpenNPC={(npcId) => navigateToPage(`/npcs/${npcId}`)}
                      onOpenQuest={() => navigateToPage(`/quests/${quest.id}`)}
                    />
                  }
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <Typography
                      variant="body"
                      className="font-semibold truncate font-heading"
                    >
                      {quest.title}
                    </Typography>
                  </div>

                  <RosterStatus tone={STATUS_TONE[quest.status]}>
                    {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
                  </RosterStatus>

                  {/* Objective progress -- the detail that makes quests more than a
                      plain roster entry, so it stays visible on the collapsed row. */}
                  <div className="hidden md:flex flex-col gap-1 min-w-0">
                    <Typography variant="body-sm" color="secondary" className="text-sm">
                      {totalObjectives > 0
                        ? `${completedObjectives} of ${totalObjectives} objectives`
                        : 'No objectives'}
                    </Typography>
                    {totalObjectives > 0 && (
                      <div className="w-full rounded-full h-1.5 progress-container">
                        <div
                          className={clsx('rounded-full h-1.5', PROGRESS_FILL[quest.status])}
                          style={{ width: `${(completedObjectives / totalObjectives) * 100}%` }}
                        />
                      </div>
                    )}
                  </div>

                  <Typography
                    variant="body-sm"
                    color="secondary"
                    className="hidden md:block text-sm truncate"
                  >
                    {questLocationName.get(quest.id) || '—'}
                  </Typography>
                </RosterRow>
              );
            })}
          </RosterGroup>
        ))
      ) : quests.length > 0 ? (
        <RosterEmpty
          title="No quests match these filters"
          message="Try a different search term, or clear the filters to see everything the party has taken on."
        />
      ) : (
        <RosterEmpty
          title="Nothing taken on yet"
          message="What the party agreed to do, who asked, and how far along it is — with the objectives ticked off as you go."
          action={
            <Button
              onClick={() => navigateToPage('/quests/create')}
              startIcon={<Plus className="w-4 h-4" />}
            >
              Add the first quest
            </Button>
          }
        />
      )}
    </div>
  );
};

export default QuestDirectory;
