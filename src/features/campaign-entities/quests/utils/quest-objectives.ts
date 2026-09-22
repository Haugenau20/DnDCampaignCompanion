// src/features/campaign-entities/quests/utils/quest-objectives.ts
import { QuestObjective } from '../types';

/**
 * Coerce whatever arrives into the `QuestObjective[]` a quest document must
 * hold.
 *
 * `Quest.objectives` has always been `QuestObjective[]`. Nothing enforced it:
 * the extraction function's schema returns `objectives` as `string[]`,
 * `convertEntity` passed that array on with a comment calling it "raw", the
 * quick-add carry did not own the key, and `buildDocument` spread it straight
 * over its own `objectives: []`. Bare strings reached Firestore.
 *
 * That was not a display defect. `QuestDirectory`'s search filter runs
 * `quest.objectives.some(obj => obj.description.toLowerCase()...)` on every
 * keystroke, and `undefined.toLowerCase()` throws -- so a single converted
 * quest took the whole directory down the moment anyone typed in the search
 * box. The row summary separately rendered checkboxes with `key={undefined}`
 * and no label.
 *
 * This is deliberately at the *write* boundary rather than in `convertEntity`.
 * Extraction is the source that is known to send strings today, but the type
 * has to hold for every path that reaches a document, and the carry mechanism
 * will hand `buildDocument` whatever it was given.
 *
 * Anything that cannot be read as an objective is dropped rather than written
 * as a blank row: a quest with two objectives and one unreadable fragment is
 * better than one with three, one of which says nothing.
 *
 * The id it invents is **positional, not random**, and that is deliberate.
 * This runs on read as well as on write -- documents written before the fix
 * already hold bare strings, and they have to stop crashing the directory
 * without waiting for someone to edit them. `crypto.randomUUID()` would mint
 * a different id for the same objective on every load, churning React keys and
 * making the id mean nothing between one render and the next. A position is
 * stable for as long as the list is, and the first write through
 * `writeObjectives` persists these ids and repairs the document for good.
 */
export const normaliseObjectives = (value: unknown): QuestObjective[] => {
  if (!Array.isArray(value)) return [];

  return value.reduce<QuestObjective[]>((acc, entry) => {
    const description =
      typeof entry === 'string'
        ? entry.trim()
        : typeof (entry as QuestObjective)?.description === 'string'
          ? (entry as QuestObjective).description.trim()
          : '';

    // The description is the only part a reader needs. An absent id or
    // `completed` is recoverable; an empty description is not.
    if (!description) return acc;

    const source = entry as Partial<QuestObjective>;
    acc.push({
      // `acc.length`, not the source index: dropped entries must not leave
      // gaps, or two loads of the same list could disagree about which
      // objective `objective-2` names.
      id: typeof source?.id === 'string' && source.id
        ? source.id
        : `objective-${acc.length}`,
      description,
      completed: source?.completed === true,
    });
    return acc;
  }, []);
};
