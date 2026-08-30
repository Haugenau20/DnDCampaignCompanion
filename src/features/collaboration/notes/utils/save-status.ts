// src/features/collaboration/notes/utils/save-status.ts

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** Past this age a relative phrase stops being useful and a date is clearer. */
const ABSOLUTE_THRESHOLD_DAYS = 7;

/**
 * Human phrasing for when a note was last saved.
 *
 * Replaces `NoteEditor.getLastSavedText`, which had no day unit: its final
 * branch divided the elapsed seconds by 3600 forever, so a note last saved
 * over a year earlier read "Saved 10870h ago".
 *
 * @param lastSaved When the note was last written
 * @param now Injected for deterministic tests; defaults to the current time
 */
export function formatLastSaved(lastSaved: Date, now: Date = new Date()): string {
  const elapsed = now.getTime() - lastSaved.getTime();

  if (elapsed < MINUTE_MS) return "Saved just now";

  // "en" is pinned rather than left to the default locale: under jest the
  // host locale is not guaranteed to render "2 minutes ago", and this value
  // is asserted verbatim in tests. `numeric: "always"` keeps the phrasing
  // uniform ("2 minutes ago") instead of switching to "last minute" /
  // "yesterday" partway up the scale.
  const relative = new Intl.RelativeTimeFormat("en", { numeric: "always" });

  if (elapsed < HOUR_MS) {
    return `Saved ${relative.format(-Math.floor(elapsed / MINUTE_MS), "minute")}`;
  }

  if (elapsed < DAY_MS) {
    return `Saved ${relative.format(-Math.floor(elapsed / HOUR_MS), "hour")}`;
  }

  const days = Math.floor(elapsed / DAY_MS);
  if (days <= ABSOLUTE_THRESHOLD_DAYS) {
    return `Saved ${relative.format(-days, "day")}`;
  }

  return `Saved on ${lastSaved.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
  })}`;
}
