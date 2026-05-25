// src/components/features/layouts/journal/sections/__tests__/CharacterGallery.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import CharacterGallery from '../CharacterGallery';
import { NPC } from '../../../../../../types/npc';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
jest.mock('../../../../../../context/NavigationContext', () => ({
  useNavigation: jest.fn(),
}));

const { useNavigation } = require('../../../../../../context/NavigationContext');
const mockNavigateToPage = jest.fn();

function setupMocks() {
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------
const BASE_NPC: NPC = {
  id: 'npc-1',
  name: 'Aldric',
  status: 'alive',
  relationship: 'friendly',
  description: 'A brave warrior',
  connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
  notes: [],
  createdBy: 'user-1',
  createdByUsername: 'user1',
  dateAdded: '2024-01-01',
};

function makeNPC(overrides: Partial<NPC> = {}): NPC {
  return { ...BASE_NPC, id: `npc-${Math.random().toString(36).slice(2)}`, ...overrides };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CharacterGallery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Section heading
  // -------------------------------------------------------------------------
  describe('section heading', () => {
    it('renders the "Notable Characters" heading', () => {
      render(<CharacterGallery npcs={[]} loading={false} />);
      expect(screen.getByText(/Notable Characters/)).toBeInTheDocument();
    });

    it('shows the NPC count when not loading', () => {
      const npcs = [makeNPC(), makeNPC()];
      render(<CharacterGallery npcs={npcs} loading={false} />);
      // Heading text: "Notable Characters (2)"
      expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
    });

    it('shows "..." in the count while loading', () => {
      render(<CharacterGallery npcs={[]} loading={true} />);
      // During loading, count is shown as '...'
      expect(screen.getByText(/\(\.\.\.\)/)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('renders placeholder cards while loading', () => {
      const { container } = render(<CharacterGallery npcs={[]} loading={true} />);
      // Three skeleton divs: w-24 h-24
      const skeletons = container.querySelectorAll('.w-24.h-24');
      expect(skeletons).toHaveLength(3);
    });

    it('does not render NPC cards while loading', () => {
      const npcs = [makeNPC({ name: 'Aldric' })];
      render(<CharacterGallery npcs={npcs} loading={true} />);
      expect(screen.queryByText('Aldric')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Empty state
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('shows "No characters yet" when there are no NPCs and not loading', () => {
      render(<CharacterGallery npcs={[]} loading={false} />);
      expect(screen.getByText('No characters yet')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // NPC list rendering
  // -------------------------------------------------------------------------
  describe('NPC list', () => {
    it('renders a card for each NPC', () => {
      const npcs = [
        makeNPC({ name: 'Aldric' }),
        makeNPC({ name: 'Miriel' }),
        makeNPC({ name: 'Torric' }),
      ];
      render(<CharacterGallery npcs={npcs} loading={false} />);
      expect(screen.getByText('Aldric')).toBeInTheDocument();
      expect(screen.getByText('Miriel')).toBeInTheDocument();
      expect(screen.getByText('Torric')).toBeInTheDocument();
    });

    it('renders the NPC race when provided', () => {
      const npcs = [makeNPC({ name: 'Aldric', race: 'Human' })];
      render(<CharacterGallery npcs={npcs} loading={false} />);
      expect(screen.getByText('Human')).toBeInTheDocument();
    });

    it('does not render a race element when race is absent', () => {
      const npcs = [makeNPC({ name: 'Aldric', race: undefined })];
      render(<CharacterGallery npcs={npcs} loading={false} />);
      // Check that there is no italic span for race (race is rendered in italic)
      const italicElements = document.querySelectorAll('.italic');
      // None should contain a race-like text
      italicElements.forEach(el => {
        expect(el.textContent).not.toMatch(/^Human$/);
      });
    });

    it('only shows the first 6 NPCs', () => {
      const npcs = Array.from({ length: 8 }, (_, i) =>
        makeNPC({ name: `NPC ${i + 1}` })
      );
      render(<CharacterGallery npcs={npcs} loading={false} />);
      // First 6 should appear; last 2 should not
      expect(screen.getByText('NPC 1')).toBeInTheDocument();
      expect(screen.getByText('NPC 6')).toBeInTheDocument();
      expect(screen.queryByText('NPC 7')).not.toBeInTheDocument();
      expect(screen.queryByText('NPC 8')).not.toBeInTheDocument();
    });

    it('shows "...and N more" note when there are more than 6 NPCs', () => {
      const npcs = Array.from({ length: 9 }, (_, i) =>
        makeNPC({ name: `NPC ${i + 1}` })
      );
      render(<CharacterGallery npcs={npcs} loading={false} />);
      expect(screen.getByText('...and 3 more')).toBeInTheDocument();
    });

    it('does not show "more" note when there are exactly 6 NPCs', () => {
      const npcs = Array.from({ length: 6 }, (_, i) =>
        makeNPC({ name: `NPC ${i + 1}` })
      );
      render(<CharacterGallery npcs={npcs} loading={false} />);
      expect(screen.queryByText(/and \d+ more/)).not.toBeInTheDocument();
    });

    it('does not show "more" note when there are fewer than 6 NPCs', () => {
      const npcs = [makeNPC({ name: 'Only One' })];
      render(<CharacterGallery npcs={npcs} loading={false} />);
      expect(screen.queryByText(/and \d+ more/)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Click navigation
  // -------------------------------------------------------------------------
  describe('NPC click navigation', () => {
    it('calls navigateToPage with the NPC highlight URL when a character card is clicked', () => {
      const npc = makeNPC({ id: 'npc-abc', name: 'Aldric' });
      render(<CharacterGallery npcs={[npc]} loading={false} />);

      const card = screen.getByText('Aldric').closest('div[class*="cursor-pointer"]');
      expect(card).not.toBeNull();
      fireEvent.click(card!);

      expect(mockNavigateToPage).toHaveBeenCalledTimes(1);
      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-abc');
    });

    it('navigates with the correct NPC id for each individual card', () => {
      const npc1 = makeNPC({ id: 'npc-1', name: 'Aldric' });
      const npc2 = makeNPC({ id: 'npc-2', name: 'Miriel' });
      render(<CharacterGallery npcs={[npc1, npc2]} loading={false} />);

      const card2 = screen.getByText('Miriel').closest('div[class*="cursor-pointer"]');
      fireEvent.click(card2!);

      expect(mockNavigateToPage).toHaveBeenCalledWith('/npcs?highlight=npc-2');
    });
  });
});
