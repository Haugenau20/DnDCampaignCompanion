// src/components/features/layouts/common/components/__tests__/EmptyState.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '../EmptyState';

// EmptyState uses Button from core/Button — no context needed, render directly.

describe('EmptyState', () => {
  const defaultIcon = <svg data-testid="test-icon" />;

  // ---------------------------------------------------------------------------
  // Zero State – minimal required props
  // ---------------------------------------------------------------------------
  describe('Zero State', () => {
    it('renders without crashing', () => {
      const { container } = render(
        <EmptyState icon={defaultIcon} message="Nothing here yet" />
      );
      expect(container).toBeInTheDocument();
    });

    it('renders the message text', () => {
      render(<EmptyState icon={defaultIcon} message="Nothing here yet" />);
      expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    });

    it('renders the icon', () => {
      render(<EmptyState icon={defaultIcon} message="Nothing here yet" />);
      expect(screen.getByTestId('test-icon')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Optional title prop
  // ---------------------------------------------------------------------------
  describe('title prop', () => {
    it('does not render a title element when title is omitted', () => {
      const { container } = render(<EmptyState icon={defaultIcon} message="No data" />);
      // When no title is provided, there should be no element with the title-specific class
      const titleEl = container.querySelector('.font-medium.typography');
      expect(titleEl).not.toBeInTheDocument();
    });

    it('renders title text when provided', () => {
      render(
        <EmptyState icon={defaultIcon} message="Subtitle text" title="Main Title" />
      );
      expect(screen.getByText('Main Title')).toBeInTheDocument();
    });

    it('renders both title and message when both are provided', () => {
      render(
        <EmptyState
          icon={defaultIcon}
          title="Title Text"
          message="Message Text"
        />
      );
      expect(screen.getByText('Title Text')).toBeInTheDocument();
      expect(screen.getByText('Message Text')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Action button – only shown when BOTH actionLabel and onAction are provided
  // ---------------------------------------------------------------------------
  describe('action button', () => {
    it('does not render a button when actionLabel is omitted', () => {
      render(
        <EmptyState
          icon={defaultIcon}
          message="No items"
          onAction={jest.fn()}
        />
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('does not render a button when onAction is omitted', () => {
      render(
        <EmptyState
          icon={defaultIcon}
          message="No items"
          actionLabel="Add Item"
        />
      );
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });

    it('renders a button when both actionLabel and onAction are provided', () => {
      render(
        <EmptyState
          icon={defaultIcon}
          message="No items"
          actionLabel="Add Item"
          onAction={jest.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /add item/i })).toBeInTheDocument();
    });

    it('calls onAction when the action button is clicked', async () => {
      const handleAction = jest.fn();
      const user = userEvent.setup();

      render(
        <EmptyState
          icon={defaultIcon}
          message="No items"
          actionLabel="Add Item"
          onAction={handleAction}
        />
      );

      await user.click(screen.getByRole('button', { name: /add item/i }));
      expect(handleAction).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------------
  // className prop
  // ---------------------------------------------------------------------------
  describe('className prop', () => {
    it('applies a custom className to the root element', () => {
      const { container } = render(
        <EmptyState
          icon={defaultIcon}
          message="No items"
          className="my-custom-class"
        />
      );
      expect(container.firstChild).toHaveClass('my-custom-class');
    });

    it('always applies the base journal-empty class', () => {
      const { container } = render(
        <EmptyState icon={defaultIcon} message="No items" />
      );
      expect(container.firstChild).toHaveClass('journal-empty');
    });
  });
});
