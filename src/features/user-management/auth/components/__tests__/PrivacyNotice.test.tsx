// src/components/features/auth/__tests__/PrivacyNotice.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PrivacyNotice from '../PrivacyNotice';

// ---------------------------------------------------------------------------
// Mock useNavigation hook
// ---------------------------------------------------------------------------
const mockNavigateToPage = jest.fn();

jest.mock('@/hooks/useNavigation', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('@/hooks/useNavigation');

// ---------------------------------------------------------------------------
// Mock Button and Typography core components
// ---------------------------------------------------------------------------
jest.mock('@/components/core/Button', () => {
  const Button = ({ children, onClick, variant, size, startIcon, endIcon, ...rest }: any) => (
    <button onClick={onClick} {...rest}>
      {startIcon}
      {children}
      {endIcon}
    </button>
  );
  return Button;
});

jest.mock('@/components/core/Typography', () => {
  const Typography = ({ children, variant, color, className }: any) => (
    <span className={className}>{children}</span>
  );
  return Typography;
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setupMocks() {
  useNavigation.mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PrivacyNotice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // -------------------------------------------------------------------------
  // Initial display
  // -------------------------------------------------------------------------
  describe('initial display', () => {
    test('should render the notice when privacyNoticeSeen is not in localStorage', () => {
      render(<PrivacyNotice />);
      expect(screen.getByText('Privacy Notice')).toBeInTheDocument();
    });

    test('should NOT render when privacyNoticeSeen is set in localStorage', () => {
      localStorage.setItem('privacyNoticeSeen', 'true');
      const { container } = render(<PrivacyNotice />);
      expect(container.firstChild).toBeNull();
    });

    test('should display session timeout information text', () => {
      render(<PrivacyNotice />);
      expect(screen.getByText(/tracks session activity/i)).toBeInTheDocument();
    });

    test('should show "Privacy Policy" link button', () => {
      render(<PrivacyNotice />);
      expect(screen.getByText(/privacy policy/i)).toBeInTheDocument();
    });

    test('should show "Got it" dismiss button', () => {
      render(<PrivacyNotice />);
      expect(screen.getByText(/got it/i)).toBeInTheDocument();
    });

    test('should show dismiss icon button with aria-label', () => {
      render(<PrivacyNotice />);
      expect(screen.getByLabelText('Dismiss privacy notice')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Dismissal behavior
  // -------------------------------------------------------------------------
  describe('dismissal behavior', () => {
    test('should hide the notice when "Got it" button is clicked', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByText(/got it/i));
      expect(screen.queryByText('Privacy Notice')).not.toBeInTheDocument();
    });

    test('should set privacyNoticeSeen in localStorage when dismissed via "Got it"', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByText(/got it/i));
      expect(localStorage.getItem('privacyNoticeSeen')).toBe('true');
    });

    test('should hide the notice when the close icon button is clicked', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByLabelText('Dismiss privacy notice'));
      expect(screen.queryByText('Privacy Notice')).not.toBeInTheDocument();
    });

    test('should set privacyNoticeSeen in localStorage when dismissed via icon button', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByLabelText('Dismiss privacy notice'));
      expect(localStorage.getItem('privacyNoticeSeen')).toBe('true');
    });
  });

  // -------------------------------------------------------------------------
  // Privacy Policy navigation
  // -------------------------------------------------------------------------
  describe('privacy policy navigation', () => {
    test('should call navigateToPage with /privacy when Privacy Policy is clicked', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByText(/privacy policy/i));
      expect(mockNavigateToPage).toHaveBeenCalledWith('/privacy');
    });

    test('should keep the notice visible after clicking Privacy Policy', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByText(/privacy policy/i));
      // Notice should still be visible (not dismissed)
      expect(screen.getByText('Privacy Notice')).toBeInTheDocument();
    });

    test('should NOT set privacyNoticeSeen in localStorage when Privacy Policy is clicked', () => {
      render(<PrivacyNotice />);
      fireEvent.click(screen.getByText(/privacy policy/i));
      expect(localStorage.getItem('privacyNoticeSeen')).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // localStorage interaction
  // -------------------------------------------------------------------------
  describe('localStorage interaction', () => {
    test('should only show once per session when dismissed and re-mounted', () => {
      const { unmount } = render(<PrivacyNotice />);
      fireEvent.click(screen.getByText(/got it/i));
      unmount();

      // Re-mount — notice should not appear because localStorage is set
      const { container } = render(<PrivacyNotice />);
      expect(container.firstChild).toBeNull();
    });
  });
});
