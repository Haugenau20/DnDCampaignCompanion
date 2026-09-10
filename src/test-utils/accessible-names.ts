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

/** Controls that owe the user a name. */
const NAMEABLE = "input, select, textarea";

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
      const hint =
        el.getAttribute("placeholder") ||
        el.getAttribute("name") ||
        (el as HTMLInputElement).value ||
        "(no placeholder, name or value to identify it by)";
      return `${tag} — ${hint}`;
    });

/**
 * Every button inside `container` with no accessible name.
 *
 * A separate export rather than an extension of `NAMEABLE`, deliberately.
 * `unnamedControlsIn` covers `input, select, textarea` — buttons were never in
 * it, so an icon-only button with no name passes that gate silently. 9.2 is the
 * first PR to add icon-only buttons (the markdown toolbar's three) and its own
 * brief warns against exactly that regression, so it needs a check that can
 * actually see them.
 *
 * Extending `NAMEABLE` itself was measured first and is a bigger job than this
 * PR: it fails 5 form suites, and in `QuestCreateForm` the 6 offenders are
 * rendered by the **real** `Button`, not by a stub — real unnamed controls in
 * the forms Phase 8 audited. See R34. Closing that belongs with the forms.
 *
 * A button is named by its own text, or by `aria-label` / `aria-labelledby`.
 */
export const unnamedButtonsIn = (container: HTMLElement): string[] =>
  Array.from(container.querySelectorAll<HTMLElement>("button"))
    .filter((el) => {
      const own = el.textContent?.trim();
      if (own) return false;
      return accessibleNameOf(el) === "";
    })
    .map((el) => {
      const hint =
        el.getAttribute("title") ||
        el.getAttribute("data-testid") ||
        "(no title or testid to identify it by)";
      return `button — ${hint}`;
    });
