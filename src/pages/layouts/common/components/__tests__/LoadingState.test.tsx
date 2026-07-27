// src/components/features/layouts/common/components/__tests__/LoadingState.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import LoadingState from '../LoadingState';

describe('LoadingState', () => {
  // ---------------------------------------------------------------------------
  // Zero State – default props
  // ---------------------------------------------------------------------------
  describe('Zero State (default props)', () => {
    it('renders without crashing', () => {
      const { container } = render(<LoadingState />);
      expect(container).toBeInTheDocument();
    });

    it('renders skeleton items by default (type="skeleton")', () => {
      const { container } = render(<LoadingState />);
      // default count=3, so expect 3 skeleton divs inside the pulse container
      const pulseWrapper = container.querySelector('.animate-pulse');
      expect(pulseWrapper).toBeInTheDocument();
      // 3 child divs
      expect(pulseWrapper!.children).toHaveLength(3);
    });
  });

  // ---------------------------------------------------------------------------
  // iconOnly mode
  // ---------------------------------------------------------------------------
  describe('iconOnly mode', () => {
    it('renders spinner icon without skeletons when iconOnly=true', () => {
      const { container } = render(<LoadingState iconOnly />);
      // The pulse wrapper should NOT be present
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });

    it('renders a wrapper with animate-spin class in iconOnly mode', () => {
      const { container } = render(<LoadingState iconOnly />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // type="skeleton"
  // ---------------------------------------------------------------------------
  describe('type="skeleton"', () => {
    it('renders the correct number of skeleton items based on count prop', () => {
      const { container } = render(<LoadingState type="skeleton" count={5} />);
      const pulseWrapper = container.querySelector('.animate-pulse');
      expect(pulseWrapper!.children).toHaveLength(5);
    });

    it('renders a single skeleton item when count=1', () => {
      const { container } = render(<LoadingState type="skeleton" count={1} />);
      const pulseWrapper = container.querySelector('.animate-pulse');
      expect(pulseWrapper!.children).toHaveLength(1);
    });

    it('applies the height class to each skeleton item', () => {
      const { container } = render(
        <LoadingState type="skeleton" count={2} height="h-16" />
      );
      const pulseWrapper = container.querySelector('.animate-pulse');
      const items = Array.from(pulseWrapper!.children);
      items.forEach((item) => {
        expect(item).toHaveClass('h-16');
      });
    });

    it('applies journal-loading class to each skeleton item', () => {
      const { container } = render(<LoadingState type="skeleton" count={2} />);
      const pulseWrapper = container.querySelector('.animate-pulse');
      const items = Array.from(pulseWrapper!.children);
      items.forEach((item) => {
        expect(item).toHaveClass('journal-loading');
      });
    });

    it('applies a custom className to the skeleton wrapper', () => {
      const { container } = render(
        <LoadingState type="skeleton" className="custom-skeleton" />
      );
      const pulseWrapper = container.querySelector('.animate-pulse');
      expect(pulseWrapper).toHaveClass('custom-skeleton');
    });
  });

  // ---------------------------------------------------------------------------
  // type="list" and type="card" (non-skeleton fallback)
  // ---------------------------------------------------------------------------
  describe('type="list" (non-skeleton spinner)', () => {
    it('renders "Loading..." text in non-skeleton mode', () => {
      render(<LoadingState type="list" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders animate-spin icon in non-skeleton mode', () => {
      const { container } = render(<LoadingState type="list" />);
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('does not render pulse wrapper in non-skeleton mode', () => {
      const { container } = render(<LoadingState type="list" />);
      expect(container.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  describe('type="card" (non-skeleton spinner)', () => {
    it('renders "Loading..." text in card mode', () => {
      render(<LoadingState type="card" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // iconOnly takes precedence over type
  // ---------------------------------------------------------------------------
  describe('iconOnly precedence', () => {
    it('renders iconOnly spinner even when type="list"', () => {
      render(<LoadingState iconOnly type="list" />);
      // iconOnly path renders before type check, so no "Loading..." text
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });
  });
});
