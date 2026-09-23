// src/features/user-management/auth/components/__tests__/SignInForm.test.tsx
//
// Rewritten for T022, which removed password sign-in on purpose. The form now
// offers a magic link by email, or Google. What the previous version asserted
// about the page around the form -- no heading of its own, no "create
// account", a sentence and a link to `/join`, the 30-day checkbox, the
// accessible-name and accent budgets -- is unchanged and still asserted here.
//
// Two password-era assertions are gone rather than rewritten: "one message for
// both fields" (there is one field) and "Invalid email or password" (there is
// no password). The enumeration concern behind them is handled where it now
// lives: asking for a link never says whether the address has an account.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignInForm from '../SignInForm';
import { unnamedControlsIn } from '@/test-utils/accessible-names';
import { formAccentsIn } from '@/test-utils/accent-budget';

const mockSendSignInLink = jest.fn();
const mockSignInWithGoogle = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
}));

// This component imports its hook directly (importing the domain barrel from
// inside the domain would be a circular import), so point that module at the
// barrel mock defined above.
jest.mock('../../hooks/useAuth', () => require('@/features/user-management'));

const { useAuth } = require('@/features/user-management');

function setupMocks(overrides: Record<string, any> = {}) {
  useAuth.mockReturnValue({
    sendSignInLink: mockSendSignInLink,
    signInWithGoogle: mockSignInWithGoogle,
    ...overrides,
  });
}

/** A Router is required: the "new here?" line links to `/join`. */
function renderForm(props: { onSuccess?: () => void; next?: string | null } = {}) {
  return render(
    <MemoryRouter>
      <SignInForm {...props} />
    </MemoryRouter>
  );
}

const emailInput = () => screen.getByRole('textbox', { name: /email/i });
const linkButton = () => screen.getByRole('button', { name: /email me a sign-in link/i });
const googleButton = () => screen.getByRole('button', { name: /continue with google/i });

/** An error shaped like the one a refused blocking function produces. */
const gateRefusal = (marker: string) =>
  Object.assign(new Error(`Firebase: ${marker}: refused (auth/internal-error).`), {
    code: 'auth/internal-error',
  });

describe('SignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('rendering', () => {
    test('asks for an email and nothing else', () => {
      renderForm();
      expect(emailInput()).toBeInTheDocument();
      expect(document.querySelector('input[type="password"]')).toBeNull();
    });

    test('offers a magic link and Google', () => {
      renderForm();
      expect(linkButton()).toBeInTheDocument();
      expect(googleButton()).toBeInTheDocument();
    });

    test('renders the keep-me-signed-in checkbox', () => {
      renderForm();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/keep me signed in for 30 days/i)).toBeInTheDocument();
    });

    test('does not offer the link until the address looks like one', async () => {
      renderForm();
      expect(linkButton()).toBeDisabled();
      await userEvent.type(emailInput(), 'a@b.test');
      expect(linkButton()).toBeEnabled();
    });

    test('shows no error initially', () => {
      renderForm();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // The form is titled by the page, once.
    test('contributes no heading of its own', () => {
      renderForm();
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });

    test('does not offer to create an account', () => {
      renderForm();
      expect(screen.queryByRole('button', { name: /create account/i })).not.toBeInTheDocument();
    });

    test('says where accounts come from, and links to /join', () => {
      renderForm();
      expect(screen.getByText(/accounts are created from an invitation/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /paste its token/i })).toHaveAttribute('href', '/join');
    });
  });

  describe('magic link', () => {
    test('sends a link that opens /auth/link, carrying the destination', async () => {
      mockSendSignInLink.mockResolvedValueOnce(undefined);
      renderForm({ next: '/npcs' });
      await userEvent.type(emailInput(), 'a@b.test');
      await userEvent.click(linkButton());
      await waitFor(() =>
        expect(mockSendSignInLink).toHaveBeenCalledWith(
          'a@b.test',
          `${window.location.origin}/auth/link?next=%2Fnpcs`,
          false
        )
      );
    });

    // The 30-day semantics are wiring this change must not lose.
    test('passes rememberMe=true when the checkbox is checked', async () => {
      mockSendSignInLink.mockResolvedValueOnce(undefined);
      renderForm();
      await userEvent.type(emailInput(), 'a@b.test');
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.click(linkButton());
      await waitFor(() =>
        expect(mockSendSignInLink).toHaveBeenCalledWith('a@b.test', expect.any(String), true)
      );
    });

    test('says where the link went, and offers another address', async () => {
      mockSendSignInLink.mockResolvedValueOnce(undefined);
      renderForm();
      await userEvent.type(emailInput(), 'a@b.test');
      await userEvent.click(linkButton());

      expect(await screen.findByText(/check your inbox/i)).toBeInTheDocument();
      expect(screen.getByText('a@b.test')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: /use a different email/i }));
      expect(emailInput()).toBeInTheDocument();
    });

    test('does not call onSuccess -- nobody is signed in until the link is opened', async () => {
      mockSendSignInLink.mockResolvedValueOnce(undefined);
      const onSuccess = jest.fn();
      renderForm({ onSuccess });
      await userEvent.type(emailInput(), 'a@b.test');
      await userEvent.click(linkButton());
      await screen.findByText(/check your inbox/i);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('shows an error when the link cannot be sent', async () => {
      mockSendSignInLink.mockRejectedValueOnce(
        Object.assign(new Error('quota'), { code: 'auth/too-many-requests' })
      );
      renderForm();
      await userEvent.type(emailInput(), 'a@b.test');
      await userEvent.click(linkButton());
      expect(await screen.findByRole('alert')).toHaveTextContent(/too many attempts/i);
    });

    test('disables both buttons while sending', async () => {
      let resolve: () => void = () => {};
      mockSendSignInLink.mockImplementationOnce(() => new Promise<void>((r) => { resolve = r; }));
      renderForm();
      await userEvent.type(emailInput(), 'a@b.test');
      await userEvent.click(linkButton());
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /sending link/i })).toBeDisabled()
      );
      expect(googleButton()).toBeDisabled();
      resolve();
      await screen.findByText(/check your inbox/i);
    });
  });

  describe('Google', () => {
    test('signs in with the chosen session length and calls onSuccess', async () => {
      mockSignInWithGoogle.mockResolvedValueOnce({ user: { uid: 'u' }, isNewUser: false });
      const onSuccess = jest.fn();
      renderForm({ onSuccess });
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.click(googleButton());
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
      expect(mockSignInWithGoogle).toHaveBeenCalledWith(true);
    });

    test('explains an uninvited Google account, and does not call onSuccess', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(gateRefusal('INVITE_REQUIRED'));
      const onSuccess = jest.fn();
      renderForm({ onSuccess });
      await userEvent.click(googleButton());
      expect(await screen.findByRole('alert')).toHaveTextContent(/no account for this google address/i);
      expect(onSuccess).not.toHaveBeenCalled();
    });

    test('says so when the site is full', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(gateRefusal('ACCOUNTS_FULL'));
      renderForm();
      await userEvent.click(googleButton());
      expect(await screen.findByRole('alert')).toHaveTextContent(/not taking new accounts/i);
    });

    test('stays quiet when the popup is simply closed', async () => {
      mockSignInWithGoogle.mockRejectedValueOnce(
        Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' })
      );
      renderForm();
      await userEvent.click(googleButton());
      await waitFor(() => expect(googleButton()).toBeEnabled());
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });
});

describe('SignInForm — names and accents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  test('every control has an accessible name', () => {
    const { container } = renderForm();
    expect(unnamedControlsIn(container)).toEqual([]);
  });

  test('stays within the form accent budget', () => {
    const { container } = renderForm();
    expect(formAccentsIn(container).length).toBeLessThanOrEqual(2);
  });
});
