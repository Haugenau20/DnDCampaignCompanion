// src/features/campaign-entities/rumors/utils/rumor-presentation.ts
import type { RosterStatusTone } from 'core/components/Roster';
import { RumorStatus, SourceType } from '../types';

/**
 * How a rumour says what it is, in one place.
 *
 * Shared by the row, the composer and the summary bar so the three cannot
 * disagree about what `false` is called or which rung it sits on. They did:
 * the directory's own comment said confirmed and disproved "sit on the same
 * rung", while the map beneath it put disproved on the ramp's red -- and the
 * word rendered was "False".
 */

/**
 * **"Disproved", never "False"** (§10, item 6).
 *
 * `false` is the stored value. What a reader sees describes what the party
 * did: they went and found out it was not true, which is a *result*, not a
 * data value and not a failure.
 */
export const formatRumorStatus = (status: RumorStatus): string => {
  if (status === 'false') return 'Disproved';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * The rumour ladder: unconfirmed -> confirmed -> disproved. Never a verdict.
 *
 * No `selectedClassName`: `15-4` removed that prop, and `ladder-classes.test.ts`
 * (written in `15-6`) now fails if one grows back.
 */
export const RUMOR_STATUS_OPTIONS: Array<{ value: RumorStatus; label: string }> = [
  { value: 'unconfirmed', label: 'Unconfirmed' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'false', label: 'Disproved' },
];

/**
 * A rumour is knowledge, not an outcome.
 *
 * **Confirmed and disproved share the ladder's top rung**: both are fully
 * known, and what separates them is the strike cue (`negated`), not the hue.
 * That is colour schema §3's worked example, `R64`'s decision, and what T008
 * is filed against -- and until `15-7` the code did the opposite, painting a
 * disproved rumour `valence-3`, the same red a failed quest wears. A party
 * that goes and disproves something has done the work; saying so in red claims
 * it went wrong.
 */
export const RUMOR_STATUS_TONE: Record<RumorStatus, RosterStatusTone> = {
  confirmed: 'valence-0',
  false: 'valence-0',
  unconfirmed: 'valence-1',
};

/** The bar's segment fill, from the same mapping, for the same reason. */
export const RUMOR_STATUS_FILL: Record<RumorStatus, string> = {
  confirmed: 'bg-valence-0',
  false: 'bg-valence-0',
  unconfirmed: 'bg-valence-1',
};

/**
 * Where a rumour came from, as five buttons rather than a dropdown (item 4).
 *
 * Five short options do not need a select. The wording is the question's:
 * "heard from **an NPC**", not "source type: npc".
 *
 * **`other` is one of them now.** It used to be excluded on the grounds that
 * it was the create form's default for "nobody said" rather than an answer --
 * true of the stored data, but it left a reader who genuinely heard something
 * from none of the other four with nothing to press, while the collapsed row
 * cheerfully printed "Other" at them anyway. The absence of an answer is now
 * `sourceType` being absent; `other` means what it says.
 */
export const SOURCE_OPTIONS: Array<{ value: SourceType; label: string }> = [
  { value: 'npc', label: 'An NPC' },
  { value: 'traveler', label: 'A traveller' },
  { value: 'tavern', label: 'A tavern' },
  { value: 'notice', label: 'A notice' },
  { value: 'other', label: 'Something else' },
];

/** What the row prints where a source kind would go, when there is none. */
export const NO_SOURCE = '—';

/**
 * Human-readable source kind, for the row's collapsed line and the filters.
 *
 * An absent kind is an em dash, not "Other": nobody has said where this came
 * from, and saying "Other" would be answering on their behalf.
 */
export const formatSourceType = (type?: SourceType | null): string =>
  !type ? NO_SOURCE : type === 'npc' ? 'NPC' : type.charAt(0).toUpperCase() + type.slice(1);
