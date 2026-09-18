// src/shared/components/attach-tray/useAttachTray.ts
import { useCallback, useMemo } from "react";

export interface AttachSetBinding {
  attachedIds: string[];
  onAttach: (id: string) => void;
  onDetach: (id: string) => void;
}

/**
 * Bind the tray to a `Set<string>` of ids, which is how every existing form
 * already holds its relations.
 *
 * Adapting here rather than reshaping each form's state keeps this PR to
 * "change how a relation is picked" -- the forms are retired in `15-8`, so
 * effort spent restructuring them is thrown away.
 *
 * There is deliberately **no** `useAttachSources` hook reading all four
 * contexts. T023 says consume the providers that already own each collection,
 * and every call site already reads the one it needs -- a shared hook would
 * instead make each form depend on all four, so a quest form would throw
 * outside a `RumorProvider` for a collection it never shows.
 */
export function useAttachSet(
  selected: Set<string>,
  setSelected: (updater: (previous: Set<string>) => Set<string>) => void
): AttachSetBinding {
  const attachedIds = useMemo(() => Array.from(selected), [selected]);

  const onAttach = useCallback(
    (id: string) =>
      setSelected((previous) => {
        const next = new Set(previous);
        next.add(id);
        return next;
      }),
    [setSelected]
  );

  const onDetach = useCallback(
    (id: string) =>
      setSelected((previous) => {
        const next = new Set(previous);
        next.delete(id);
        return next;
      }),
    [setSelected]
  );

  return { attachedIds, onAttach, onDetach };
}
