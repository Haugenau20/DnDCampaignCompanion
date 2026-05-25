// src/components/features/layouts/journal/__tests__/JournalPages.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import JournalPages from '../JournalPages';

describe('JournalPages', () => {
  // ---------------------------------------------------------------------------
  // Children rendering
  // ---------------------------------------------------------------------------
  describe('children rendering', () => {
    it('renders a single child', () => {
      render(
        <JournalPages>
          <div data-testid="page-one">Page One</div>
        </JournalPages>
      );
      expect(screen.getByTestId('page-one')).toBeInTheDocument();
    });

    it('renders multiple children side by side', () => {
      render(
        <JournalPages>
          <div data-testid="left-page">Left</div>
          <div data-testid="right-page">Right</div>
        </JournalPages>
      );
      expect(screen.getByTestId('left-page')).toBeInTheDocument();
      expect(screen.getByTestId('right-page')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Root element classes
  // ---------------------------------------------------------------------------
  describe('root element classes', () => {
    it('applies journal-pages class to the root element', () => {
      const { container } = render(
        <JournalPages>
          <span>child</span>
        </JournalPages>
      );
      expect(container.firstChild).toHaveClass('journal-pages');
    });

    it('applies w-full to the root element', () => {
      const { container } = render(
        <JournalPages>
          <span>child</span>
        </JournalPages>
      );
      expect(container.firstChild).toHaveClass('w-full');
    });

    it('applies flex layout to the root element', () => {
      const { container } = render(
        <JournalPages>
          <span>child</span>
        </JournalPages>
      );
      expect(container.firstChild).toHaveClass('flex');
    });

    it('renders a div as the root element', () => {
      const { container } = render(
        <JournalPages>
          <span>child</span>
        </JournalPages>
      );
      expect(container.firstChild?.nodeName).toBe('DIV');
    });
  });
});
