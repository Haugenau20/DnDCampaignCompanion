// src/components/features/auth/adminPanel/__tests__/UserManagementView.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserManagementView from '../UserManagementView';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockGetAllUsers = jest.fn();
const mockDeleteUser = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
}));

const { useAuth, useGroups } = require('@/features/user-management');

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

const mockCurrentUser = { uid: 'current-user', email: 'admin@test.com' };
const mockGroup = { id: 'group-1', name: 'Test Group' };

function makeUser(overrides: Record<string, any> = {}) {
  return {
    userId: 'user-abc',
    id: 'user-abc',
    username: 'testuser',
    role: 'member',
    joinedAt: new Date('2024-01-15').toISOString(),
    ...overrides,
  };
}

function setupMocks(users: any[] = [], group: any = mockGroup) {
  mockGetAllUsers.mockResolvedValue(users);
  useAuth.mockReturnValue({ user: mockCurrentUser });
  useGroups.mockReturnValue({
    activeGroup: group,
    getAllUsers: mockGetAllUsers,
    deleteUser: mockDeleteUser,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UserManagementView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockDeleteUser.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Group Members heading', async () => {
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/group members/i)).toBeInTheDocument();
      });
    });

    test('should render search input', () => {
      render(<UserManagementView />);
      expect(screen.getByPlaceholderText(/search users/i)).toBeInTheDocument();
    });

    test('should show empty state when no users', async () => {
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/no users found/i)).toBeInTheDocument();
      });
    });

    test('should not load users when no active group', async () => {
      setupMocks([], null);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(mockGetAllUsers).not.toHaveBeenCalled();
      });
    });

    test('should load users on mount when group is set', async () => {
      render(<UserManagementView />);
      await waitFor(() => {
        expect(mockGetAllUsers).toHaveBeenCalledTimes(1);
      });
    });
  });

  // -------------------------------------------------------------------------
  // User list
  // -------------------------------------------------------------------------
  describe('user list display', () => {
    test('should display user usernames', async () => {
      setupMocks([makeUser({ username: 'player1' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText('player1')).toBeInTheDocument();
      });
    });

    test('should display member count in heading', async () => {
      setupMocks([makeUser(), makeUser({ userId: 'user-2', username: 'player2' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/group members \(2\)/i)).toBeInTheDocument();
      });
    });

    test('should display "Admin" role for admin users', async () => {
      setupMocks([makeUser({ role: 'admin', username: 'adminuser' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        // "Admin" appears in both role column and action column - check at least once
        expect(screen.getAllByText('Admin').length).toBeGreaterThanOrEqual(1);
      });
    });

    test('should display "Member" role for member users', async () => {
      setupMocks([makeUser({ role: 'member', username: 'member1' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText('Member')).toBeInTheDocument();
      });
    });

    test('should show "Current User" label for the logged-in user', async () => {
      setupMocks([makeUser({ userId: 'current-user', username: 'me' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText(/current user/i)).toBeInTheDocument();
      });
    });

    test('should NOT show Remove button for current user', async () => {
      setupMocks([makeUser({ userId: 'current-user', username: 'me', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      });
    });

    test('should NOT show Remove button for admin users', async () => {
      setupMocks([makeUser({ userId: 'other-user', username: 'adminuser', role: 'admin' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
      });
    });

    test('should show Remove button for non-admin non-current users', async () => {
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Search / filter
  // -------------------------------------------------------------------------
  describe('user search', () => {
    test('should filter users by search query', async () => {
      setupMocks([
        makeUser({ userId: 'user-1', username: 'alice' }),
        makeUser({ userId: 'user-2', username: 'bob' }),
      ]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search users/i), {
        target: { value: 'alice' },
      });

      await waitFor(() => {
        expect(screen.getByText('alice')).toBeInTheDocument();
        expect(screen.queryByText('bob')).not.toBeInTheDocument();
      });
    });

    test('should show "No users match your search" when filtered to empty', async () => {
      setupMocks([makeUser()]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.queryByText(/no users found/i)).not.toBeInTheDocument();
      });

      fireEvent.change(screen.getByPlaceholderText(/search users/i), {
        target: { value: 'zzznomatch' },
      });

      await waitFor(() => {
        expect(screen.getByText(/no users match your search/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // User deletion
  // -------------------------------------------------------------------------
  describe('user deletion', () => {
    test('should open confirmation dialog when Remove is clicked', async () => {
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      expect(screen.getByRole('dialog', { name: /confirm user removal/i })).toBeInTheDocument();
    });

    test('should show the username in the confirmation dialog', async () => {
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));
      // The confirmation dialog mentions the username
      const dialog = screen.getByRole('dialog', { name: /confirm user removal/i });
      expect(dialog.textContent).toContain('member1');
    });

    test('should call deleteUser when Remove User is confirmed', async () => {
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      const dialog = screen.getByRole('dialog', { name: /confirm user removal/i });
      const removeBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /remove user/i.test(b.textContent || '')
      );
      expect(removeBtn).toBeTruthy();
      fireEvent.click(removeBtn!);

      await waitFor(() => {
        expect(mockDeleteUser).toHaveBeenCalledWith('other-member');
      });
    });

    test('should remove user from list after successful deletion', async () => {
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByText('member1')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      const dialog = screen.getByRole('dialog', { name: /confirm user removal/i });
      const removeBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /remove user/i.test(b.textContent || '')
      );
      fireEvent.click(removeBtn!);

      await waitFor(() => {
        expect(mockDeleteUser).toHaveBeenCalledWith('other-member');
        // Dialog should close after deletion
        expect(screen.queryByRole('dialog', { name: /confirm user removal/i })).not.toBeInTheDocument();
      });
    });

    test('should close dialog when Cancel is clicked', async () => {
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      const dialog = screen.getByRole('dialog', { name: /confirm user removal/i });
      const cancelBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /cancel/i.test(b.textContent || '')
      );
      fireEvent.click(cancelBtn!);

      expect(screen.queryByRole('dialog', { name: /confirm user removal/i })).not.toBeInTheDocument();
    });

    test('should show error when deleteUser throws', async () => {
      mockDeleteUser.mockRejectedValue(new Error('Permission denied'));
      setupMocks([makeUser({ userId: 'other-member', username: 'member1', role: 'member' })]);
      render(<UserManagementView />);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /remove/i }));

      const dialog = screen.getByRole('dialog', { name: /confirm user removal/i });
      const removeBtn = Array.from(dialog.querySelectorAll('button')).find(b =>
        /remove user/i.test(b.textContent || '')
      );
      fireEvent.click(removeBtn!);

      await waitFor(() => {
        expect(screen.getByText(/permission denied/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Sort order
  // -------------------------------------------------------------------------
  describe('sort order', () => {
    test('should sort admins before members', async () => {
      setupMocks([
        makeUser({ userId: 'user-1', username: 'memberA', role: 'member' }),
        makeUser({ userId: 'user-2', username: 'adminA', role: 'admin' }),
      ]);
      render(<UserManagementView />);
      await waitFor(() => {
        const rows = screen.getAllByText(/admin|member/i).filter(el =>
          el.tagName.toLowerCase() === 'p' || el.closest('td')
        );
        // adminA should appear before memberA
        const adminIdx = screen.getByText('adminA').compareDocumentPosition(screen.getByText('memberA'));
        // adminA comes before memberA in the DOM (adminA's node precedes memberA)
        expect(adminIdx & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      });
    });
  });
});
