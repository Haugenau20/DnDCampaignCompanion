// src/shared/context/QuickAddProvider.tsx
import React, { useCallback, useMemo, useState } from "react";
import QuickAddDialog from "shared/components/quick-add/QuickAddDialog";
import type { QuickAddEntity } from "shared/components/quick-add/quickAddEntity";
import QuickAddContext, { type QuickAddOptions } from "./QuickAddContext";

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

export default QuickAddProvider;
