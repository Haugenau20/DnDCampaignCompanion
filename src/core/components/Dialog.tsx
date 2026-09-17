// components/core/Dialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import Typography from './Typography';
import clsx from 'clsx';

interface DialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when the dialog should close */
  onClose: () => void;
  /** Dialog title */
  title?: string;
  /** Dialog content */
  children: React.ReactNode;
  /** Optional maximum width class */
  maxWidth?: string;
  /** Whether this dialog is nested inside another dialog */
  isNested?: boolean;
  /**
   * Whether the content holds work that a stray dismissal would discard.
   *
   * Defaults to `false`, which is what keeps a confirmation's one-key exit: a
   * dialog asking "delete this?" has nothing to lose, so Escape and a backdrop
   * click still close it.
   *
   * Content that knows it is dirty for a reason no input event reveals -- a
   * drag, a canvas, an editor with its own model -- says so here. Everything
   * that is just fields does not need to: see the `touched` state below.
   */
  dirty?: boolean;
  /**
   * Where the panel sits.
   *
   * `"center"` is the product's default and what every dialog predating this
   * prop gets. `"sheet-on-phone"` keeps that centred panel from `sm` up and
   * drops to a bottom sheet below it, because a centred dialog on a phone puts
   * its own fields under the keyboard (`00-entity-authoring.md` §4).
   *
   * The alignment lives on the overlay, not the panel, which is why this is a
   * prop rather than something a caller can pass through `maxWidth`.
   */
  placement?: 'center' | 'sheet-on-phone';
}

/**
 * Selector for the things a keyboard can land on inside the panel. Used by the
 * focus trap to find the first and last stops.
 */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

/**
 * A reusable dialog component that provides a modal interface with a backdrop,
 * close button, and focus trap.
 * Renders directly to document.body using createPortal for proper stacking.
 * Supports nested dialogs and backdrop clicks to close.
 *
 * The panel is a real `role="dialog"` with `aria-modal`, named by its own
 * title. Until PR 8.0 it was a plain `<div>`: this comment claimed a focus trap
 * that did not exist, so a keyboard tabbed straight out of the dialog into the
 * page behind the backdrop, and a screen reader announced an anonymous group of
 * text rather than a dialog. Focus now moves into the panel on open, is
 * returned to whatever had it when the dialog closes, and Tab wraps inside.
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  isNested = false,
  dirty = false,
  placement = 'center'
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  // Portal root lives in state rather than a ref. Assigning a ref does not
  // trigger a re-render, so a consumer that mounts Dialog with `open` already
  // true (e.g. SessionTimeoutWarning, which gates the whole <Dialog> element
  // behind the same boolean it passes as `open`) would render null forever on
  // that first pass — the effect below populates the value, but nothing ever
  // forces React to look at `if (!open || !portalRoot) return null` again.
  // State makes the population itself trigger the follow-up render. See bug #150.
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

  /**
   * Whether anything inside has been typed into or toggled.
   *
   * Detected here rather than demanded from every caller. The rule is about
   * not discarding input, and an `input`/`change` event inside the panel is
   * exactly the evidence that some exists -- so every dialog in the product
   * obeys it without a single call site opting in, and none can forget to.
   * `dirty` remains for content whose changes never surface as those events.
   *
   * Reset when the dialog closes: a dialog reopened later has not been touched
   * yet, and carrying the flag would make it permanently undismissable.
   */
  const [touched, setTouched] = useState(false);
  const isDirty = dirty || touched;

  /**
   * The same answer, readable from the Escape listener.
   *
   * That listener is bound once per open and deliberately does not depend on
   * `isDirty`: re-binding a document-level key handler on every keystroke is
   * both wasteful and a way to lose an event between removal and re-add. A ref
   * gives it the current value without changing when it is attached.
   */
  const isDirtyRef = useRef(isDirty);
  isDirtyRef.current = isDirty;

  useEffect(() => {
    if (!open) setTouched(false);
  }, [open]);

  // Create a unique ID for this dialog instance to help with targeting
  const dialogId = useRef(`dialog-${Math.random().toString(36).substr(2, 9)}`);
  const titleId = useRef(`${dialogId.current}-title`);

  // Whatever had focus before the dialog opened, so it can be handed back.
  // Losing focus to <body> on close means the next Tab starts from the top of
  // the page rather than from the control the user was working with.
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  // Create portal container on mount (and whenever isNested changes).
  // Deliberately does NOT depend on `portalRoot` — depending on the value this
  // effect itself sets would recreate the container (and reset the state)
  // every time it runs, looping forever. `isNested` is the only thing that
  // should ever cause the container to be torn down and rebuilt.
  useEffect(() => {
    const div = document.createElement('div');
    div.id = dialogId.current;
    div.className = isNested ? 'nested-dialog-root' : 'root-dialog-root';
    div.dataset.nested = isNested ? 'true' : 'false';
    document.body.appendChild(div);
    setPortalRoot(div);

    // Cleanup function to remove the portal container when component unmounts
    // (or before this effect re-runs for a new `isNested` value).
    return () => {
      document.body.removeChild(div);
      setPortalRoot(null);
    };
  }, [isNested]);
  
  // Manage body scroll locking
  useEffect(() => {
    // Only block scrolling with the first/root dialog
    if (!isNested && open) {
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      if (!isNested && open) {
        // Check if there are any other open root dialogs before restoring scroll
        const otherRootDialogs = document.querySelectorAll('.root-dialog-root[data-open="true"]');
        if (otherRootDialogs.length <= 1) {
          document.body.style.overflow = '';
        }
      }
    };
  }, [open, isNested]);
  
  // Handle escape key - only for the top-most dialog
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        // Get all open dialogs
        const openDialogs = document.querySelectorAll('.root-dialog-root[data-open="true"], .nested-dialog-root[data-open="true"]');
        
        // Find the top-most dialog (the last one in the DOM)
        const topDialog = openDialogs[openDialogs.length - 1];
        
        // Only close this dialog if it's the top-most one
        if (topDialog && topDialog.id === dialogId.current) {
          // Escape is still swallowed while dirty -- it must not fall through
          // to whatever is behind the backdrop -- but it no longer discards
          // what has been typed. Cancel and the close button remain.
          event.preventDefault();
          if (!isDirtyRef.current) {
            onClose();
          }
        }
      }
    };

    if (open && portalRoot) {
      document.addEventListener('keydown', handleEscape);
      portalRoot.dataset.open = 'true';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      if (portalRoot) {
        portalRoot.dataset.open = 'false';
      }
    };
  }, [open, onClose, portalRoot]);

  // Move focus into the panel on open and hand it back on close.
  useEffect(() => {
    if (!open || !portalRoot) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;

    // Focus the panel itself rather than its first control. The close button is
    // almost never what the reader came for, and focusing it announces "Close
    // dialog" ahead of the title they were meant to hear.
    dialogRef.current?.focus();

    return () => {
      const previous = previouslyFocusedRef.current;
      // The trigger can legitimately be gone — a dialog that deletes the row it
      // was opened from unmounts its own opener. Focusing a detached node
      // silently sends focus to <body>, so check first.
      if (previous && document.contains(previous)) {
        previous.focus();
      }
    };
  }, [open, portalRoot]);

  // Don't render anything if the dialog is closed or no portal root
  if (!open || !portalRoot) return null;

  // Set z-index based on whether this is a nested dialog
  const zIndex = isNested ? 60 : 50;

  // Keep Tab inside the panel. Bound to the panel rather than the document, so
  // a nested dialog traps on its own without either one needing to know about
  // the other — focus is only ever inside one of them.
  const handlePanelKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const panel = dialogRef.current;
    if (!panel) return;

    const focusable = Array.from(
      panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );

    // A dialog with nothing to focus keeps focus on the panel; letting Tab
    // through would drop the user behind the backdrop.
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey) {
      // The panel itself counts as "before the first stop": it is where focus
      // starts, so shift-tabbing from it should wrap to the end.
      if (active === first || active === panel) {
        event.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // A backdrop click is the easiest gesture in the product to make by
    // accident, and until now it silently threw away whatever had been typed.
    // Once the content is dirty it does nothing at all; the user cancels on
    // purpose or not at all.
    if (isDirty) return;

    // Check if clicking on the backdrop container and not inside the dialog
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Create dialog content
  const dialogContent = (
    <div 
      className={clsx(
        "fixed inset-0 overflow-y-auto flex justify-center",
        placement === 'sheet-on-phone'
          ? "items-end sm:items-center"
          : "items-center"
      )}
      style={{ zIndex }}
      onClick={handleBackdropClick}
      data-testid={`dialog-overlay-${dialogId.current}`}
    >
      {/* Semi-transparent backdrop */}
      <div 
        className={clsx(
          "fixed inset-0 transition-opacity",
          isNested ? "bg-black/30" : "bg-black/50",
          `dialog-backdrop`
        )}
        aria-hidden="true"
      />

      {/* Dialog panel - explicitly prevent click propagation */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId.current : undefined}
        tabIndex={-1}
        onKeyDown={handlePanelKeyDown}
        // React's synthetic `change` covers typing as well as toggling, and
        // both bubble to here from anywhere in the content.
        onChange={() => setTouched(true)}
        className={clsx(
          "relative shadow-xl p-6 z-10",
          // A sheet is flush with the bottom edge and rounded only at the top;
          // from `sm` up it is the ordinary centred panel again.
          placement === 'sheet-on-phone'
            ? "rounded-t-lg sm:rounded-lg max-h-[90vh] overflow-y-auto"
            : "rounded-lg",
          maxWidth,
          "w-full",
          // The panel is focused programmatically on open, never by tabbing to
          // it, so the ring would mark something the user did not do.
          "focus:outline-none",
          `dialog`
        )}
        onClick={(e) => e.stopPropagation()}
        data-testid={`dialog-content-${dialogId.current}`}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className={clsx(
            "absolute right-4 top-4",
            `button-ghost`
          )}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>

        {/* Title */}
        {title && (
          <div className="mb-4">
            <Typography variant="h3" id={titleId.current}>
              {title}
            </Typography>
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );

  // Use createPortal to render to our specific root div
  return createPortal(dialogContent, portalRoot);
};

export default Dialog;