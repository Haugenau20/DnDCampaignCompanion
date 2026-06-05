// src/components/features/auth/adminPanel/__tests__/TokenManagementView.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TokenManagementView from '../TokenManagementView';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockGenerateToken = jest.fn();
const mockGetRegistrationTokens = jest.fn();
const mockDeleteRegistrationToken = jest.fn();

jest.mock('@/features/user-management', () => ({
  useInvitations: jest.fn(),
  useGroups: jest.fn(),
}));

const { useInvitations, useGroups } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock Dialog
// ---------------------------------------------------------------------------
jest.mock('@/components/core/Dialog', () => {
  const Dialog = ({ open, onClose, title, children }: any) => {
    if (!open) return null;
    return (
      <div role="dialog" aria-label={title}>
        <h2>{title}</h2>
        <button onClick={onClose} aria-label="close dialog">X</button>
        {children}
      </div>
    );
  };
  return Dialog;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockGroup = { id: 'group-1', name: 'Test Group' };

function makeToken(overrides: Record<string, any> = {}) {
  return {
    token: 'abc123def456',
    notes: 'For new player',
    createdAt: new Date('2024-01-15'),
    used: false,
    ...overrides,
  };
}

function setupMocks(
  tokens: any[] = [],
  group: any = mockGroup,
  groupId: string = 'group-1'
) {
  mockGetRegistrationTokens.mockResolvedValue(tokens);
  useInvitations.mockReturnValue({
    generateRegistrationToken: mockGenerateToken,
    getRegistrationTokens: mockGetRegistrationTokens,
    deleteRegistrationToken: mockDeleteRegistrationToken,
  });
  useGroups.mockReturnValue({
    activeGroup: group,
    activeGroupId: groupId,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TokenManagementView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockGenerateToken.mockResolvedValue('new-token-xyz');
    mockDeleteRegistrationToken.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Generate Token section', async () => {
      render(<TokenManagementView />);
      expect(screen.getByText(/generate registration token/i)).toBeInTheDocument();
    });

    test('should render Generate Token button', async () => {
      render(<TokenManagementView />);
      expect(screen.getByRole('button', { name: /generate token/i })).toBeInTheDocument();
    });

    test('should render Notes input field', async () => {
      render(<TokenManagementView />);
      expect(screen.getByPlaceholderText(/purpose of this token/i)).toBeInTheDocument();
    });

    test('should show empty state when no tokens exist', async () => {
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/no registration tokens found/i)).toBeInTheDocument();
      });
    });

    test('should load tokens on mount', async () => {
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(mockGetRegistrationTokens).toHaveBeenCalledTimes(1);
      });
    });

    test('should not load tokens when no active group', async () => {
      setupMocks([], null, '');
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(mockGetRegistrationTokens).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Token list display
  // -------------------------------------------------------------------------
  describe('token list display', () => {
    test('should display tokens when they exist', async () => {
      setupMocks([makeToken()]);
      render(<TokenManagementView />);
      await waitFor(() => {
        // Token is truncated to first 8 chars + "..."
        expect(screen.getByText(/abc123de/)).toBeInTheDocument();
      });
    });

    test('should display token count in heading', async () => {
      setupMocks([makeToken(), makeToken({ token: 'xyz789abc123', notes: 'Second' })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/registration tokens \(2\)/i)).toBeInTheDocument();
      });
    });

    test('should display token notes', async () => {
      setupMocks([makeToken({ notes: 'VIP Player' })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByText('VIP Player')).toBeInTheDocument();
      });
    });

    test('should display Share button for unused tokens', async () => {
      setupMocks([makeToken({ used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      });
    });

    test('should display "Used" status for used tokens', async () => {
      setupMocks([makeToken({ used: true })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByText('Used')).toBeInTheDocument();
      });
    });

    test('should not show Delete button for used tokens', async () => {
      setupMocks([makeToken({ used: true })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        // Token is used - no delete button
        expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
      });
    });

    test('should show Delete button for unused tokens', async () => {
      setupMocks([makeToken({ used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Search / filter
  // -------------------------------------------------------------------------
  describe('token search', () => {
    test('should render search input', async () => {
      render(<TokenManagementView />);
      expect(screen.getByPlaceholderText(/search tokens/i)).toBeInTheDocument();
    });

    test('should filter tokens by search query', async () => {
      setupMocks([
        makeToken({ token: 'abc123def456', notes: 'Alpha player' }),
        makeToken({ token: 'xyz789ghi012', notes: 'Beta player' }),
      ]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByText('Alpha player')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search tokens/i), {
        target: { value: 'alpha' },
      });

      await waitFor(() => {
        expect(screen.getByText('Alpha player')).toBeInTheDocument();
        expect(screen.queryByText('Beta player')).not.toBeInTheDocument();
      });
    });

    test('should show "No tokens match your search" when filtered to empty', async () => {
      setupMocks([makeToken()]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.queryByText(/no registration tokens found/i)).not.toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search tokens/i), {
        target: { value: 'zzznomatch' },
      });

      await waitFor(() => {
        expect(screen.getByText(/no tokens match your search/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Token generation
  // -------------------------------------------------------------------------
  describe('token generation', () => {
    test('should call generateRegistrationToken when button is clicked', async () => {
      render(<TokenManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
      await waitFor(() => {
        expect(mockGenerateToken).toHaveBeenCalledTimes(1);
      });
    });

    test('should pass notes to generateRegistrationToken', async () => {
      render(<TokenManagementView />);
      fireEvent.change(screen.getByPlaceholderText(/purpose of this token/i), {
        target: { value: 'For Sunday group' },
      });
      fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
      await waitFor(() => {
        expect(mockGenerateToken).toHaveBeenCalledWith('For Sunday group');
      });
    });

    test('should show invite dialog after successful token generation', async () => {
      render(<TokenManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /share registration link/i })).toBeInTheDocument();
      });
    });

    test('should show error when generateRegistrationToken throws', async () => {
      mockGenerateToken.mockRejectedValue(new Error('Generation failed'));
      render(<TokenManagementView />);
      fireEvent.click(screen.getByRole('button', { name: /generate token/i }));
      await waitFor(() => {
        expect(screen.getByText(/generation failed/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Token deletion
  // -------------------------------------------------------------------------
  describe('token deletion', () => {
    test('should open confirmation dialog when Delete is clicked', async () => {
      setupMocks([makeToken({ used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
      expect(screen.getByRole('dialog', { name: /confirm token deletion/i })).toBeInTheDocument();
    });

    test('should call deleteRegistrationToken when confirmed', async () => {
      setupMocks([makeToken({ token: 'abc123def456', used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      // Find and click the Delete Token button in the dialog
      const dialog = screen.getByRole('dialog', { name: /confirm token deletion/i });
      const confirmBtn = dialog.querySelector('button[class*="button"]') as HTMLButtonElement ||
        Array.from(dialog.querySelectorAll('button')).find(b => b.textContent?.includes('Delete Token'));

      // Use the "Delete Token" button (not cancel/close)
      const deleteButtons = Array.from(dialog.querySelectorAll('button'));
      const deleteTokenBtn = deleteButtons.find(b => /delete token/i.test(b.textContent || ''));
      expect(deleteTokenBtn).toBeTruthy();
      fireEvent.click(deleteTokenBtn!);

      await waitFor(() => {
        expect(mockDeleteRegistrationToken).toHaveBeenCalledWith('abc123def456');
      });
    });

    test('should close confirmation dialog when Cancel is clicked', async () => {
      setupMocks([makeToken({ used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));

      const dialog = screen.getByRole('dialog', { name: /confirm token deletion/i });
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b => /cancel/i.test(b.textContent || ''));
      expect(cancelBtn).toBeTruthy();
      fireEvent.click(cancelBtn!);

      expect(screen.queryByRole('dialog', { name: /confirm token deletion/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Invite link dialog
  // -------------------------------------------------------------------------
  describe('invite link dialog', () => {
    test('should show invite dialog when Share is clicked for an unused token', async () => {
      setupMocks([makeToken({ used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /share/i }));
      expect(screen.getByRole('dialog', { name: /share registration link/i })).toBeInTheDocument();
    });

    test('should display generated link in invite dialog', async () => {
      setupMocks([makeToken({ token: 'abc123def456', used: false })]);
      render(<TokenManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /share/i }));
      // The invite link should include the token
      expect(screen.getByText(/abc123def456/)).toBeInTheDocument();
    });
  });
});
