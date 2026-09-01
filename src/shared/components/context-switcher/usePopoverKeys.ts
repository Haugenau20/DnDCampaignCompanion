// src/shared/components/context-switcher/usePopoverKeys.ts
import { useEffect } from "react";

/**
 * Options for {@link usePopoverKeys}.
 */
interface UsePopoverKeysOptions {
  /** Whether the popover is currently open. */
  isOpen: boolean;
  /** The popover panel. Rows are located inside it by `[role="menuitem"]`. */
  panelRef: React.RefObject<HTMLElement>;
  /** The trigger, refocused when the popover closes on Escape. */
  triggerRef: React.RefObject<HTMLElement>;
  /** Close the popover. */
  onClose: () => void;
}

/**
 * The keyboard contract for an open popover menu.
 *
 * Arrow keys and Home/End walk the rows, Tab cycles within the panel rather
 * than leaving it for the page behind (which is still visible but not
 * interactive), and Escape closes and hands focus back to the trigger so the
 * keyboard user is not dropped at the top of the document.
 *
 * Rows are read from the DOM on every keystroke rather than captured once,
 * because the panel swaps between the campaign step and the group step while
 * it is open -- a captured list would drive the wrong rows after the swap.
 */
export function usePopoverKeys({
  isOpen,
  panelRef,
  triggerRef,
  onClose
}: UsePopoverKeysOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const panel = panelRef.current;
    if (!panel) return;

    const rowsOf = () =>
      Array.from(panel.querySelectorAll<HTMLElement>('[role="menuitem"]'));

    // Move focus into the popover so the arrow keys have somewhere to start.
    rowsOf()[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        triggerRef.current?.focus();
        return;
      }

      const rows = rowsOf();
      if (rows.length === 0) return;

      const from = rows.indexOf(document.activeElement as HTMLElement);
      const next = () => rows[from + 1 >= rows.length ? 0 : from + 1];
      const previous = () => rows[from <= 0 ? rows.length - 1 : from - 1];

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          next()?.focus();
          break;
        case "ArrowUp":
          event.preventDefault();
          previous()?.focus();
          break;
        case "Home":
          event.preventDefault();
          rows[0]?.focus();
          break;
        case "End":
          event.preventDefault();
          rows[rows.length - 1]?.focus();
          break;
        case "Tab":
          event.preventDefault();
          (event.shiftKey ? previous() : next())?.focus();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, panelRef, triggerRef, onClose]);
}
