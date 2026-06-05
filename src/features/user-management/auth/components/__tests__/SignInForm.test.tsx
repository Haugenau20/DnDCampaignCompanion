// src/components/features/auth/__tests__/SignInForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SignInForm from '../SignInForm';

// ---------------------------------------------------------------------------
// Mock context/firebase
// ---------------------------------------------------------------------------
const mockSignIn = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useInvitations: jest.fn(),
  useUser: jest.fn(),
}));

const { useAuth, useInvitations, useUser } = require('@/features/user-management');

// ---------------------------------------------------------------------------
// Mock react-router-dom (needed by RegistrationForm which is rendered conditionally)
// ---------------------------------------------------------------------------
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn().mockReturnValue({ search: '', pathname: '/' }),
}));

// ---------------------------------------------------------------------------
// Mock RegistrationForm to avoid deep rendering in sign-in tests
// ---------------------------------------------------------------------------
jest.mock('../RegistrationForm', () => {
  const RegistrationFormMock = ({ onCancel, onSignInClick }: any) => (
    <div data-testid="registration-form">
      <button onClick={onCancel}>Cancel</button>
      <button onClick={onSignInClick}>Sign In Instead</button>
    </div>
  );
  return RegistrationFormMock;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks(overrides: Record<string, any> = {}) {
  useAuth.mockReturnValue({
    signIn: mockSignIn,
    ...overrides,
  });
  // RegistrationForm uses useInvitations and useUser
  useInvitations.mockReturnValue({
    validateToken: jest.fn().mockResolvedValue(true),
    signUpWithToken: jest.fn().mockResolvedValue(undefined),
  });
  useUser.mockReturnValue({
    validateUsername: jest.fn().mockResolvedValue({ isValid: true, isAvailable: true }),
    updateGroupUserProfile: jest.fn(),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // Helper to get inputs by type since Input component doesn't associate label with htmlFor
  function getEmailInput() {
    return screen.getByRole('textbox');
  }
  function getPasswordInputs() {
    // querySelectorAll for password inputs since they don't have role
    return document.querySelectorAll('input[type="password"]');
  }

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Sign In heading', () => {
      render(<SignInForm />);
      // "Sign In" appears both in the heading and the submit button
      expect(screen.getAllByText(/sign in/i).length).toBeGreaterThan(0);
    });

    test('should render email input', () => {
      render(<SignInForm />);
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    test('should render password input', () => {
      render(<SignInForm />);
      const passwordInputs = document.querySelectorAll('input[type="password"]');
      expect(passwordInputs.length).toBeGreaterThan(0);
    });

    test('should render Remember me checkbox', () => {
      render(<SignInForm />);
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
    });

    test('should render Sign In submit button', () => {
      render(<SignInForm />);
      const submitBtn = screen.getByRole('button', { name: /sign in/i });
      expect(submitBtn).toBeInTheDocument();
    });

    test('should render Create Account button', () => {
      render(<SignInForm />);
      expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
    });

    test('should not show error message initially', () => {
      render(<SignInForm />);
      expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form inputs
  // -------------------------------------------------------------------------
  describe('form inputs', () => {
    test('should update email field when typing', async () => {
      render(<SignInForm />);
      const emailInput = getEmailInput();
      await userEvent.type(emailInput, 'user@test.com');
      expect(emailInput).toHaveValue('user@test.com');
    });

    test('should update password field when typing', async () => {
      render(<SignInForm />);
      const passwordInput = getPasswordInputs()[0] as HTMLInputElement;
      await userEvent.type(passwordInput, 'MyPassword1!');
      expect(passwordInput).toHaveValue('MyPassword1!');
    });

    test('should toggle remember me checkbox', async () => {
      render(<SignInForm />);
      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
      await userEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  // -------------------------------------------------------------------------
  // Submit behaviour
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call signIn with email and password on submit', async () => {
      mockSignIn.mockResolvedValue(undefined);
      render(<SignInForm />);

      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'MyPassword1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'MyPassword1!', false);
      });
    });

    test('should call signIn with rememberMe=true when checkbox is checked', async () => {
      mockSignIn.mockResolvedValue(undefined);
      render(<SignInForm />);

      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'MyPassword1!');
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith('user@test.com', 'MyPassword1!', true);
      });
    });

    test('should call onSuccess callback after successful sign in', async () => {
      mockSignIn.mockResolvedValue(undefined);
      const onSuccess = jest.fn();
      render(<SignInForm onSuccess={onSuccess} />);

      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'MyPassword1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should show error message when signIn rejects', async () => {
      mockSignIn.mockRejectedValue(new Error('auth/wrong-password'));
      render(<SignInForm />);

      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'WrongPass1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });
    });

    test('should not call onSuccess on sign-in failure', async () => {
      mockSignIn.mockRejectedValue(new Error('auth/wrong-password'));
      const onSuccess = jest.fn();
      render(<SignInForm onSuccess={onSuccess} />);

      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'WrongPass1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(onSuccess).not.toHaveBeenCalled();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should disable submit button while loading', async () => {
      let resolveSignIn: () => void;
      mockSignIn.mockReturnValue(new Promise<void>((resolve) => { resolveSignIn = resolve; }));
      render(<SignInForm />);

      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'MyPassword1!');

      // Get the form and submit it
      const form = document.querySelector('form')!;
      fireEvent.submit(form);

      // When loading, the text changes to "Signing in..." and button is disabled
      await waitFor(() => {
        // The form should be in loading state - check the submit button type="submit" is disabled
        const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
        expect(submitBtn).toBeDisabled();
      });

      // Resolve to clean up
      act(() => resolveSignIn!());
    });
  });

  // -------------------------------------------------------------------------
  // Registration toggle
  // -------------------------------------------------------------------------
  describe('registration form toggle', () => {
    test('should show RegistrationForm when Create Account is clicked', async () => {
      render(<SignInForm />);
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      expect(screen.getByTestId('registration-form')).toBeInTheDocument();
    });

    test('should switch back to SignInForm when Cancel in RegistrationForm is clicked', async () => {
      render(<SignInForm />);
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      // RegistrationForm mock has a Cancel button
      await userEvent.click(screen.getByText('Cancel'));
      // The Card.Header title "Sign In" should be back
      expect(screen.queryByTestId('registration-form')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should switch back to SignInForm when Sign In Instead in RegistrationForm is clicked', async () => {
      render(<SignInForm />);
      await userEvent.click(screen.getByRole('button', { name: /create account/i }));
      await userEvent.click(screen.getByText('Sign In Instead'));
      expect(screen.queryByTestId('registration-form')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error clearing
  // -------------------------------------------------------------------------
  describe('error clearing', () => {
    test('should clear error message on subsequent submit attempts', async () => {
      mockSignIn
        .mockRejectedValueOnce(new Error('first failure'))
        .mockResolvedValueOnce(undefined);

      render(<SignInForm />);
      await userEvent.type(getEmailInput(), 'user@test.com');
      await userEvent.type(getPasswordInputs()[0] as HTMLInputElement, 'MyPassword1!');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      await waitFor(() => {
        expect(screen.getByText(/invalid email or password/i)).toBeInTheDocument();
      });

      // Try again — error should clear before the next result arrives
      fireEvent.submit(screen.getByRole('button', { name: /sign in/i }).closest('form')!);

      await waitFor(() => {
        expect(screen.queryByText(/invalid email or password/i)).not.toBeInTheDocument();
      });
    });
  });
});
