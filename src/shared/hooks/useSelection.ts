// src/shared/hooks/useSelection.ts
import { useCallback, useState } from 'react';

/** What {@link useSelection} returns. */
export interface Selection {
  /** Whether the directory is in selection mode: every row has a checkbox. */
  active: boolean;
  /** The ids ticked so far. A new `Set` on every change, so it is safe as a dependency. */
  selected: Set<string>;
  /** Enters or leaves selection mode. Either way the selection starts empty. */
  toggleActive: () => void;
  /** Ticks or unticks one id. */
  setSelected: (id: string, selected: boolean) => void;
  /** Leaves selection mode and forgets the selection -- what a finished batch action does. */
  clear: () => void;
}

/**
 * Selection mode for a directory's batch actions (T017): the mode toggle and
 * the set of ticked ids, pulled out of the rumour directory so every
 * directory selects the same way. Which actions act on the selection is each
 * directory's own business.
 */
export function useSelection(): Selection {
  const [active, setActive] = useState(false);
  const [selected, setSelectedIds] = useState<Set<string>>(() => new Set());

  const toggleActive = useCallback(() => {
    setActive((was) => !was);
    setSelectedIds(new Set());
  }, []);

  const setSelected = useCallback((id: string, isSelected: boolean) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (isSelected) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setActive(false);
    setSelectedIds(new Set());
  }, []);

  return { active, selected, toggleActive, setSelected, clear };
}

export default useSelection;
