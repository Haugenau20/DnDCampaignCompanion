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
