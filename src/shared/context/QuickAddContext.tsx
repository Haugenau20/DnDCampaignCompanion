// src/shared/context/QuickAddContext.tsx
import { createContext, useContext } from "react";
import type { QuickAddCarry, QuickAddEntity } from "shared/components/quick-add/quickAddEntity";

/*
 * The half of quick add a launcher needs: the context and the hook that opens
 * it. The provider, which renders the dialog and so reaches every entity
 * feature's write methods, is `QuickAddProvider.tsx`.
 *
 * They are separate files because features launch quick add: `campaign-entities`
 * renders the attach tray, and the tray opens this. Were the provider in this
 * file, that feature would import itself back through the dialog, which
 * `lint`'s `import/no-cycle` refuses (T030). Nothing here may import the dialog.
 */

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
