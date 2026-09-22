// src/shared/utils/derived-title.ts

/**
 * Maximum length of a title derived from a record's own body text.
 *
 * Sized to roughly one line of a 30px display face, NOT to prose. It was 80
 * initially, which is a comfortable prose measure but far wider than that
 * heading renders: a first line of ordinary length was clipped mid-word
 * ("...at the Stonehill Inn in P") with nothing to signal it.
 *
 * The cap is not the whole answer -- an explicit title the user types is not
 * capped at all -- so index rows also truncate with an ellipsis in CSS. That
 * ellipsis is presentational; it never enters the stored value, because a
 * stored "..." would be indistinguishable from one the user typed.
 */
export const MAX_DERIVED_TITLE_LENGTH = 52;

/**
 * The title a record takes from its own body: its first non-empty line,
 * trimmed and capped at {@link MAX_DERIVED_TITLE_LENGTH} characters.
 *
 * The cap lands on a word boundary and adds **no ellipsis** — this value may
 * be stored, and a stored ellipsis would be indistinguishable from one the
 * user typed. Visual truncation is the index's job.
 *
 * Lives in `shared/` rather than in either feature that wants it. It began as
 * `notes/utils/note-title`, and the rumour row needs exactly the same
 * algorithm; importing it from `features/collaboration` would have closed a
 * barrel cycle (`collaboration/index` → `CampaignLinksPanel` →
 * `campaign-entities/index` → rumours → back), which is the trap
 * `services/firebase/index.ts` already taught this codebase once. A pure
 * function that belongs to no domain belongs here.
 *
 * @param content Raw body text
 * @returns The derived title, or "" when the content has no non-empty line
 */
export function deriveTitle(content: string): string {
  const firstLine = (content ?? "")
    .split("\n")
    .map(line => line.trim())
    .find(line => line.length > 0);

  if (!firstLine) return "";
  if (firstLine.length <= MAX_DERIVED_TITLE_LENGTH) return firstLine;

  // One character past the cap, so a space sitting exactly on the boundary
  // still counts as a boundary rather than forcing a cut one word earlier.
  const window = firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH + 1);
  const lastSpace = window.lastIndexOf(" ");

  // A single token longer than the cap has no boundary to cut on.
  if (lastSpace <= 0) return firstLine.slice(0, MAX_DERIVED_TITLE_LENGTH);

  return window.slice(0, lastSpace).trimEnd();
}
