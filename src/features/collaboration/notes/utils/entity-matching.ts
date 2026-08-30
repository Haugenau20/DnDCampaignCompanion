// src/features/collaboration/notes/utils/entity-matching.ts

/** Leading articles are dropped from a candidate before matching, so an
 *  entity stored as "The Stonehill Inn" still matches "Stonehill Inn". */
const LEADING_ARTICLE = /^(the|a|an)\s+/i;

/** Characters that must be taken literally inside a generated RegExp. */
const REGEXP_METACHARACTERS = /[.*+?^${}()|[\]\\]/g;

function escapeForRegExp(value: string): string {
  return value.replace(REGEXP_METACHARACTERS, "\\$&");
}

/**
 * Whether `candidate` occurs in `noteText` as a whole-word run.
 *
 * This replaces the `normalizedNote.includes(normalizedName)` test that used
 * to drive reference finding. That test ran both sides through
 * `normalizeTextForComparison`, which replaces every run of `[.,!?;:\s]+`
 * with a single dash — so `"We camped in the cave. Wave Echo starts"` became
 * `cave-wave-echo-starts` and matched an entity named "Cave Wave Echo" across
 * a sentence boundary. Matching against the raw text with word-boundary
 * guards makes that impossible, because the full stop is still there.
 *
 * `normalizeTextForComparison` is deliberately left alone: it is still
 * correct for the entity-vs-entity equality checks in EntityExtractor.
 *
 * Word boundaries are expressed as "not a letter or digit" on either side
 * rather than `\b`, so that candidates beginning or ending with punctuation
 * (e.g. `"Inn (Old)"`) still behave. Lookbehind is avoided for browser reach.
 *
 * @param noteText The raw note body
 * @param candidate The entity name or title to look for
 */
export function matchesInText(noteText: string, candidate: string): boolean {
  if (!noteText || !candidate) return false;

  const stripped = candidate.replace(LEADING_ARTICLE, "").trim();
  if (!stripped) return false;

  // Escape first, then relax internal whitespace so a name spanning a line
  // break or a double space still matches.
  const pattern = escapeForRegExp(stripped).replace(/\s+/g, "\\s+");
  const boundary = "[^\\p{L}\\p{N}]";
  const expression = new RegExp(`(^|${boundary})${pattern}($|${boundary})`, "iu");

  return expression.test(noteText);
}
