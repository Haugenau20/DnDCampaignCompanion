// src/test-utils/accent-budget.ts
//
// The rule PR 8.3 holds: a surface has at most one filled accent, and it is the
// control that writes.
//
// D66 replaced "exactly one accent per page" with something that survives a
// permanent composer: an accent marks a control that *changes the record*.
// D78 added the other half — the count is per **surface**, not per DOM tree, so
// an open modal is entitled to its own primary action while the form behind it
// is inert.
//
// On a form that means the submit, and nothing else. `Add tag` builds a draft;
// the record changes when you save. Three filled buttons on one form is the same
// defect as three accents on a page: the eye has nowhere to go.

/** Elements wearing the filled primary paint. */
const filled = (container: HTMLElement): HTMLElement[] =>
  Array.from(container.querySelectorAll<HTMLElement>(".button-primary"));

const describeButton = (el: HTMLElement): string =>
  (el.textContent || el.getAttribute("aria-label") || "(unlabelled)").trim().slice(0, 40);

/**
 * The filled accents on the form itself — everything outside any open dialog.
 * Returns labels rather than a count so a failure names the offenders.
 */
export const formAccentsIn = (container: HTMLElement): string[] =>
  filled(container)
    .filter((el) => el.closest('[role="dialog"]') === null)
    .map(describeButton);

/** The filled accents inside each open dialog, keyed by the dialog's position. */
export const dialogAccentsIn = (container: HTMLElement): string[] =>
  filled(container)
    .filter((el) => el.closest('[role="dialog"]') !== null)
    .map(describeButton);
