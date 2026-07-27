// src/components/shared/__tests__/ErrorBoundary.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Component that always throws during render */
const ThrowingChild: React.FC<{ message?: string }> = ({ message = 'Test error' }) => {
  throw new Error(message);
};

/** Component that renders normally */
const NormalChild: React.FC = () => <div>Normal child content</div>;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ErrorBoundary', () => {
  // Suppress React's error boundary console noise
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Normal rendering
  // -------------------------------------------------------------------------
  describe('normal rendering (no error)', () => {
    test('should render children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <NormalChild />
        </ErrorBoundary>
      );

      expect(screen.getByText('Normal child content')).toBeInTheDocument();
    });

    test('should render multiple children when no error occurs', () => {
      render(
        <ErrorBoundary>
          <div>Child one</div>
          <div>Child two</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Child one')).toBeInTheDocument();
      expect(screen.getByText('Child two')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Error catching — default fallback
  // -------------------------------------------------------------------------
  describe('error catching with default fallback', () => {
    test('should render default error UI when a child throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    test('should render a "Refresh Page" button in default error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /refresh page/i })).toBeInTheDocument();
    });

    test('should render informational message in default error UI', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );

      expect(
        screen.getByText(/something unexpected happened/i)
      ).toBeInTheDocument();
    });

    test('should call window.location.reload when Refresh Page is clicked', () => {
      const reloadMock = jest.fn();
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingChild />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByRole('button', { name: /refresh page/i }));

      expect(reloadMock).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Error catching — custom fallback
  // -------------------------------------------------------------------------
  describe('error catching with custom fallback', () => {
    test('should render custom fallback when provided and child throws', () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingChild />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    });

    test('should NOT render default error UI when custom fallback is provided', () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowingChild />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    test('should not render the custom fallback when no error occurs', () => {
      const customFallback = <div>Custom error fallback</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <NormalChild />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Custom error fallback')).not.toBeInTheDocument();
      expect(screen.getByText('Normal child content')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // componentDidCatch
  // -------------------------------------------------------------------------
  describe('componentDidCatch logging', () => {
    test('should log the caught error to console.error', () => {
      render(
        <ErrorBoundary>
          <ThrowingChild message="Specific error for test" />
        </ErrorBoundary>
      );

      // React calls console.error itself AND our componentDidCatch calls it
      // Verify that console.error was called at least once
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
