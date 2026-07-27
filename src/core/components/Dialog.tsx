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
}

/**
 * A reusable dialog component that provides a modal interface
 * with a backdrop, close button, and focus trap.
 * Renders directly to document.body using createPortal for proper stacking.
 * Supports nested dialogs and backdrop clicks to close.
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md',
  isNested = false
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

  // Create a unique ID for this dialog instance to help with targeting
  const dialogId = useRef(`dialog-${Math.random().toString(36).substr(2, 9)}`);

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
          event.preventDefault();
          onClose();
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

  // Don't render anything if the dialog is closed or no portal root
  if (!open || !portalRoot) return null;

  // Set z-index based on whether this is a nested dialog
  const zIndex = isNested ? 60 : 50;

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    // Check if clicking on the backdrop container and not inside the dialog
    if (dialogRef.current && !dialogRef.current.contains(e.target as Node)) {
      onClose();
    }
  };

  // Create dialog content
  const dialogContent = (
    <div 
      className="fixed inset-0 overflow-y-auto flex items-center justify-center"
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
        className={clsx(
          "relative rounded-lg shadow-xl p-6 z-10",
          maxWidth,
          "w-full",
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
            <Typography variant="h3">
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