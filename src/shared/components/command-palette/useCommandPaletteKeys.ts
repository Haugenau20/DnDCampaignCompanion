// src/shared/components/command-palette/useCommandPaletteKeys.ts
import { useEffect } from "react";

/** Options for {@link useCommandPaletteKeys}. */
interface UseCommandPaletteKeysOptions {
  isOpen: boolean;
  /** How many rows are navigable: results plus create commands. */
  itemCount: number;
  /** The currently highlighted row. */
  selectedIndex: number;
  /** Move the highlight. Callers clamp nothing; this hook has already clamped. */
  onMove: (nextIndex: number) => void;
  /** Open the highlighted row. */
  onCommit: () => void;
  /** Advance the type filter one step. */
  onFilterCycle: () => void;
  /** Close the palette. */
  onClose: () => void;
}

/**
 * The palette's keyboard contract: **virtual** focus.
 *
 * Focus stays in the input the whole time and the highlighted row is announced
 * through `aria-activedescendant`. This is why `usePopoverKeys` is not reused
 * here -- that hook moves real DOM focus onto `[role="menuitem"]` rows, which
 * would take focus out of the input on the first ArrowDown and stop typing
 * working.
 *
 * Movement clamps rather than wraps: in a list this long, wrapping loses people.
 */
export function useCommandPaletteKeys({
  isOpen,
  itemCount,
  selectedIndex,
  onMove,
  onCommit,
  onFilterCycle,
  onClose,
}: UseCommandPaletteKeysOptions): void {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "Escape":
          event.preventDefault();
          onClose();
          break;
        case "ArrowDown":
          event.preventDefault();
          onMove(Math.min(selectedIndex + 1, itemCount - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          onMove(Math.max(selectedIndex - 1, 0));
          break;
        case "Enter":
          if (itemCount > 0) {
            event.preventDefault();
            onCommit();
          }
          break;
        case "Tab":
          event.preventDefault();
          onFilterCycle();
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, itemCount, selectedIndex, onMove, onCommit, onFilterCycle, onClose]);
}

export default useCommandPaletteKeys;
