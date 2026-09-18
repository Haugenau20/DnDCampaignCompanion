// src/shared/context/QuickAddContext.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import QuickAddDialog from "shared/components/quick-add/QuickAddDialog";
import type { QuickAddCarry, QuickAddEntity } from "shared/components/quick-add/quickAddSpecs";

/** Everything a launcher may pre-set. Only the location's parent is used today. */
export interface QuickAddOptions {
  parentId?: string;
  noteId?: string;
  entityId?: string;
  carry?: QuickAddCarry;
  initialName?: string;
  initialLine?: string;
  /**
   * Told the new record's id instead of navigating to it. The attach tray's
   * escape hatch uses this to attach what was just created and leave the
   * form you were filling exactly where it was.
   */
  onCreated?: (id: string) => void;
}

interface QuickAddContextValue {
  /** Open the quick-add surface for one entity. */
  openQuickAdd: (entity: QuickAddEntity, options?: QuickAddOptions) => void;
  closeQuickAdd: () => void;
  /** The entity currently being added, or `null`. */
  openEntity: QuickAddEntity | null;
}

const QuickAddContext = createContext<QuickAddContextValue | undefined>(undefined);

/**
 * Holds the one quick-add surface for the whole application.
 *
 * It lives here rather than in each launcher because two surfaces open it --
 * the floating create button and the command palette, both of which render
 * `useCreateActions` -- and a second copy would be a second thing to keep in
 * step. `00-entity-authoring.md` §4 is explicit that there is one component;
 * this is what makes that true of its state as well as its markup.
 *
 * Must be mounted inside the NPC, quest, location and note providers, whose
 * write methods the form calls.
 */
export const QuickAddProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entity, setEntity] = useState<QuickAddEntity | null>(null);
  const [options, setOptions] = useState<QuickAddOptions>({});

  const openQuickAdd = useCallback((next: QuickAddEntity, nextOptions: QuickAddOptions = {}) => {
    setEntity(next);
    setOptions(nextOptions);
  }, []);

  const closeQuickAdd = useCallback(() => {
    setEntity(null);
    setOptions({});
  }, []);

  const value = useMemo(
    () => ({ openQuickAdd, closeQuickAdd, openEntity: entity }),
    [openQuickAdd, closeQuickAdd, entity]
  );

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <QuickAddDialog entity={entity} onClose={closeQuickAdd} {...options} />
    </QuickAddContext.Provider>
  );
};

/**
 * Open the quick-add surface.
 *
 * Returns a no-op opener when no provider is mounted rather than throwing.
 * `useCreateActions` is rendered by the command palette and the create menu,
 * both of which appear in suites that mount neither the provider nor the
 * entity contexts; throwing there would make this PR's wiring break tests
 * about unrelated surfaces.
 */
export function useQuickAdd(): QuickAddContextValue {
  const context = useContext(QuickAddContext);
  return (
    context ?? {
      openQuickAdd: () => undefined,
      closeQuickAdd: () => undefined,
      openEntity: null,
    }
  );
}

export default QuickAddContext;
