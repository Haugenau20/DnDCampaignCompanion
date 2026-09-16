// src/components/shared/__tests__/DeleteConfirmationDialog.test.tsx
//
// Note: The Dialog component renders via createPortal into a useEffect-created
// DOM node. Because refs don't trigger re-renders, the portal never populates
// in a JSDOM test environment without mocking. We mock Dialog to render children
// directly so tests can focus on DeleteConfirmationDialog's own behavior
// (callback wiring, state, messaging).

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import DeleteConfirmationDialog from '../DeleteConfirmationDialog';

// ---------------------------------------------------------------------------
// Mock Dialog to render inline instead of via createPortal
// ---------------------------------------------------------------------------
jest.mock('core/components/Dialog', () => {
  const MockDialog: React.FC<{
    open: boolean;
    onClose: () => void;
    title?: string;
    children?: React.ReactNode;
  }> = ({ open, onClose, title, children }) => {
    if (!open) return null;
    return (
      <div data-testid="mock-dialog">
        {title && <h3>{title}</h3>}
        <button onClick={onClose} aria-label="Close dialog">X</button>
        {children}
      </div>
    );
  };
  return MockDialog;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface DialogTestProps {
  isOpen?: boolean;
  onClose?: jest.Mock;
  onConfirm?: jest.Mock;
  itemName?: string;
  itemType?: string;
  message?: string;
}

function renderDialog(overrides: DialogTestProps = {}) {
  const props = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn().mockResolvedValue(undefined),
    itemName: 'Test NPC',
    itemType: 'NPC',
    ...overrides,
  };
  return { result: render(<DeleteConfirmationDialog {...props} />), props };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DeleteConfirmationDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Open / closed state
  // -------------------------------------------------------------------------
  // 14.5 removed the "Confirm Deletion" sub-heading: the title already names
  // the object and asks the question, so a second heading underneath repeated
  // what the reader had just read. These now key off the title itself.
  describe('open/closed state', () => {
    test('should render dialog content when isOpen=true', () => {
      renderDialog({ isOpen: true, itemName: 'Gandalf' });
      expect(screen.getByText('Delete “Gandalf”?')).toBeInTheDocument();
    });

    test('should NOT render dialog content when isOpen=false', () => {
      renderDialog({ isOpen: false, itemName: 'Gandalf' });
      expect(screen.queryByText('Delete “Gandalf”?')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Item name and type rendering
  // -------------------------------------------------------------------------
  describe('item name and type rendering', () => {
    // Named twice on purpose: the title asks about the object, the sentence
    // below says what happens to it.
    test('should display the item name in the confirmation message', () => {
      renderDialog({ itemName: 'Gandalf', itemType: 'NPC' });
      expect(screen.getAllByText(/Gandalf/).length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getByText(/“Gandalf” is removed for everyone/)
      ).toBeInTheDocument();
    });

    // The title names the object when there is one; the button always carries
    // the verb, which is the half that must never read "OK" or a bare "Delete".
    test('should name the object in the title', () => {
      renderDialog({ itemName: 'Gandalf', itemType: 'NPC' });
      expect(screen.getByText('Delete “Gandalf”?')).toBeInTheDocument();
    });

    test('should put the verb and the type on the confirm button', () => {
      renderDialog({ itemType: 'Quest' });
      expect(
        screen.getByRole('button', { name: /^Delete Quest$/ })
      ).toBeInTheDocument();
    });

    test('should use "item" as default itemType when not provided', () => {
      renderDialog({ itemType: undefined, itemName: '' });
      expect(screen.getByText('Delete item?')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Confirmation message
  // -------------------------------------------------------------------------
  describe('confirmation message', () => {
    test('should show default message when no custom message is provided', () => {
      renderDialog({ itemName: 'Gandalf', itemType: 'NPC' });
      expect(
        screen.getByText(/“Gandalf” is removed for everyone/)
      ).toBeInTheDocument();
    });

    test('should show default message includes "cannot be undone"', () => {
      renderDialog({ itemName: 'Gandalf', itemType: 'NPC' });
      expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    });

    test('should show custom message when provided', () => {
      renderDialog({ message: 'Custom warning message here.' });
      // "This cannot be undone." is appended when the caller has not said it,
      // so the last line of a destructive confirm is never left to chance.
      expect(
        screen.getByText(/Custom warning message here\. This cannot be undone\./)
      ).toBeInTheDocument();
    });

    test('should not show default message when custom message is provided', () => {
      renderDialog({
        itemName: 'Gandalf',
        itemType: 'NPC',
        message: 'Custom warning',
      });
      expect(screen.getByText(/Custom warning/)).toBeInTheDocument();
      expect(
        screen.queryByText(/is removed for everyone/)
      ).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Cancel button
  // -------------------------------------------------------------------------
  describe('Cancel button', () => {
    test('should render a Cancel button', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should call onClose when Cancel is clicked', () => {
      const onClose = jest.fn();
      renderDialog({ onClose });
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('should NOT call onConfirm when Cancel is clicked', () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderDialog({ onConfirm });
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Delete / Confirm button
  // -------------------------------------------------------------------------
  describe('Delete button', () => {
    test('should render a Delete button', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    });

    test('should call onConfirm when Delete is clicked', async () => {
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderDialog({ onConfirm });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    test('should call onClose after successful confirmation', async () => {
      const onClose = jest.fn();
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      renderDialog({ onClose, onConfirm });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe('error handling', () => {
    test('should display error message when onConfirm rejects with Error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onConfirm = jest.fn().mockRejectedValue(new Error('Delete failed'));
      renderDialog({ onConfirm });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    test('should display generic error message for non-Error rejections', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onConfirm = jest.fn().mockRejectedValue('string error');
      renderDialog({ onConfirm, itemType: 'Quest' });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      await waitFor(() => {
        expect(
          screen.getByText(/An error occurred while deleting the Quest/)
        ).toBeInTheDocument();
      });

      consoleErrorSpy.mockRestore();
    });

    test('should NOT call onClose when onConfirm rejects', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const onClose = jest.fn();
      const onConfirm = jest.fn().mockRejectedValue(new Error('Delete failed'));
      renderDialog({ onClose, onConfirm });

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      });

      await waitFor(() => {
        expect(screen.getByText('Delete failed')).toBeInTheDocument();
      });

      expect(onClose).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Disabled state during loading
  // -------------------------------------------------------------------------
  describe('disabled state during deletion', () => {
    test('should disable Cancel button while deleting', async () => {
      let resolveConfirm!: () => void;
      const onConfirm = jest.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
      );
      renderDialog({ onConfirm });

      // Click delete to start the async operation
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      // Cancel button should be disabled while deleting
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
      });

      // Resolve to clean up
      await act(async () => {
        resolveConfirm();
      });
    });
  });
});
