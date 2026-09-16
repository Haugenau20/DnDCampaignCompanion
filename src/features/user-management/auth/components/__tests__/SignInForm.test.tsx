// src/features/user-management/auth/components/__tests__/SignInForm.test.tsx
//
// Rewritten for PR 14.4, which changed this component's specification rather
// than its implementation. Three groups of assertions were deleted because the
// behaviour they described is deliberately gone:
//
//   - "should render Create Account button" and the whole `registration form
//     toggle` describe block. The button promised a path that does not exist
//     without an invitation token, and the swap it performed was a step with
//     no URL and no visible progress. `RegistrationForm` is re-homed on
//     `/join`, not deleted.
//   - "should render Sign In heading". The form no longer titles itself; the
//     page does, once. A heading here plus a heading on the page is the
//     duplication this phase exists to remove.
//
// Everything about signing in itself is unchanged and still asserted below.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SignInForm from '../SignInForm';
import { unnamedControlsIn } from '@/test-utils/accessible-names';
import { formAccentsIn } from '@/test-utils/accent-budget';

const mockSignIn = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
}));

// This component imports its hook directly (importing the domain barrel from
// inside the domain would be a circular import), so point that module at the
// barrel mock defined above.
jest.mock('../../hooks/useAuth', () => require('@/features/user-management'));

const { useAuth } = require('@/features/user-management');

function setupMocks(overrides: Record<string, any> = {}) {
  useAuth.mockReturnValue({ signIn: mockSignIn, ...overrides });
}

/** A Router is required: the "new here?" line links to `/join`. */
function renderForm(props: { onSuccess?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <SignInForm {...props} />
    </MemoryRouter>
  );
}

function getEmailInput() {
  return screen.getByRole('textbox');
}
function getPasswordInput() {
  return document.querySelector('input[type="password"]') as HTMLInputElement;
}

describe('SignInForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('rendering', () => {
    test('should render email input', () => {
      renderForm();
      expect(getEmailInput()).toBeInTheDocument();
    });

    test('should render password input', () => {
      renderForm();
      expect(getPasswordInput()).toBeInTheDocument();
    });

    test('should render the keep-me-signed-in checkbox', () => {
      renderForm();
      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByText(/keep me signed in for 30 days/i)).toBeInTheDocument();
    });

    test('should render a submit button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    test('should not show error message initially', () => {
      renderForm();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    // The form is titled by the page, once. Two titles is the defect that made
    // the case for turning this surface into a page at all.
    test('should contribute no heading of its own', () => {
      renderForm();
      expect(screen.queryAllByRole('heading')).toHaveLength(0);
    });

    test('should not offer to create an account', () => {
      renderForm();
      expect(
        screen.queryByRole('button', { name: /create account/i })
      ).not.toBeInTheDocument();
    });

    // Accounts come from invitations. Saying so, with somewhere to go, is what
    // replaced the button that promised otherwise.
    test('should say where accounts come from, and link to /join', () => {
      renderForm();
      expect(screen.getByText(/accounts are created from an invitation/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /paste its token/i })).toHaveAttribute(
        'href',
        '/join'
      );
    });
  });

  describe('form inputs', () => {
    test('should update email field when typing', async () => {
      renderForm();
      await userEvent.type(getEmailInput(), 'a@b.test');
      expect(getEmailInput()).toHaveValue('a@b.test');
    });

    test('should update password field when typing', async () => {
      renderForm();
      await userEvent.type(getPasswordInput(), 'hunter2');
      expect(getPasswordInput()).toHaveValue('hunter2');
    });

    test('should toggle the keep-me-signed-in checkbox', async () => {
      renderForm();
      const box = screen.getByRole('checkbox');
      expect(box).not.toBeChecked();
      await userEvent.click(box);
      expect(box).toBeChecked();
    });
  });

  describe('form submission', () => {
    test('should call signIn with email and password on submit', async () => {
      mockSignIn.mockResolvedValueOnce(undefined);
      renderForm();
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() =>
        expect(mockSignIn).toHaveBeenCalledWith('a@b.test', 'hunter2', false)
      );
    });

    // The 30-day semantics are wiring this PR must not change, only rename.
    test('should call signIn with rememberMe=true when the checkbox is checked', async () => {
      mockSignIn.mockResolvedValueOnce(undefined);
      renderForm();
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('checkbox'));
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() =>
        expect(mockSignIn).toHaveBeenCalledWith('a@b.test', 'hunter2', true)
      );
    });

    test('should call onSuccess after a successful sign in', async () => {
      mockSignIn.mockResolvedValueOnce(undefined);
      const onSuccess = jest.fn();
      renderForm({ onSuccess });
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() => expect(onSuccess).toHaveBeenCalled());
    });

    test('should show an error message when signIn rejects', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('nope'));
      renderForm();
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'Invalid email or password'
      );
    });

    // Naming which field was wrong tells an attacker whether an address has an
    // account here. One message for both, deliberately.
    test('should not say which of the two fields was wrong', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('nope'));
      renderForm();
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      const alert = await screen.findByRole('alert');
      expect(alert.textContent).not.toMatch(/email (is|was) (not|in)/i);
      expect(alert.textContent).not.toMatch(/wrong password|no such (user|account)/i);
    });

    test('should not call onSuccess on sign-in failure', async () => {
      mockSignIn.mockRejectedValueOnce(new Error('nope'));
      const onSuccess = jest.fn();
      renderForm({ onSuccess });
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await screen.findByRole('alert');
      expect(onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('loading state', () => {
    test('should disable the submit button while loading', async () => {
      let resolve: () => void = () => {};
      mockSignIn.mockImplementationOnce(
        () => new Promise<void>((r) => { resolve = r; })
      );
      renderForm();
      await userEvent.type(getEmailInput(), 'a@b.test');
      await userEvent.type(getPasswordInput(), 'hunter2');
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
      await waitFor(() =>
        expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
      );
      await waitFor(async () => { resolve(); });
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
