// src/shared/components/context-switcher/UndoToast.tsx
import React, { useEffect } from "react";
import Typography from "core/components/Typography";

/**
 * Props for {@link UndoToast}.
 */
interface UndoToastProps {
  /** Name of the group or campaign that was just switched to. */
  label: string;
  /** Shown instead of the confirmation when the undo itself failed. */
  error?: string | null;
  /** Restore the previous group and campaign. */
  onUndo: () => void;
  /** Remove the toast without restoring anything. */
  onDismiss: () => void;
  /** Milliseconds before the toast dismisses itself. */
  duration?: number;
}

/**
 * A transient confirmation of a context switch, with one action.
 *
 * This is what replaced the `Apply Changes` / `Close Without Applying` pair.
 * A pre-commit confirmation asks every user to think about every switch in
 * order to protect the rare mis-click; an undo charges nothing up front and
 * still makes the mis-click recoverable.
 */
const UndoToast: React.FC<UndoToastProps> = ({
  label,
  error = null,
  onUndo,
  onDismiss,
  duration = 6000
}) => {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, duration);
    return () => window.clearTimeout(timer);
  }, [label, error, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="toast flex items-center justify-between gap-4 px-4 py-3"
    >
      {error ? (
        <Typography variant="body-sm" color="error">
          {error}
        </Typography>
      ) : (
        <Typography variant="body-sm">
          Switched to <span className="font-semibold">{label}</span>
        </Typography>
      )}

      <button
        type="button"
        onClick={onUndo}
        className="font-semibold primary shrink-0"
      >
        Undo
      </button>
    </div>
  );
};

export default UndoToast;
