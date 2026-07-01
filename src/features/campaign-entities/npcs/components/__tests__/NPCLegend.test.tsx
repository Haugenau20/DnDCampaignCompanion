// src/components/features/npcs/__tests__/NPCLegend.test.tsx

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import NPCLegend from '../NPCLegend';

// NPCLegend has no external context dependencies — render directly.

describe('NPCLegend', () => {
  // ---------------------------------------------------------------------------
  // Rendering — collapsed state (default)
  // ---------------------------------------------------------------------------
  describe('initial rendering', () => {
    test('should render the Legend heading', () => {
      render(<NPCLegend />);
      expect(screen.getByText('Legend')).toBeInTheDocument();
    });

    test('should render the toggle button', () => {
      render(<NPCLegend />);
      // The button wraps the Legend heading
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(1);
    });

    test('should render in collapsed state by default (collapsible div has max-h-0 class)', () => {
      const { container } = render(<NPCLegend />);
      // The collapsible wrapper div toggles between max-h-0 and max-h-[1000px]
      const collapsible = container.querySelector('.max-h-0');
      expect(collapsible).toBeInTheDocument();
    });

    test('should render status and relationship content in DOM even when collapsed', () => {
      render(<NPCLegend />);
      // Content is always in DOM, visibility is controlled by CSS classes
      expect(screen.getByText('NPC Status Types')).toBeInTheDocument();
      expect(screen.getByText('Relationship Types')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Expand / collapse behaviour
  // ---------------------------------------------------------------------------
  describe('expand and collapse', () => {
    test('should switch from max-h-0 to max-h-[1000px] after clicking toggle', () => {
      const { container } = render(<NPCLegend />);
      expect(container.querySelector('.max-h-0')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button'));
      expect(container.querySelector('.max-h-0')).not.toBeInTheDocument();
    });

    test('should add mt-4 class to collapsible area when expanded', () => {
      const { container } = render(<NPCLegend />);
      fireEvent.click(screen.getByRole('button'));
      const expanded = container.querySelector('.mt-4');
      expect(expanded).toBeInTheDocument();
    });

    test('should collapse again after a second click', () => {
      const { container } = render(<NPCLegend />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(container.querySelector('.max-h-0')).not.toBeInTheDocument();
      fireEvent.click(button);
      expect(container.querySelector('.max-h-0')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Status type entries
  // ---------------------------------------------------------------------------
  describe('status types content', () => {
    beforeEach(() => {
      render(<NPCLegend />);
      fireEvent.click(screen.getByRole('button'));
    });

    test('should display Alive status entry', () => {
      expect(screen.getByText('Alive')).toBeInTheDocument();
      expect(screen.getByText('NPC is alive')).toBeInTheDocument();
    });

    test('should display Deceased status entry', () => {
      expect(screen.getByText('Deceased')).toBeInTheDocument();
      expect(screen.getByText('NPC is no longer living')).toBeInTheDocument();
    });

    test('should display Missing status entry', () => {
      expect(screen.getByText('Missing')).toBeInTheDocument();
      expect(screen.getByText("NPC's whereabouts are unknown")).toBeInTheDocument();
    });

    test('should display Unknown status entry', () => {
      // "Unknown" appears twice (status + relationship) — both should be present
      const unknownLabels = screen.getAllByText('Unknown');
      expect(unknownLabels.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Relationship type entries
  // ---------------------------------------------------------------------------
  describe('relationship types content', () => {
    beforeEach(() => {
      render(<NPCLegend />);
      fireEvent.click(screen.getByRole('button'));
    });

    test('should display Friendly relationship entry', () => {
      expect(screen.getByText('Friendly')).toBeInTheDocument();
      expect(screen.getByText('Ally or friend to the party')).toBeInTheDocument();
    });

    test('should display Neutral relationship entry', () => {
      expect(screen.getByText('Neutral')).toBeInTheDocument();
      expect(screen.getByText('Neither friend nor foe')).toBeInTheDocument();
    });

    test('should display Hostile relationship entry', () => {
      expect(screen.getByText('Hostile')).toBeInTheDocument();
      expect(screen.getByText('Enemy or opponent of the party')).toBeInTheDocument();
    });

    test('should display Unknown relationship entry', () => {
      expect(screen.getByText('Relationship not yet determined')).toBeInTheDocument();
    });
  });
});
