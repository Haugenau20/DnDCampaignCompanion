// src/test-utils/accessible-names.ts
//
// The gate PR 8.1 exists to hold: every form control has a name.
//
// Seventeen hand-written labels in the entity forms sat *beside* their controls
// rather than being attached to them — `<label className="...">` with no
// `htmlFor`, against a control with no `id`. A label like that is a visual
// label only: a screen reader announces the control unnamed, and
// `getByLabelText` cannot find it. WCAG 1.3.1 and 4.1.2.
//
// A grep proved the old markup was gone. It cannot prove the new markup is
// right, because a `<Select>` whose `label` prop was dropped in the move looks
// exactly as clean. So the check walks the rendered DOM instead and asks each
// control what its name is.

/**
 * Controls that owe the user a name.
 *
 * `button` joined this list when R34 was closed in 10.2. It was left out
 * originally, so an icon-only button passed the gate unseen and needed a
 * second helper (`unnamedButtonsIn`) to catch it -- two ways to ask one
 * question, which is how the two drifted apart.
 *
 * Adding `button` here is only correct alongside the BUTTON branch in
 * `accessibleNameOf`. Without it the gate reports every button named by its
 * own text -- "Save", "Cancel", "Sign in" -- as unnamed: 11 suites rather than
 * the 5 that have a real defect, and an invitation to "fix" a correctly
 * labelled submit button by bolting an `aria-label` onto it, which is D89's
 * mistake exactly.
 */
const NAMEABLE = "input, select, textarea, button";

/**
 * Inputs whose name is carried by something other than a label, legitimately.
 *
 * A submit button is named by its own text, and a hidden input is not a control
 * anyone interacts with.
 */
const isExempt = (el: HTMLElement): boolean => {
  const type = (el.getAttribute("type") || "").toLowerCase();
  return el.tagName === "INPUT" && ["hidden", "submit", "button", "reset"].includes(type);
};

/**
 * The accessible name of a control, by the routes that actually apply here:
 * an associated `<label>`, `aria-label`, or `aria-labelledby`.
 *
 * Deliberately does NOT count `placeholder`. A placeholder is the name a
 * control has until someone types in it, which is to say it is not a name —
 * and "the field whose only label was its placeholder" is one of the exact
 * cases 8.1 was written to fix.
 */
export const accessibleNameOf = (el: HTMLElement): string => {
  const labelledBy = el.getAttribute("aria-labelledby");
  if (labelledBy) {
    const named = labelledBy
      .split(/\s+/)
      .map((id) => document.getElementById(id)?.textContent?.trim() || "")
      .join(" ")
      .trim();
    if (named) return named;
  }

  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return ariaLabel;

  if (el.id) {
    const label = document.querySelector<HTMLLabelElement>(
      `label[for="${CSS.escape(el.id)}"]`
    );
    const named = label?.textContent?.trim();
    if (named) return named;
  }

  // A control wrapped in its own <label> is named by it too.
  const wrapping = el.closest("label");
  if (wrapping) {
    const named = wrapping.textContent?.trim();
    if (named) return named;
  }

  // A button is named by its own contents (accname step 2F). Nothing else in
  // NAMEABLE is: an <input>'s text content is always empty, and a <select>'s
  // is its option list, which is a value rather than a name.
  if (el.tagName === "BUTTON") {
    const own = el.textContent?.trim();
    if (own) return own;
  }

  return "";
};

/**
 * Every control inside `container` that has no accessible name, described well
 * enough to find in the source.
 *
 * Returns an array so a failing assertion prints *which* controls are unnamed
 * rather than only how many.
 */
export const unnamedControlsIn = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll<HTMLElement>(NAMEABLE))
    .filter((el) => !isExempt(el))
    .filter((el) => accessibleNameOf(el) === "")
    .map((el) => {
      const type = el.getAttribute("type");
      const tag = type ? `${el.tagName.toLowerCase()}[type=${type}]` : el.tagName.toLowerCase();
      // A button has no placeholder, name or value to give itself away, so it
      // is identified by whatever the markup does carry -- otherwise a failure
      // says only that six buttons somewhere are unnamed.
      const hint =
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        (el as HTMLInputElement).value ||
        el.getAttribute("title") ||
        el.getAttribute("data-testid") ||
        el.className.toString().trim().split(/\s+/).slice(0, 3).join(" ") ||
        "(nothing in the markup to identify it by)";
      return `${tag} — ${hint}`;
    });
