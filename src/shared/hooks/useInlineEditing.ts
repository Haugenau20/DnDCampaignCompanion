// src/shared/hooks/useInlineEditing.ts
import { useCallback, useEffect, useRef, useState } from "react";

/** What {@link useInlineEditing} hands a page. */
export interface InlineEditing<K extends string> {
  /** The field whose editor is open, if any. One at a time. */
  editing: K | null;
  /** Open one field's editor, closing any other. */
  setEditing: (field: K | null) => void;
  /**
   * Close the open editor and return focus to the control that opened it.
   * Give it to the editor's `onSaved` and `onCancel`.
   */
  closeEditor: () => void;
  /** A ref for the control that opens `field`'s editor. */
  triggerRef: (field: K) => (node: HTMLElement | null) => void;
}

/**
 * One-at-a-time inline editing on an entity page, with focus handed back.
 *
 * A field's trigger is unmounted while its editor is open, so closing the
 * editor (Save, Cancel, Escape) used to leave focus on `<body>`, and a
 * keyboard user had to find their place again from the top (A11Y-007). This
 * remembers which field closed and focuses its trigger once the commit has
 * put it back -- which may be a different element than the one that opened
 * it, as when a prompt becomes the saved value. The NPC page's own version
 * of this is the pattern.
 */
export function useInlineEditing<K extends string>(): InlineEditing<K> {
  const [editing, setEditing] = useState<K | null>(null);
  const [returnTo, setReturnTo] = useState<K | null>(null);
  const triggers = useRef<Partial<Record<K, HTMLElement | null>>>({});

  useEffect(() => {
    if (!returnTo) return;
    triggers.current[returnTo]?.focus();
    setReturnTo(null);
  }, [returnTo]);

  const closeEditor = useCallback(() => {
    setReturnTo(editing);
    setEditing(null);
  }, [editing]);

  const triggerRef = useCallback(
    (field: K) => (node: HTMLElement | null) => {
      triggers.current[field] = node;
    },
    []
  );

  return { editing, setEditing, closeEditor, triggerRef };
}
