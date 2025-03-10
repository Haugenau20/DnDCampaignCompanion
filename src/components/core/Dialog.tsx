// components/core/Dialog.tsx
import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import Typography from './Typography';
import { useTheme } from '../../context/ThemeContext';
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
}

/**
 * A reusable dialog component that provides a modal interface
 * with a backdrop, close button, and focus trap
 */
const Dialog: React.FC<DialogProps> = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'max-w-md'
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className={clsx(
        "fixed inset-0 transition-opacity",
        `${themePrefix}-dialog-backdrop`
      )} />

      {/* Dialog positioning */}
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Dialog panel with theme-specific styling */}
        <div
          ref={dialogRef}
          className={clsx(
            "relative rounded-lg shadow-xl p-6",
            maxWidth,
            "w-full",
            `${themePrefix}-dialog`
          )}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className={clsx(
              "absolute right-4 top-4",
              `${themePrefix}-button-ghost`
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
    </div>
  );
};

export default Dialog;