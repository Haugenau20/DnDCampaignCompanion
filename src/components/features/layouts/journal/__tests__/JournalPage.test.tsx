// src/components/features/layouts/journal/__tests__/JournalPage.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import JournalPage from '../JournalPage';

describe('JournalPage', () => {
  // ---------------------------------------------------------------------------
  // Rendering children
  // ---------------------------------------------------------------------------
  describe('children rendering', () => {
    it('renders children content', () => {
      render(
        <JournalPage side="left">
          <p data-testid="child-content">Hello journal</p>
        </JournalPage>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('renders multiple children', () => {
      render(
        <JournalPage side="left">
          <span data-testid="child-a">A</span>
          <span data-testid="child-b">B</span>
        </JournalPage>
      );
      expect(screen.getByTestId('child-a')).toBeInTheDocument();
      expect(screen.getByTestId('child-b')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // CSS class application based on `side` prop
  // ---------------------------------------------------------------------------
  describe('side prop class application', () => {
    it('applies journal-page-left class when side is "left"', () => {
      const { container } = render(
        <JournalPage side="left">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).toHaveClass('journal-page-left');
    });

    it('applies journal-page-right class when side is "right"', () => {
      const { container } = render(
        <JournalPage side="right">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).toHaveClass('journal-page-right');
    });

    it('applies journal-page-single class when side is "single"', () => {
      const { container } = render(
        <JournalPage side="single">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).toHaveClass('journal-page-single');
    });

    it('always applies journal-page base class', () => {
      const { container } = render(
        <JournalPage side="left">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).toHaveClass('journal-page');
    });
  });

  // ---------------------------------------------------------------------------
  // Border / shadow classes based on `side` prop
  // ---------------------------------------------------------------------------
  describe('side-specific border and shadow classes', () => {
    it('applies border-r to the left page', () => {
      const { container } = render(
        <JournalPage side="left">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).toHaveClass('border-r');
    });

    it('applies border-l to the right page', () => {
      const { container } = render(
        <JournalPage side="right">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).toHaveClass('border-l');
    });

    it('does not apply border-r to the right page', () => {
      const { container } = render(
        <JournalPage side="right">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).not.toHaveClass('border-r');
    });

    it('does not apply border-l to the left page', () => {
      const { container } = render(
        <JournalPage side="left">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page).not.toHaveClass('border-l');
    });
  });

  // ---------------------------------------------------------------------------
  // Background position inline style based on `side` prop
  // ---------------------------------------------------------------------------
  describe('background position style', () => {
    it('sets backgroundPosition to "left center" for the left page', () => {
      const { container } = render(
        <JournalPage side="left">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page.style.backgroundPosition).toBe('left center');
    });

    it('sets backgroundPosition to "right center" for the right page', () => {
      const { container } = render(
        <JournalPage side="right">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      expect(page.style.backgroundPosition).toBe('right center');
    });

    it('sets backgroundPosition to "right center" for the single page (non-left)', () => {
      const { container } = render(
        <JournalPage side="single">
          <span>content</span>
        </JournalPage>
      );
      const page = container.firstChild as HTMLElement;
      // side !== 'left', so backgroundPosition defaults to 'right center'
      expect(page.style.backgroundPosition).toBe('right center');
    });
  });

  // ---------------------------------------------------------------------------
  // Inner wrapper
  // ---------------------------------------------------------------------------
  describe('inner content wrapper', () => {
    it('wraps children in a space-y-6 container', () => {
      const { container } = render(
        <JournalPage side="left">
          <span data-testid="content">content</span>
        </JournalPage>
      );
      const inner = container.querySelector('.space-y-6');
      expect(inner).toBeInTheDocument();
      expect(inner).toContainElement(screen.getByTestId('content'));
    });
  });
});
