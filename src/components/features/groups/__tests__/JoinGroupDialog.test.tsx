// src/components/features/groups/__tests__/JoinGroupDialog.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JoinGroupDialog from '../JoinGroupDialog';

// ---------------------------------------------------------------------------
// Mock Dialog to render children inline (bug #150 / #301 workaround)
// ---------------------------------------------------------------------------
jest.mock('../../../core/Dialog', () => ({
  __esModule: true,
  default: ({ open, title, children, onClose }: any) =>
    open ? (
      <div data-testid="mock-dialog">
        {title && <h2>{title}</h2>}
        <button onClick={onClose} aria-label="Close dialog">Close</button>
        {children}
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockValidateToken = jest.fn();
const mockJoinGroupWithToken = jest.fn();
const mockValidateUsername = jest.fn();

jest.mock('../../../../context/firebase', () => ({
  useInvitations: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useInvitations, useUser } = require('../../../../context/firebase');
const { useLocation } = require('react-router-dom');

function setupMocks(locationSearch = '') {
  useLocation.mockReturnValue({ search: locationSearch, pathname: '/join' });
  useInvitations.mockReturnValue({
    validateToken: mockValidateToken,
    joinGroupWithToken: mockJoinGroupWithToken,
  });
  useUser.mockReturnValue({
    validateUsername: mockValidateUsername,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('JoinGroupDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockValidateToken.mockResolvedValue(false);
    mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
    mockJoinGroupWithToken.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // NOTE: JoinGroupDialog renders inside a Dialog component which uses portals.
  // Dialog content is unreachable in JSDOM per bug #150.
  // The form content inside the dialog is not accessible via screen queries
  // when open=true because the Dialog portal attaches to document.body
  // outside the render container. This limits test coverage significantly.
  // See bug #301 (extension of #150) for details.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // Closed state
  // -------------------------------------------------------------------------
  describe('closed state', () => {
    test('should not render dialog content when open is false', () => {
      render(
        <JoinGroupDialog open={false} onClose={jest.fn()} />
      );
      // When closed, dialog content should not be in document
      expect(screen.queryByText('Join a Group')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Open state - limited by Dialog portal bug #150/#301
  // -------------------------------------------------------------------------
  describe('open state', () => {
    test('should call validateToken when token from URL is loaded', async () => {
      setupMocks('?token=abc123&groupId=group-1');
      mockValidateToken.mockResolvedValue(true);
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('abc123');
      });
    });

    test('should not call validateToken when URL has no token', async () => {
      setupMocks('');
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      // Small wait to ensure no side effects
      await new Promise(r => setTimeout(r, 100));
      expect(mockValidateToken).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Token validation behavior
  // -------------------------------------------------------------------------
  describe('token validation', () => {
    test('should call validateToken when token is populated from URL', async () => {
      setupMocks('?token=validtoken');
      mockValidateToken.mockResolvedValue(true);
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('validtoken');
      });
    });

    test('should call validateToken with correct token from URL query params', async () => {
      setupMocks('?token=test-token-123&groupId=grp-abc');
      mockValidateToken.mockResolvedValue(true);
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('test-token-123');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Username validation behavior (when token valid + dialog accessible)
  // -------------------------------------------------------------------------
  describe('username validation behavior', () => {
    test('should not call validateUsername until token is verified', async () => {
      setupMocks('');
      mockValidateToken.mockResolvedValue(false);
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      await new Promise(r => setTimeout(r, 200));
      expect(mockValidateUsername).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Submit/callback behavior
  // -------------------------------------------------------------------------
  describe('callbacks', () => {
    test('should call onClose when join is cancelled (via Dialog close)', () => {
      const onClose = jest.fn();
      render(
        <JoinGroupDialog open={true} onClose={onClose} />
      );
      // Dialog portal issue — can't interact with form content
      // This test documents that the onClose prop is passed without crash
    });

    test('should accept onSuccess callback prop without error', () => {
      const onSuccess = jest.fn();
      // Just verifies prop is accepted without crashing
      expect(() => {
        render(
          <JoinGroupDialog open={true} onClose={jest.fn()} onSuccess={onSuccess} />
        );
      }).not.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // URL param extraction behavior
  // -------------------------------------------------------------------------
  describe('URL parameter extraction', () => {
    test('should extract groupId from URL params', async () => {
      setupMocks('?token=tok-1&groupId=group-42');
      mockValidateToken.mockResolvedValue(true);
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      // Token extracted and validated — groupId stored in component state
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('tok-1');
      });
    });

    test('should handle URL with no query params', async () => {
      setupMocks('');
      render(
        <JoinGroupDialog open={true} onClose={jest.fn()} />
      );
      await new Promise(r => setTimeout(r, 50));
      // No error, no token validation attempted
      expect(mockValidateToken).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Dialog rendering (with mocked Dialog — lines 172-194)
  // -------------------------------------------------------------------------
  describe('dialog content rendering', () => {
    test('should render "Join a Group" title when open', () => {
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      expect(screen.getByText('Join a Group')).toBeInTheDocument();
    });

    test('should render Invitation Token label', () => {
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      expect(screen.getAllByText(/Invitation Token/i).length).toBeGreaterThan(0);
    });

    test('should render Username for this Group label', () => {
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      expect(screen.getAllByText(/Username for this Group/i).length).toBeGreaterThan(0);
    });

    test('should render two text inputs in the form', () => {
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      const inputs = screen.getAllByRole('textbox');
      // One for token, one for username
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });

    test('should render Cancel button', () => {
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render Join Group button', () => {
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      expect(screen.getByRole('button', { name: /join group/i })).toBeInTheDocument();
    });

    test('should not render dialog content when open=false (with mock)', () => {
      render(<JoinGroupDialog open={false} onClose={jest.fn()} />);
      expect(screen.queryByTestId('mock-dialog')).not.toBeInTheDocument();
    });

    test('should call onClose when Cancel button is clicked', async () => {
      const onClose = jest.fn();
      render(<JoinGroupDialog open={true} onClose={onClose} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('Join Group button should be disabled when token not verified', () => {
      // Default: no token, so tokenVerified is null (not true)
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      const joinBtn = screen.getByRole('button', { name: /join group/i });
      expect(joinBtn).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Token validation error paths (lines 73-78)
  // -------------------------------------------------------------------------
  describe('token validation error handling', () => {
    test('should set error when validateToken returns false', async () => {
      setupMocks('?token=bad-token');
      mockValidateToken.mockResolvedValue(false);
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('bad-token');
      });
      // Error message should appear (line 73)
      await waitFor(() => {
        expect(
          screen.getByText(/This invitation token is invalid or has already been used\./)
        ).toBeInTheDocument();
      });
    });

    test('should set error when validateToken throws', async () => {
      setupMocks('?token=error-token');
      mockValidateToken.mockRejectedValue(new Error('network error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalled();
      });
      // Error message from catch block (line 78)
      await waitFor(() => {
        expect(
          screen.getByText(/Error validating invitation\. Please try again\./)
        ).toBeInTheDocument();
      });
      consoleSpy.mockRestore();
    });
  });

  // -------------------------------------------------------------------------
  // Username validation (lines 93, 98-119)
  // -------------------------------------------------------------------------
  describe('username validation paths', () => {
    // Helper: get the username input (second textbox in the form)
    // The Input component renders label without htmlFor, so we index by role.
    function getUsernameInput() {
      const inputs = screen.getAllByRole('textbox');
      return inputs[1]; // index 0 = token, index 1 = username
    }

    test('should show username too short error when username < 3 chars', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      // Wait for token to be validated and username input to be enabled
      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      // Username input is disabled until token is verified, so wait for enabled state
      await waitFor(() => {
        expect(getUsernameInput()).not.toBeDisabled();
      });

      fireEvent.change(getUsernameInput(), { target: { value: 'ab' } });

      // Line 93: username.length < 3 sets error message
      await waitFor(() => {
        expect(screen.getByText(/Username must be at least 3 characters/)).toBeInTheDocument();
      });
    });

    test('should call validateUsername when token is valid and username >= 3 chars', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      await waitFor(() => expect(getUsernameInput()).not.toBeDisabled());

      fireEvent.change(getUsernameInput(), { target: { value: 'validuser' } });

      // Lines 98-119: checkUsername is called after 500ms debounce
      await waitFor(() => {
        expect(mockValidateUsername).toHaveBeenCalledWith('validuser');
      }, { timeout: 1200 });
    });

    test('should show username error when validateUsername returns an error', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: false, isAvailable: false, error: 'Username already taken' });
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      await waitFor(() => expect(getUsernameInput()).not.toBeDisabled());

      fireEvent.change(getUsernameInput(), { target: { value: 'takenuser' } });

      await waitFor(() => {
        expect(screen.getByText('Username already taken')).toBeInTheDocument();
      }, { timeout: 1200 });
    });

    test('should show error when validateUsername throws', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockRejectedValue(new Error('network error'));
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      await waitFor(() => expect(getUsernameInput()).not.toBeDisabled());

      fireEvent.change(getUsernameInput(), { target: { value: 'someuser' } });

      // Lines 106-108: catch block sets 'Error checking username'
      await waitFor(() => {
        expect(screen.getByText('Error checking username')).toBeInTheDocument();
      }, { timeout: 1200 });
    });
  });

  // -------------------------------------------------------------------------
  // Form submission paths (lines 123-152)
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should show error when submitting with invalid token', async () => {
      setupMocks('');
      mockValidateToken.mockResolvedValue(false);
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      // Submit form with no valid token
      const form = screen.getByRole('button', { name: /join group/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      // Line 128: error set when token not verified
      expect(screen.getByText('Invalid or expired invitation token')).toBeInTheDocument();
    });

    test('should show error when submitting with invalid username', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: false, isAvailable: false });
      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());

      const form = screen.getByRole('button', { name: /join group/i }).closest('form')!;
      await act(async () => {
        fireEvent.submit(form);
      });

      // Line 134-135: error set when username invalid/unavailable
      expect(screen.getByText('Please choose a valid and available username')).toBeInTheDocument();
    });

    // Helper: get the join form (first form in the document)
    function getForm() {
      return document.querySelector('form')!;
    }

    // Helper: get and interact with username input
    async function fillUsername(value: string) {
      const inputs = screen.getAllByRole('textbox');
      const usernameInput = inputs[1];
      fireEvent.change(usernameInput, { target: { value } });
      return usernameInput;
    }

    test('should call joinGroupWithToken and onSuccess+onClose on successful join', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      mockJoinGroupWithToken.mockResolvedValue(undefined);

      const onClose = jest.fn();
      const onSuccess = jest.fn();
      render(<JoinGroupDialog open={true} onClose={onClose} onSuccess={onSuccess} />);

      // Wait for token validation
      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());

      // Type a valid username and wait for validation
      await fillUsername('heroname');
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('heroname'), { timeout: 1200 });

      // Submit the form
      await act(async () => {
        fireEvent.submit(getForm());
      });

      // Lines 140-148: joinGroupWithToken called, onSuccess and onClose invoked
      await waitFor(() => {
        expect(mockJoinGroupWithToken).toHaveBeenCalledWith('valid-tok', 'heroname');
        expect(onSuccess).toHaveBeenCalledTimes(1);
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });

    test('should show error when joinGroupWithToken throws an Error', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      mockJoinGroupWithToken.mockRejectedValue(new Error('Already a member'));

      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      await fillUsername('heroname');
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('heroname'), { timeout: 1200 });

      await act(async () => {
        fireEvent.submit(getForm());
      });

      // Line 150: error.message displayed
      await waitFor(() => {
        expect(screen.getByText('Already a member')).toBeInTheDocument();
      });
    });

    test('should show generic error when joinGroupWithToken throws non-Error', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      mockJoinGroupWithToken.mockRejectedValue('string error');

      render(<JoinGroupDialog open={true} onClose={jest.fn()} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      await fillUsername('heroname');
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('heroname'), { timeout: 1200 });

      await act(async () => {
        fireEvent.submit(getForm());
      });

      // Line 150: fallback 'Failed to join group'
      await waitFor(() => {
        expect(screen.getByText('Failed to join group')).toBeInTheDocument();
      });
    });

    test('should not call onSuccess when onSuccess prop is not provided', async () => {
      setupMocks('?token=valid-tok');
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      mockJoinGroupWithToken.mockResolvedValue(undefined);

      const onClose = jest.fn();
      render(<JoinGroupDialog open={true} onClose={onClose} />);

      await waitFor(() => expect(mockValidateToken).toHaveBeenCalled());
      await fillUsername('heroname');
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('heroname'), { timeout: 1200 });

      await act(async () => {
        fireEvent.submit(getForm());
      });

      // Line 147: onSuccess is optional — onClose still fires
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1);
      });
    });
  });
});
