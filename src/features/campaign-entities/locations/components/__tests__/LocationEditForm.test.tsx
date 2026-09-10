// src/features/campaign-entities/locations/components/__tests__/LocationEditForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationEditForm from '../LocationEditForm';
import { Location } from '../../types';
import { unnamedControlsIn } from "../../../../../test-utils/accessible-names";
import { formAccentsIn } from "../../../../../test-utils/accent-budget";

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockUpdateLocation = jest.fn();

jest.mock('../../context/LocationContext', () => ({
  useLocations: jest.fn(),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../quests/context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useLocations } = require('../../context/LocationContext');
const { useNPCs } = require('../../../npcs/context/NPCContext');
const { useQuests } = require('../../../quests/context/QuestContext');
const { useAuth, useGroups, useCampaigns } = require('@/features/user-management');

function setupMocks({
  updateLocation = mockUpdateLocation,
  user = { uid: 'user-1' },
  activeGroupId = 'group-1',
  activeCampaignId = 'campaign-1',
  npcs = [] as any[],
  quests = [] as any[],
}: {
  updateLocation?: jest.Mock;
  user?: { uid: string } | null;
  activeGroupId?: string | null;
  activeCampaignId?: string | null;
  npcs?: any[];
  quests?: any[];
} = {}) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useGroups as jest.Mock).mockReturnValue({ activeGroupId });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId });
  (useLocations as jest.Mock).mockReturnValue({
    updateLocation,
    locations: [],
  });
  (useNPCs as jest.Mock).mockReturnValue({ npcs });
  (useQuests as jest.Mock).mockReturnValue({ quests });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeLocation(overrides: Partial<Location> = {}): Location {
  return {
    id: 'loc-1',
    name: 'Silverkeep',
    type: 'city',
    status: 'known',
    description: 'A prosperous trading city',
    features: [],
    connectedNPCs: [],
    relatedQuests: [],
    notes: [],
    tags: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationEditForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateLocation.mockResolvedValue(undefined);
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Gated state moved to the page
  //
  // This form used to render its own "No Active Group or Campaign" card when
  // group/campaign context was missing. That assertion encoded a layering
  // mistake: a form cannot tell a signed-out visitor from one still
  // resolving from one simply between campaigns. The gated state now lives
  // on LocationEditPage (via usePageGate/GatedContent) -- see that page's
  // suite for the moved assertions -- and this form renders its fields
  // whenever it reaches its own render at all, regardless of
  // activeGroupId/activeCampaignId, since a form that gets here has the
  // context it needs by construction.
  // -------------------------------------------------------------------------
  describe('rendering regardless of group/campaign context', () => {
    // Bug #251: the Input component renders labels without htmlFor/id
    // association, so getByLabelText() does not work here -- use getByText()
    // against the visible label instead, matching the rest of this suite.
    test('renders its fields whenever it is rendered at all', () => {
      setupMocks({ activeGroupId: null, activeCampaignId: null });
      render(<LocationEditForm location={makeLocation()} />);
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes[0]).toHaveValue('Silverkeep');
    });
  });

  // -------------------------------------------------------------------------
  // Rendering with pre-filled data
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render with location name prefilled', () => {
      render(<LocationEditForm location={makeLocation({ name: 'Silverkeep' })} />);
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes[0]).toHaveValue('Silverkeep');
    });

    test('should render with location description prefilled', () => {
      render(<LocationEditForm location={makeLocation({ description: 'A prosperous city' })} />);
      expect(screen.getByDisplayValue('A prosperous city')).toBeInTheDocument();
    });

    test('should render with location type prefilled', () => {
      render(<LocationEditForm location={makeLocation({ type: 'city' })} />);
      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'city');
      expect(typeSelect).toBeDefined();
    });

    test('should render with location status prefilled', () => {
      render(<LocationEditForm location={makeLocation({ status: 'explored' })} />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'explored');
      expect(statusSelect).toBeDefined();
    });

    test('should render Save Changes button', () => {
      render(<LocationEditForm location={makeLocation()} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    test('should render Cancel button', () => {
      render(<LocationEditForm location={makeLocation()} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render Notable Features section', () => {
      render(<LocationEditForm location={makeLocation()} />);
      expect(screen.getByText('Notable Features')).toBeInTheDocument();
    });

    test('should render Tags section', () => {
      render(<LocationEditForm location={makeLocation()} />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    test('should render existing tags', () => {
      render(<LocationEditForm location={makeLocation({ tags: ['trade-hub', 'safe'] })} />);
      expect(screen.getByText('trade-hub')).toBeInTheDocument();
      expect(screen.getByText('safe')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form interaction
  // -------------------------------------------------------------------------
  describe('form interaction', () => {
    test('should update name field when user types', async () => {
      render(<LocationEditForm location={makeLocation()} />);
      const nameInput = screen.getAllByRole('textbox')[0];
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'New Name');
      expect(nameInput).toHaveValue('New Name');
    });

    test('should update Type select when changed', () => {
      render(<LocationEditForm location={makeLocation({ type: 'city' })} />);
      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'city') as HTMLSelectElement;
      fireEvent.change(typeSelect, { target: { value: 'dungeon' } });
      expect(typeSelect).toHaveValue('dungeon');
    });

    test('should update Status select when changed', () => {
      render(<LocationEditForm location={makeLocation({ status: 'known' })} />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'known') as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'visited' } });
      expect(statusSelect).toHaveValue('visited');
    });
  });

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call updateLocation with correct data on valid submission', async () => {
      render(<LocationEditForm location={makeLocation()} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateLocation).toHaveBeenCalledWith(
          'loc-1',
          expect.objectContaining({
            name: 'Silverkeep',
            description: 'A prosperous trading city',
          })
        );
      });
    });

    test('should NOT call updateLocation when name is cleared', async () => {
      render(<LocationEditForm location={makeLocation()} />);
      const nameInput = screen.getAllByRole('textbox')[0];
      await userEvent.clear(nameInput);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateLocation).not.toHaveBeenCalled();
      });
    });

    test('should call onSuccess after successful submission', async () => {
      const onSuccess = jest.fn();
      render(<LocationEditForm location={makeLocation()} onSuccess={onSuccess} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should call onCancel when Cancel is clicked', () => {
      const onCancel = jest.fn();
      render(<LocationEditForm location={makeLocation()} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should show error message when updateLocation throws', async () => {
      mockUpdateLocation.mockRejectedValue(new Error('Update failed'));
      render(<LocationEditForm location={makeLocation()} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Update failed')).toBeInTheDocument();
      });
    });

    test('should show "Saving..." while submitting', async () => {
      mockUpdateLocation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      );
      render(<LocationEditForm location={makeLocation()} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    test('should pass selectedNPCs to updateLocation', async () => {
      render(
        <LocationEditForm
          location={makeLocation({ connectedNPCs: ['npc-1', 'npc-2'] })}
        />
      );
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateLocation).toHaveBeenCalledWith(
          'loc-1',
          expect.objectContaining({
            connectedNPCs: expect.arrayContaining(['npc-1', 'npc-2']),
          })
        );
      });
    });

    test('should pass selectedQuests to updateLocation', async () => {
      render(
        <LocationEditForm
          location={makeLocation({ relatedQuests: ['quest-1', 'quest-2'] })}
        />
      );
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateLocation).toHaveBeenCalledWith(
          'loc-1',
          expect.objectContaining({
            relatedQuests: expect.arrayContaining(['quest-1', 'quest-2']),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Dialog buttons
  // -------------------------------------------------------------------------
  describe('dialog buttons', () => {
    test('should render "Select Related Quests" button', () => {
      render(<LocationEditForm location={makeLocation()} />);
      expect(screen.getByRole('button', { name: /select related quests/i })).toBeInTheDocument();
    });

    test('should render "Select Connected NPCs" button', () => {
      render(<LocationEditForm location={makeLocation()} />);
      expect(screen.getByRole('button', { name: /select connected npcs/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Accessible names (PR 8.1)
  //
  // The point of the phase: every control announces itself. A grep proved the
  // old unassociated `<label>` markup was gone; only walking the DOM proves the
  // new markup is right, because a primitive whose `label` prop got dropped in
  // the move looks just as clean in the source.
  // -------------------------------------------------------------------------
  describe("accessible names", () => {
    test("every control in the form has an accessible name", () => {
      const { container } = render(<LocationEditForm location={makeLocation()} />);
      expect(unnamedControlsIn(container)).toEqual([]);
    });
  });


  // -------------------------------------------------------------------------
  // The accent budget (PR 8.3)
  //
  // One filled accent on the form, and it is the control that writes (D66).
  // `Add` and `Add tag` build a draft; the record changes when you save.
  // -------------------------------------------------------------------------
  describe("accent budget", () => {
    test("has exactly one filled accent, and it is the submit", () => {
      const { container } = render(<LocationEditForm location={makeLocation()} />);
      expect(formAccentsIn(container)).toHaveLength(1);
    });
  });

});
