// src/features/campaign-entities/quests/utils/__tests__/quest-objectives.test.ts
import { normaliseObjectives } from '../quest-objectives';
import { QuestObjective } from '../../types';

/**
 * `Quest.objectives` is `QuestObjective[]`. The extraction function's schema
 * returns `string[]`, and until T050 that array reached Firestore untouched --
 * `convertEntity` passed it through, the quick-add carry did not own the key,
 * and `buildDocument` spread it over its own `objectives: []`.
 *
 * The consequence was not cosmetic. `QuestDirectory`'s search filter runs
 * `quest.objectives.some(obj => obj.description.toLowerCase()...)` on every
 * keystroke, so one converted quest took the whole directory down as soon as
 * anybody typed in the search box. These cases pin the repair at the boundary
 * that writes the document, which is the last place the type can still be made
 * to hold.
 */
describe('normaliseObjectives', () => {
  describe('the shape the extractor actually returns', () => {
    test('turns a string[] into QuestObjective[]', () => {
      const result = normaliseObjectives(['Search the cave', 'Defeat the guardian']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: expect.any(String),
        description: 'Search the cave',
        completed: false,
      });
      expect(result[1].description).toBe('Defeat the guardian');
    });

    test('every objective gets an id, and no two share one', () => {
      const result = normaliseObjectives(['a', 'b', 'c', 'a']);
      const ids = result.map((o) => o.id);

      expect(new Set(ids).size).toBe(4);
      ids.forEach((id) => expect(id).toBeTruthy());
    });

    test('the same input yields the same ids, because this also runs on read', () => {
      // Documents written before the fix hold bare strings and are normalised
      // every time they are loaded. A random id would churn React keys and
      // mean nothing from one render to the next.
      const first = normaliseObjectives(['Search the cave', 'Defeat the guardian']);
      const second = normaliseObjectives(['Search the cave', 'Defeat the guardian']);

      expect(first.map((o) => o.id)).toEqual(second.map((o) => o.id));
    });

    test('dropped entries leave no gap in the invented ids', () => {
      // Positional ids come from the output position, not the input one --
      // otherwise two loads could disagree about which objective is which.
      const result = normaliseObjectives(['', 'Kept one', '   ', 'Kept two']);

      expect(result.map((o) => o.id)).toEqual(['objective-0', 'objective-1']);
      expect(result.map((o) => o.description)).toEqual(['Kept one', 'Kept two']);
    });

    test('a converted objective starts unticked', () => {
      // Nobody has said the party did this yet. The extractor reports what a
      // note mentions, not what was achieved.
      expect(normaliseObjectives(['Find the ring']).every((o) => !o.completed)).toBe(true);
    });

    test('the result survives what crashed the directory', () => {
      const result = normaliseObjectives(['Search the cave']);

      // The exact expression at QuestDirectory.tsx:199.
      expect(() =>
        result.some((obj) => obj.description.toLowerCase().includes('cave'))
      ).not.toThrow();
      expect(result.some((obj) => obj.description.toLowerCase().includes('cave'))).toBe(true);
    });
  });

  describe('objectives that are already the right shape', () => {
    test('passes a well-formed QuestObjective[] through unchanged', () => {
      const existing: QuestObjective[] = [
        { id: 'obj-1', description: 'Already here', completed: true },
      ];

      expect(normaliseObjectives(existing)).toEqual(existing);
    });

    test('keeps a completed objective completed', () => {
      // An edit path re-saving a quest must not silently untick its work.
      const existing: QuestObjective[] = [
        { id: 'obj-1', description: 'Done', completed: true },
        { id: 'obj-2', description: 'Not done', completed: false },
      ];

      expect(normaliseObjectives(existing).map((o) => o.completed)).toEqual([true, false]);
    });
  });

  describe('everything else', () => {
    test.each([
      ['undefined', undefined],
      ['null', null],
      ['a string', 'Search the cave'],
      ['a number', 7],
      ['an object', { description: 'lonely' }],
    ])('%s yields an empty list rather than throwing', (_label, input) => {
      expect(normaliseObjectives(input as never)).toEqual([]);
    });

    test('drops entries that carry no description', () => {
      const result = normaliseObjectives([
        'Good one',
        '',
        '   ',
        null,
        undefined,
        { id: 'x', completed: false },
      ] as never);

      expect(result).toHaveLength(1);
      expect(result[0].description).toBe('Good one');
    });

    test('repairs a half-formed objective rather than discarding it', () => {
      // A description is the only part a reader needs; an absent id or
      // `completed` is recoverable, and losing the objective is not.
      const result = normaliseObjectives([{ description: 'Half a record' }] as never);

      expect(result).toEqual([
        { id: expect.any(String), description: 'Half a record', completed: false },
      ]);
    });

    test('trims surrounding whitespace', () => {
      expect(normaliseObjectives(['  Search the cave  '])[0].description)
        .toBe('Search the cave');
    });
  });
});
