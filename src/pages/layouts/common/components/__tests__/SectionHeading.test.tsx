// src/components/features/layouts/common/components/__tests__/SectionHeading.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import SectionHeading from '../SectionHeading';

describe('SectionHeading', () => {
  // ---------------------------------------------------------------------------
  // Zero State – minimal required props
  // ---------------------------------------------------------------------------
  describe('Zero State', () => {
    it('renders without crashing', () => {
      const { container } = render(<SectionHeading title="My Section" />);
      expect(container).toBeInTheDocument();
    });

    it('renders the title text inside an h3', () => {
      render(<SectionHeading title="My Section" />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('My Section');
    });

    it('does not render a count indicator when count and loading are omitted', () => {
      render(<SectionHeading title="My Section" />);
      // parenthesis characters should not appear
      expect(screen.queryByText(/\(/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // count prop
  // ---------------------------------------------------------------------------
  describe('count prop', () => {
    it('renders the count in parentheses when provided', () => {
      render(<SectionHeading title="NPCs" count={5} />);
      // The heading text should include "(5)"
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('(5)');
    });

    it('renders "(0)" when count is zero', () => {
      render(<SectionHeading title="NPCs" count={0} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('(0)');
    });
  });

  // ---------------------------------------------------------------------------
  // loading prop
  // ---------------------------------------------------------------------------
  describe('loading prop', () => {
    it('renders "(...)" when loading=true and no count', () => {
      render(<SectionHeading title="NPCs" loading />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('(...)');
    });

    it('renders "(...)" when loading=true even if count is provided', () => {
      render(<SectionHeading title="NPCs" loading count={5} />);
      const heading = screen.getByRole('heading', { level: 3 });
      expect(heading).toHaveTextContent('(...)');
    });

    it('does not show "..." when loading=false and no count', () => {
      render(<SectionHeading title="NPCs" loading={false} />);
      expect(screen.queryByText(/\.\.\./)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // icon prop
  // ---------------------------------------------------------------------------
  describe('icon prop', () => {
    it('renders the icon when provided', () => {
      render(
        <SectionHeading
          title="NPCs"
          icon={<svg data-testid="section-icon" />}
        />
      );
      expect(screen.getByTestId('section-icon')).toBeInTheDocument();
    });

    it('does not render the icon wrapper when icon is omitted', () => {
      const { container } = render(<SectionHeading title="NPCs" />);
      // The icon is wrapped in a span.flex-shrink-0
      expect(container.querySelector('.flex-shrink-0')).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // actions prop
  // ---------------------------------------------------------------------------
  describe('actions prop', () => {
    it('renders action content when provided', () => {
      render(
        <SectionHeading
          title="NPCs"
          actions={<button data-testid="add-btn">Add</button>}
        />
      );
      expect(screen.getByTestId('add-btn')).toBeInTheDocument();
    });

    it('does not render an actions container when actions is omitted', () => {
      const { container } = render(<SectionHeading title="NPCs" />);
      // When actions is omitted the root div should have only one direct child (the h3)
      const rootEl = container.firstChild as HTMLElement;
      // The root flex container: when no actions the only child is the h3
      expect(rootEl.children).toHaveLength(1);
      expect(rootEl.firstElementChild?.tagName).toBe('H3');
    });
  });

  // ---------------------------------------------------------------------------
  // className prop
  // ---------------------------------------------------------------------------
  describe('className prop', () => {
    it('applies a custom className to the root element', () => {
      const { container } = render(
        <SectionHeading title="NPCs" className="my-custom-class" />
      );
      expect(container.firstChild).toHaveClass('my-custom-class');
    });

    it('always applies flex and justify-between to root element', () => {
      const { container } = render(<SectionHeading title="NPCs" />);
      expect(container.firstChild).toHaveClass('flex');
      expect(container.firstChild).toHaveClass('justify-between');
    });
  });
});
