// src/features/campaign-entities/quests/utils/quest-presentation.ts
import { Quest, QuestObjective, QuestStatus } from '../types';

/**
 * How a quest says what it is, in one place.
 *
 * Shared by the directory row and `/quests/:questId` so the two cannot
 * disagree about what "1 of 3 objectives" means or which word a status is
 * called. `15-4` learned this the hard way on locations, where the row and the
 * page had each spelled the knowledge ladder for themselves and shipped it in
 * two different orders.
 */

/**
 * The status ladder: active, completed, failed.
 *
 * No `selectedClassName` -- `15-4` removed the prop rather than respelling the
 * five theme classes it named that no stylesheet defines (`outcome-completed`
 * and `outcome-failed` were two of them). The selected chip says "this is the
 * current one"; the *valence* of a concluded quest belongs to the status word
 * in the row, which is `RosterStatus`.
 */
export const QUEST_STATUS_OPTIONS: Array<{ value: QuestStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

/** Sentence-case a stored status for display. */
export const formatQuestStatus = (status: QuestStatus): string =>
  status.charAt(0).toUpperCase() + status.slice(1);

/** How far along the quest is, counted once. */
export interface ObjectiveProgress {
  completed: number;
  total: number;
  /** Every objective ticked, and there is at least one. */
  allComplete: boolean;
}

export const objectiveProgressOf = (objectives: QuestObjective[] = []): ObjectiveProgress => {
  const total = objectives.length;
  const completed = objectives.filter((objective) => objective.completed).length;
  return { completed, total, allComplete: total > 0 && completed === total };
};

/** "1 of 3 objectives", or "No objectives yet" when there are none. */
export const objectiveProgressLabel = (objectives: QuestObjective[] = []): string => {
  const { completed, total } = objectiveProgressOf(objectives);
  return total > 0 ? `${completed} of ${total} objectives` : 'No objectives yet';
};

/**
 * The one line under a quest's title on its page: how far along, where it
 * happens, and what level it is pitched at.
 *
 * Only what exists, and **never an id**. The quest card printed `bag-end` and
 * `erebor` as though they were labels (#1412, item 10); `locationName` is
 * resolved by the caller through `resolveLocationName`, and an unresolvable
 * reference is left out of the line rather than shown raw.
 */
export function questMetaLine(
  quest: Quest,
  locationName?: string,
  dateCompleted?: string
): string {
  return [
    objectiveProgressLabel(quest.objectives),
    locationName || undefined,
    quest.levelRange ? `levels ${quest.levelRange}` : undefined,
    quest.status === 'completed' && dateCompleted ? `completed ${dateCompleted}` : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Move one objective one place up or down, returning a new array.
 *
 * Pure, and the only place the order changes. A move that would fall off
 * either end returns the list unchanged rather than wrapping: the last
 * objective's "move down" is disabled in the UI, and a write that silently
 * teleported it to the top would be the kind of surprise §7 exists to prevent.
 */
export function moveObjective(
  objectives: QuestObjective[],
  objectiveId: string,
  direction: 'up' | 'down'
): QuestObjective[] {
  const index = objectives.findIndex((objective) => objective.id === objectiveId);
  if (index === -1) return objectives;

  const target = direction === 'up' ? index - 1 : index + 1;
  if (target < 0 || target >= objectives.length) return objectives;

  const next = [...objectives];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
