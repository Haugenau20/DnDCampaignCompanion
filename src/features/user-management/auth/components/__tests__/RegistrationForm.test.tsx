// src/components/features/auth/__tests__/RegistrationForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RegistrationForm from '../RegistrationForm';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockValidateToken = jest.fn();
const mockSignUpWithToken = jest.fn();
const mockValidateUsername = jest.fn();

jest.mock('@/features/user-management', () => ({
  useInvitations: jest.fn(),
  useUser: jest.fn(),
}));

const { useInvitations, useUser } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock react-router-dom
// ---------------------------------------------------------------------------
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

const { useLocation } = require('react-router-dom');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks(locationSearch = '') {
  useLocation.mockReturnValue({ search: locationSearch, pathname: '/register' });
  useInvitations.mockReturnValue({
    validateToken: mockValidateToken,
    signUpWithToken: mockSignUpWithToken,
  });
  useUser.mockReturnValue({
    validateUsername: mockValidateUsername,
  });
}

function getInviteTokenInput() {
  return screen.getAllByRole('textbox')[0];
}
function getEmailInput() {
  return screen.getAllByRole('textbox')[1];
}
function getUsernameInput() {
  return screen.getAllByRole('textbox')[2];
}
function getPasswordInput() {
  return document.querySelectorAll('input[type="password"]')[0] as HTMLInputElement;
}
function getConfirmPasswordInput() {
  return document.querySelectorAll('input[type="password"]')[1] as HTMLInputElement;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RegistrationForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    mockValidateToken.mockResolvedValue(false);
    mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
    mockSignUpWithToken.mockResolvedValue(undefined);
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Create Account heading and button', () => {
      render(<RegistrationForm />);
      // "Create Account" appears in the heading and on the submit button
      const matches = screen.getAllByText(/create account/i);
      expect(matches.length).toBeGreaterThanOrEqual(1);
    });

    test('should render Invitation Token input field', () => {
      render(<RegistrationForm />);
      // Invitation Token is the first textbox in the form
      const inputs = screen.getAllByRole('textbox');
      expect(inputs.length).toBeGreaterThan(0);
      expect(inputs[0]).toBeInTheDocument();
    });

    test('should render Email label', () => {
      render(<RegistrationForm />);
      // Find "Email *" text
      const emailLabels = screen.getAllByText(/email/i);
      expect(emailLabels.length).toBeGreaterThan(0);
    });

    test('should render Username label', () => {
      render(<RegistrationForm />);
      expect(screen.getByText(/username \*/i)).toBeInTheDocument();
    });

    test('should render Password inputs', () => {
      render(<RegistrationForm />);
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      expect(passwordInputs.length).toBe(2);
    });

    test('should render Create Account submit button', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('should render Cancel button', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render Sign In Instead button', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('button', { name: /sign in instead/i })).toBeInTheDocument();
    });

    test('should render password requirements toggle button', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('button', { name: /show password requirements/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Token handling
  // -------------------------------------------------------------------------
  describe('token validation', () => {
    test('should prefill invite token from URL query params', async () => {
      setupMocks('?token=abc123&groupId=group-1');
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      await waitFor(() => {
        expect(getInviteTokenInput()).toHaveValue('abc123');
      });
    });

    test('should call validateToken when invite token changes', async () => {
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'mytoken' } });
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('mytoken');
      });
    });

    test('should show invalid token error when validation returns false', async () => {
      mockValidateToken.mockResolvedValue(false);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'badtoken' } });
      await waitFor(() => {
        expect(screen.getByText(/invalid or expired invitation token/i)).toBeInTheDocument();
      });
    });

    test('should disable email and username fields when token is not verified', () => {
      render(<RegistrationForm />);
      expect(getEmailInput()).toBeDisabled();
      expect(getUsernameInput()).toBeDisabled();
    });

    test('should enable email field when token is valid', async () => {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => {
        expect(getEmailInput()).not.toBeDisabled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // URL param loading
  // -------------------------------------------------------------------------
  describe('URL query param initialization', () => {
    test('should set token from URL and trigger validation', async () => {
      setupMocks('?token=urltoken&groupId=grp-1');
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      await waitFor(() => {
        expect(mockValidateToken).toHaveBeenCalledWith('urltoken');
      });
    });
  });

  // -------------------------------------------------------------------------
  // Username validation
  // -------------------------------------------------------------------------
  describe('username validation', () => {
    async function setupValidToken() {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());
    }

    test('should show error when username is too short (< 3 chars)', async () => {
      await setupValidToken();
      fireEvent.change(getUsernameInput(), { target: { value: 'ab' } });
      await waitFor(() => {
        expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
      });
    });

    test('should show username error returned from validateUsername', async () => {
      mockValidateUsername.mockResolvedValue({
        isValid: false,
        isAvailable: false,
        error: 'Username taken',
      });
      await setupValidToken();
      // Type enough chars to trigger the check
      fireEvent.change(getUsernameInput(), { target: { value: 'takenname' } });
      await waitFor(() => {
        expect(mockValidateUsername).toHaveBeenCalledWith('takenname');
      });
      await waitFor(() => {
        expect(screen.getByText(/username taken/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Password requirements panel
  // -------------------------------------------------------------------------
  describe('password requirements panel', () => {
    test('should show requirements when "Show password requirements" is clicked', async () => {
      render(<RegistrationForm />);
      await userEvent.click(screen.getByRole('button', { name: /show password requirements/i }));
      expect(screen.getByText(/be at least 8 characters long/i)).toBeInTheDocument();
    });

    test('should hide requirements when "Hide password requirements" is clicked', async () => {
      render(<RegistrationForm />);
      await userEvent.click(screen.getByRole('button', { name: /show password requirements/i }));
      expect(screen.getByText(/be at least 8 characters long/i)).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: /hide password requirements/i }));
      expect(screen.queryByText(/be at least 8 characters long/i)).not.toBeInTheDocument();
    });

    test('should show requirements when password field is focused', async () => {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());
      fireEvent.focus(getPasswordInput());
      expect(screen.getByText(/be at least 8 characters long/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Password error/success feedback
  // -------------------------------------------------------------------------
  describe('password validation feedback', () => {
    async function setupValidToken() {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());
    }

    test('should show error feedback for invalid password', async () => {
      await setupValidToken();
      fireEvent.change(getPasswordInput(), { target: { value: 'weak' } });
      await waitFor(() => {
        expect(screen.getByText(/doesn't meet requirements/i)).toBeInTheDocument();
      });
    });

    test('should show success feedback for valid password', async () => {
      await setupValidToken();
      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      await waitFor(() => {
        expect(screen.getByText(/meets requirements/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Confirm password
  // -------------------------------------------------------------------------
  describe('confirm password validation', () => {
    async function setupValidToken() {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());
    }

    test('should show mismatch error when confirm password differs', async () => {
      await setupValidToken();
      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      fireEvent.change(getConfirmPasswordInput(), { target: { value: 'Different1!' } });
      await waitFor(() => {
        expect(screen.getByText(/passwords don't match/i)).toBeInTheDocument();
      });
    });

    test('should not show mismatch when passwords match', async () => {
      await setupValidToken();
      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      fireEvent.change(getConfirmPasswordInput(), { target: { value: 'ValidPass1!' } });
      await waitFor(() => {
        expect(screen.queryByText(/passwords don't match/i)).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Cancel and SignIn callbacks
  // -------------------------------------------------------------------------
  describe('navigation callbacks', () => {
    test('should call onCancel when Cancel is clicked', async () => {
      const onCancel = jest.fn();
      render(<RegistrationForm onCancel={onCancel} />);
      await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should call onSignInClick when Sign In Instead is clicked', async () => {
      const onSignInClick = jest.fn();
      render(<RegistrationForm onSignInClick={onSignInClick} />);
      await userEvent.click(screen.getByRole('button', { name: /sign in instead/i }));
      expect(onSignInClick).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Submit validation errors
  // -------------------------------------------------------------------------
  describe('form submission validation', () => {
    test('should show error when submitting without a valid token', async () => {
      render(<RegistrationForm />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/invalid or expired invitation token/i)).toBeInTheDocument();
      });
    });

    test('should call signUpWithToken on valid submission', async () => {
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });

      render(<RegistrationForm />);

      // Token: set and wait for validation
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());

      // Fill email, username, passwords
      fireEvent.change(getEmailInput(), { target: { value: 'user@test.com' } });
      fireEvent.change(getUsernameInput(), { target: { value: 'validuser' } });
      // Wait for username debounce (500ms)
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('validuser'), { timeout: 2000 });

      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      fireEvent.change(getConfirmPasswordInput(), { target: { value: 'ValidPass1!' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockSignUpWithToken).toHaveBeenCalledWith(
          'validtoken',
          'user@test.com',
          'ValidPass1!',
          'validuser'
        );
      });
    });

    test('should call onSuccess after successful signup', async () => {
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      const onSuccess = jest.fn();

      render(<RegistrationForm onSuccess={onSuccess} />);

      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());

      fireEvent.change(getEmailInput(), { target: { value: 'user@test.com' } });
      fireEvent.change(getUsernameInput(), { target: { value: 'validuser' } });
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('validuser'), { timeout: 2000 });

      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      fireEvent.change(getConfirmPasswordInput(), { target: { value: 'ValidPass1!' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should show error message when signUpWithToken throws', async () => {
      mockValidateToken.mockResolvedValue(true);
      mockValidateUsername.mockResolvedValue({ isValid: true, isAvailable: true });
      mockSignUpWithToken.mockRejectedValue(new Error('Email already in use'));

      render(<RegistrationForm />);

      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());

      fireEvent.change(getEmailInput(), { target: { value: 'user@test.com' } });
      fireEvent.change(getUsernameInput(), { target: { value: 'validuser' } });
      await waitFor(() => expect(mockValidateUsername).toHaveBeenCalledWith('validuser'), { timeout: 2000 });

      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      fireEvent.change(getConfirmPasswordInput(), { target: { value: 'ValidPass1!' } });

      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText(/email already in use/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Submit button disabled states
  // -------------------------------------------------------------------------
  describe('submit button disabled states', () => {
    test('should be disabled when token is not verified', () => {
      render(<RegistrationForm />);
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
    });

    test('should be disabled when password does not meet requirements', async () => {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());
      fireEvent.change(getPasswordInput(), { target: { value: 'weak' } });
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
    });

    test('should be disabled when passwords do not match', async () => {
      mockValidateToken.mockResolvedValue(true);
      render(<RegistrationForm />);
      fireEvent.change(getInviteTokenInput(), { target: { value: 'validtoken' } });
      await waitFor(() => expect(getEmailInput()).not.toBeDisabled());
      fireEvent.change(getPasswordInput(), { target: { value: 'ValidPass1!' } });
      fireEvent.change(getConfirmPasswordInput(), { target: { value: 'Mismatch1!' } });
      expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled();
    });
  });
});
