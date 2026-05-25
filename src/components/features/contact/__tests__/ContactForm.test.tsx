// src/components/features/contact/__tests__/ContactForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ContactForm from '../ContactForm';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockSendContactEmail = jest.fn();
const mockRegistryHas = jest.fn();
const mockRegistryGet = jest.fn();

// Mock ServiceRegistry singleton
jest.mock('../../../../services/firebase/core/ServiceRegistry', () => {
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        has: mockRegistryHas,
        get: mockRegistryGet,
      })),
    },
  };
});

// Mock Firebase Functions
jest.mock('firebase/functions', () => ({
  httpsCallable: jest.fn(() => mockSendContactEmail),
}));

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  useLocation: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useLocation } = require('react-router-dom');
const { httpsCallable } = require('firebase/functions');

function setupMocks({
  locationSearch = '',
  registryHasFunction = true,
  sendEmailResult = { data: { success: true, message: 'Message sent' } },
}: {
  locationSearch?: string;
  registryHasFunction?: boolean;
  sendEmailResult?: { data: { success: boolean; message: string } } | Error;
} = {}) {
  useLocation.mockReturnValue({ search: locationSearch, pathname: '/contact' });
  mockRegistryHas.mockReturnValue(registryHasFunction);
  mockRegistryGet.mockReturnValue({} /* mock Functions instance */);
  (httpsCallable as jest.Mock).mockReturnValue(mockSendContactEmail);

  if (sendEmailResult instanceof Error) {
    mockSendContactEmail.mockRejectedValue(sendEmailResult);
  } else {
    mockSendContactEmail.mockResolvedValue(sendEmailResult);
  }
}

// ---------------------------------------------------------------------------
// Helper: fill all required form fields
// ---------------------------------------------------------------------------
async function fillRequiredFields({
  name = 'John Doe',
  email = 'john@example.com',
  message = 'This is a test message long enough',
}: {
  name?: string;
  email?: string;
  message?: string;
} = {}) {
  const nameInput = screen.getAllByRole('textbox')[0];
  const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
  const messageTextarea = screen.getAllByRole('textbox').find(
    el => el.tagName === 'TEXTAREA' && (el as HTMLTextAreaElement).placeholder?.includes('minimum')
  );

  if (name) fireEvent.change(nameInput, { target: { value: name } });
  if (email && emailInput) fireEvent.change(emailInput, { target: { value: email } });
  if (message && messageTextarea) fireEvent.change(messageTextarea, { target: { value: message } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ContactForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Name label', () => {
      render(<ContactForm />);
      expect(screen.getByText('Name')).toBeInTheDocument();
    });

    test('should render Email label', () => {
      render(<ContactForm />);
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    test('should render Subject label (optional)', () => {
      render(<ContactForm />);
      expect(screen.getByText('Subject (optional)')).toBeInTheDocument();
    });

    test('should render Message label', () => {
      render(<ContactForm />);
      expect(screen.getByText('Message')).toBeInTheDocument();
    });

    test('should render Send Message submit button', () => {
      render(<ContactForm />);
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
    });

    test('should render email input with type="email"', () => {
      render(<ContactForm />);
      const emailInput = document.querySelector('input[type="email"]');
      expect(emailInput).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Initialization state
  // -------------------------------------------------------------------------
  describe('initialization', () => {
    test('should show "Initializing..." button text when Firebase not ready', () => {
      setupMocks({ registryHasFunction: false });
      render(<ContactForm />);
      // Shows initializing because timeout hasn't fired
      expect(screen.getByText('Initializing...')).toBeInTheDocument();
    });

    test('should disable submit button when not initialized', () => {
      setupMocks({ registryHasFunction: false });
      render(<ContactForm />);
      const button = screen.getByRole('button', { name: /initializing\.\.\./i });
      expect(button).toBeDisabled();
    });

    test('should show "Send Message" when Firebase is initialized', async () => {
      setupMocks({ registryHasFunction: true });
      render(<ContactForm />);
      await waitFor(() => {
        expect(screen.getByText('Send Message')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Initial data pre-population
  // -------------------------------------------------------------------------
  describe('initialData pre-population', () => {
    test('should prefill name from initialData', () => {
      render(<ContactForm initialData={{ name: 'Pre-filled Name' }} />);
      expect(screen.getByDisplayValue('Pre-filled Name')).toBeInTheDocument();
    });

    test('should prefill email from initialData', () => {
      render(<ContactForm initialData={{ email: 'prefilled@example.com' }} />);
      expect(screen.getByDisplayValue('prefilled@example.com')).toBeInTheDocument();
    });

    test('should prefill subject from initialData', () => {
      render(<ContactForm initialData={{ subject: 'Pre-filled Subject' }} />);
      expect(screen.getByDisplayValue('Pre-filled Subject')).toBeInTheDocument();
    });

    test('should prefill message from initialData', () => {
      render(<ContactForm initialData={{ message: 'Pre-filled message text' }} />);
      expect(screen.getByDisplayValue('Pre-filled message text')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // URL parameter pre-filling
  // -------------------------------------------------------------------------
  describe('URL parameter pre-filling', () => {
    test('should prefill subject from URL query parameter', async () => {
      setupMocks({ locationSearch: '?subject=My+Subject' });
      render(<ContactForm />);
      await waitFor(() => {
        expect(screen.getByDisplayValue('My Subject')).toBeInTheDocument();
      });
    });

    test('should prefill message template for Limit Increase subject', async () => {
      setupMocks({ locationSearch: '?subject=Limit+Increase+Request' });
      render(<ContactForm />);
      await waitFor(() => {
        expect(screen.getByDisplayValue(/usage limit/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Form validation
  // -------------------------------------------------------------------------
  describe('validation', () => {
    test('should show error when name is empty on submit', async () => {
      render(<ContactForm />);
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
    });

    test('should show error when email is empty on submit', async () => {
      render(<ContactForm />);
      const nameInput = screen.getAllByRole('textbox')[0];
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument();
      });
    });

    test('should show error for invalid email format', async () => {
      render(<ContactForm />);
      const nameInput = screen.getAllByRole('textbox')[0];
      fireEvent.change(nameInput, { target: { value: 'John' } });
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
      });
    });

    test('should show error when message is empty on submit', async () => {
      render(<ContactForm />);
      const nameInput = screen.getAllByRole('textbox')[0];
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Message is required')).toBeInTheDocument();
      });
    });

    test('should show error when message is too short (< 10 chars)', async () => {
      render(<ContactForm />);
      const nameInput = screen.getAllByRole('textbox')[0];
      const emailInput = document.querySelector('input[type="email"]') as HTMLInputElement;
      fireEvent.change(nameInput, { target: { value: 'John' } });
      fireEvent.change(emailInput, { target: { value: 'john@test.com' } });
      // Find message textarea by placeholder
      const messageTextarea = document.querySelector('textarea') as HTMLTextAreaElement;
      fireEvent.change(messageTextarea, { target: { value: 'Short' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/at least 10 characters/i)).toBeInTheDocument();
      });
    });

    test('should clear error when user starts typing after error', async () => {
      render(<ContactForm />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Name is required')).toBeInTheDocument();
      });
      const nameInput = screen.getAllByRole('textbox')[0];
      fireEvent.change(nameInput, { target: { value: 'J' } });
      await waitFor(() => {
        expect(screen.queryByText('Name is required')).not.toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call sendContactEmail with correct data on valid submission', async () => {
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockSendContactEmail).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'John Doe',
            email: 'john@example.com',
            message: 'This is a test message long enough',
          })
        );
      });
    });

    test('should show success state after successful submission', async () => {
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Message Sent!')).toBeInTheDocument();
      });
    });

    test('should show "Send Another Message" button after success', async () => {
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send another message/i })).toBeInTheDocument();
      });
    });

    test('should show "Sending..." during submission', async () => {
      mockSendContactEmail.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ data: { success: true, message: 'OK' } }), 100))
      );
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Sending...')).toBeInTheDocument();
      });
    });

    test('should show error message on Firebase function failure', async () => {
      const error = new Error('Network failure');
      mockSendContactEmail.mockRejectedValue(error);
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/Network failure/i)).toBeInTheDocument();
      });
    });

    test('should show error message for Firebase functions/resource-exhausted error code', async () => {
      const error = Object.assign(new Error('Rate limited'), { code: 'functions/resource-exhausted' });
      mockSendContactEmail.mockRejectedValue(error);
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/too many requests/i)).toBeInTheDocument();
      });
    });

    test('should show error message for functions/unavailable code', async () => {
      const error = Object.assign(new Error('Unavailable'), { code: 'functions/unavailable' });
      mockSendContactEmail.mockRejectedValue(error);
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument();
      });
    });

    test('should not submit when Firebase not initialized', async () => {
      setupMocks({ registryHasFunction: false });
      render(<ContactForm />);
      await fillRequiredFields();
      // Wait for form to be filled, then submit
      const form = document.querySelector('form')!;
      fireEvent.submit(form);
      await waitFor(() => {
        // Either contact system not ready message or no call to sendContactEmail
        const noCallOrError =
          !mockSendContactEmail.mock.calls.length ||
          screen.queryByText(/not ready/i);
        expect(noCallOrError).toBeTruthy();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Success state behavior
  // -------------------------------------------------------------------------
  describe('success state', () => {
    test('should show thank you message in success state', async () => {
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/thank you for contacting us/i)).toBeInTheDocument();
      });
    });

    test('should return to form when "Send Another Message" is clicked', async () => {
      render(<ContactForm />);
      await fillRequiredFields();
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /send another message/i })).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /send another message/i }));
      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Limit Increase tip
  // -------------------------------------------------------------------------
  describe('limit increase tip', () => {
    test('should show tip when subject contains "Limit Increase"', async () => {
      render(<ContactForm initialData={{ subject: 'Limit Increase Request' }} />);
      await waitFor(() => {
        expect(screen.getByText(/Tip:/)).toBeInTheDocument();
      });
    });

    test('should not show tip when subject does not contain "Limit Increase"', () => {
      render(<ContactForm initialData={{ subject: 'General Question' }} />);
      expect(screen.queryByText(/Tip:/)).not.toBeInTheDocument();
    });
  });
});
