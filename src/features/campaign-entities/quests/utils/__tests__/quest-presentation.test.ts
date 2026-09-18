// src/features/campaign-entities/quests/utils/__tests__/quest-presentation.test.ts
import {
  QUEST_STATUS_OPTIONS,
  formatQuestStatus,
  moveObjective,
  objectiveProgressLabel,
  objectiveProgressOf,
  questMetaLine,
} from '../quest-presentation';
import { Quest, QuestObjective } from '../../types';

const objective = (id: string, completed = false): QuestObjective => ({
  id,
  description: `Do ${id}`,
  completed,
});

const quest = (overrides: Partial<Quest> = {}): Quest =>
  ({
    id: 'reclaim-erebor',
    title: 'Reclaim Erebor',
    description: 'Take back the mountain.',
    status: 'active',
    objectives: [objective('a', true), objective('b'), objective('c')],
    ...overrides,
  } as Quest);

describe('objectiveProgressOf', () => {
  it('counts what is ticked against the whole list', () => {
    expect(objectiveProgressOf(quest().objectives)).toEqual({
      completed: 1,
      total: 3,
      allComplete: false,
    });
  });

  it('reports allComplete only when there is something to complete', () => {
    // A quest with no objectives has not "finished them all" -- it has none,
    // which is why the page never offers completion for one.
    expect(objectiveProgressOf([]).allComplete).toBe(false);
    expect(objectiveProgressOf([objective('a', true)]).allComplete).toBe(true);
  });

  it('treats a missing list as an empty one', () => {
    expect(objectiveProgressOf(undefined)).toEqual({
      completed: 0,
      total: 0,
      allComplete: false,
    });
  });
});

describe('objectiveProgressLabel', () => {
  it('reads "1 of 3 objectives"', () => {
    expect(objectiveProgressLabel(quest().objectives)).toBe('1 of 3 objectives');
  });

  it('says a quest has none rather than "0 of 0"', () => {
    expect(objectiveProgressLabel([])).toBe('No objectives yet');
  });
});

describe('questMetaLine', () => {
  it('states progress, place and level range in one line', () => {
    expect(questMetaLine(quest(), 'Erebor')).toBe('1 of 3 objectives · Erebor');
  });

  it('adds the level range when the quest has one', () => {
    expect(questMetaLine(quest({ levelRange: '7-9' }), 'Erebor')).toBe(
      '1 of 3 objectives · Erebor · levels 7-9'
    );
  });

  it('states only what exists', () => {
    // A quest with no place and no level range says how far along it is and
    // stops, rather than "No objectives yet · · levels".
    expect(questMetaLine(quest({ objectives: [] }))).toBe('No objectives yet');
  });

  it('names the completion date only for a quest that concluded', () => {
    expect(questMetaLine(quest({ status: 'completed' }), 'Erebor', '31 May 2025')).toBe(
      '1 of 3 objectives · Erebor · completed 31 May 2025'
    );
    expect(questMetaLine(quest({ status: 'active' }), 'Erebor', '31 May 2025')).toBe(
      '1 of 3 objectives · Erebor'
    );
  });
});

describe('the status ladder', () => {
  it('offers the three states as words, best known first', () => {
    expect(QUEST_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'active',
      'completed',
      'failed',
    ]);
  });

  it('names no class of its own', () => {
    // `15-4` removed `selectedClassName` after five options named theme
    // classes no stylesheet defines. Nothing here may grow one back.
    QUEST_STATUS_OPTIONS.forEach((option) => {
      expect(Object.keys(option)).toEqual(['value', 'label']);
    });
  });

  it('sentence-cases a stored status', () => {
    expect(formatQuestStatus('failed')).toBe('Failed');
  });
});

describe('moveObjective', () => {
  const list = [objective('a'), objective('b'), objective('c')];

  it('swaps with the neighbour above or below', () => {
    expect(moveObjective(list, 'b', 'up').map((o) => o.id)).toEqual(['b', 'a', 'c']);
    expect(moveObjective(list, 'b', 'down').map((o) => o.id)).toEqual(['a', 'c', 'b']);
  });

  it('returns the very same array at either end, so the caller can skip the write', () => {
    // Identity, not equality: `moveQuestObjective` uses it to decide whether
    // to write at all, and a no-op write still stamps `dateModified`.
    expect(moveObjective(list, 'a', 'up')).toBe(list);
    expect(moveObjective(list, 'c', 'down')).toBe(list);
  });

  it('returns the same array for an objective that is not in the list', () => {
    expect(moveObjective(list, 'missing', 'up')).toBe(list);
  });

  it('does not mutate the list it is given', () => {
    moveObjective(list, 'b', 'up');
    expect(list.map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });
});
