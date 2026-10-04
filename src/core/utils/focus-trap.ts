// src/core/utils/focus-trap.ts
import type React from "react";

/** What Tab can land on inside a container. */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Keep Tab inside a modal surface: from the last stop to the first, and with
 * Shift from the first back to the last. Call it from the surface's own
 * `onKeyDown`, so nested surfaces each trap on their own without knowing
 * about one another.
 *
 * The container itself counts as "before the first stop", since a surface
 * usually focuses itself on opening. A container with nothing focusable
 * keeps focus where it is: letting Tab through would drop the reader behind
 * the backdrop.
 *
 * @param event The keydown on the container
 * @param container The modal surface
 */
export function keepTabInside(event: React.KeyboardEvent, container: HTMLElement | null): void {
  if (event.key !== "Tab" || !container) return;

  const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusable.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;

  if (event.shiftKey) {
    if (active === first || active === container) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last) {
    event.preventDefault();
    first.focus();
  }
}
