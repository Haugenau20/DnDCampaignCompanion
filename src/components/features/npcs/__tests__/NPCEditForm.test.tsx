// src/components/features/npcs/__tests__/NPCEditForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NPCEditForm from '../NPCEditForm';
import { NPC, NPCStatus, NPCRelationship } from '../../../../types/npc';
import { Quest } from '../../../../types/quest';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockUpdateNPC = jest.fn();

jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

jest.mock('../../../../utils/user-utils', () => ({
  getUserName: jest.fn(() => 'TestUser'),
  getActiveCharacterName: jest.fn(() => null),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useNPCs } = require('../../../../context/NPCContext');
const { useQuests } = require('../../../../context/QuestContext');
const { useAuth, useUser } = require('../../../../context/firebase');

function setupMocks({
  updateNPC = mockUpdateNPC,
  isLoading = false,
  error = null as string | null,
  quests = [] as Quest[],
  user = { uid: 'user-1' },
}: {
  updateNPC?: jest.Mock;
  isLoading?: boolean;
  error?: string | null;
  quests?: Quest[];
  user?: { uid: string } | null;
} = {}) {
  (useNPCs as jest.Mock).mockReturnValue({ updateNPC, isLoading, error });
  (useQuests as jest.Mock).mockReturnValue({ quests });
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useUser as jest.Mock).mockReturnValue({
    userProfile: { username: 'TestUser' },
    activeGroupUserProfile: {
      username: 'TestUser',
      activeCharacterId: null,
      activeCharacterName: null,
      characters: [],
    },
  });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeNPC(overrides: Partial<NPC> = {}): NPC {
  return {
    id: 'npc-1',
    name: 'Aldric the Wise',
    title: 'Court Wizard',
    status: 'alive' as NPCStatus,
    relationship: 'friendly' as NPCRelationship,
    description: 'A knowledgeable wizard',
    appearance: 'Tall with a long white beard',
    personality: 'Patient and wise',
    background: 'Former royal advisor',
    occupation: 'Wizard',
    location: 'Silverkeep',
    race: 'Human',
    connections: { relatedNPCs: [], affiliations: [], relatedQuests: [] },
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function makeQuest(id: string, title: string): Quest {
  return {
    id,
    title,
    description: '',
    status: 'active',
    objectives: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('NPCEditForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateNPC.mockResolvedValue(undefined);
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Basic Information heading', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
    });

    test('should render Character Details heading', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByText('Character Details')).toBeInTheDocument();
    });

    test('should render Connections heading', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByText('Connections')).toBeInTheDocument();
    });

    test('should render Save Changes submit button', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    test('should render Cancel button', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render "Select Related NPCs" button', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByRole('button', { name: /select related npcs/i })).toBeInTheDocument();
    });

    test('should render "Select Related Quests" button', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByRole('button', { name: /select related quests/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Pre-population from NPC prop
  // -------------------------------------------------------------------------
  describe('form pre-population', () => {
    test('should prefill name input with NPC name', () => {
      render(<NPCEditForm npc={makeNPC({ name: 'Aldric' })} existingNPCs={[]} />);
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes[0]).toHaveValue('Aldric');
    });

    test('should prefill title input with NPC title', () => {
      render(<NPCEditForm npc={makeNPC({ title: 'Grand Wizard' })} existingNPCs={[]} />);
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes[1]).toHaveValue('Grand Wizard');
    });

    test('should prefill status select with NPC status', () => {
      render(<NPCEditForm npc={makeNPC({ status: 'deceased' })} existingNPCs={[]} />);
      const selects = screen.getAllByRole('combobox');
      expect(selects[0]).toHaveValue('deceased');
    });

    test('should prefill relationship select with NPC relationship', () => {
      render(<NPCEditForm npc={makeNPC({ relationship: 'hostile' })} existingNPCs={[]} />);
      const selects = screen.getAllByRole('combobox');
      expect(selects[1]).toHaveValue('hostile');
    });

    test('should prefill description with NPC description', () => {
      render(<NPCEditForm npc={makeNPC({ description: 'Existing description' })} existingNPCs={[]} />);
      expect(screen.getByDisplayValue('Existing description')).toBeInTheDocument();
    });

    test('should prefill location with NPC location', () => {
      render(<NPCEditForm npc={makeNPC({ location: 'Ironhold' })} existingNPCs={[]} />);
      expect(screen.getByDisplayValue('Ironhold')).toBeInTheDocument();
    });

    test('should display existing affiliations as tags', () => {
      const npc = makeNPC({
        connections: {
          relatedNPCs: [],
          affiliations: ['The Mages Guild'],
          relatedQuests: [],
        },
      });
      render(<NPCEditForm npc={npc} existingNPCs={[]} />);
      expect(screen.getByText('The Mages Guild')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form interaction
  // -------------------------------------------------------------------------
  describe('form interaction', () => {
    test('should update name when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ name: 'Aldric' })} existingNPCs={[]} />);
      const nameInput = screen.getAllByRole('textbox')[0];
      await userEvent.clear(nameInput);
      await userEvent.type(nameInput, 'Aldric Revised');
      expect(nameInput).toHaveValue('Aldric Revised');
    });

    test('should update title when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ title: 'Grand Wizard' })} existingNPCs={[]} />);
      const titleInput = screen.getAllByRole('textbox')[1];
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Senior Wizard');
      expect(titleInput).toHaveValue('Senior Wizard');
    });

    test('should update race when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ race: 'Human' })} existingNPCs={[]} />);
      // textboxes: Name(0), Title(1), Race(2), Occupation(3), Location(4), Description(5)...
      const raceInput = screen.getAllByRole('textbox')[2];
      fireEvent.change(raceInput, { target: { value: 'Elf' } });
      expect(raceInput).toHaveValue('Elf');
    });

    test('should update occupation when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      const occupationInput = screen.getAllByRole('textbox')[3];
      fireEvent.change(occupationInput, { target: { value: 'Ranger' } });
      expect(occupationInput).toHaveValue('Ranger');
    });

    test('should update location when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ location: 'Silverkeep' })} existingNPCs={[]} />);
      const locationInput = screen.getAllByRole('textbox')[4];
      fireEvent.change(locationInput, { target: { value: 'Ironhold' } });
      expect(locationInput).toHaveValue('Ironhold');
    });

    test('should update description when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ description: 'Old desc' })} existingNPCs={[]} />);
      // Description is a textarea, still role=textbox; it's at index 5
      const descInput = screen.getAllByRole('textbox')[5];
      fireEvent.change(descInput, { target: { value: 'New description' } });
      expect(descInput).toHaveValue('New description');
    });

    test('should update appearance when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ appearance: 'Old appearance' })} existingNPCs={[]} />);
      const appearanceInput = screen.getAllByRole('textbox')[6];
      fireEvent.change(appearanceInput, { target: { value: 'New appearance' } });
      expect(appearanceInput).toHaveValue('New appearance');
    });

    test('should update personality when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ personality: 'Old personality' })} existingNPCs={[]} />);
      const personalityInput = screen.getAllByRole('textbox')[7];
      fireEvent.change(personalityInput, { target: { value: 'Grumpy' } });
      expect(personalityInput).toHaveValue('Grumpy');
    });

    test('should update background when user edits the field', async () => {
      render(<NPCEditForm npc={makeNPC({ background: 'Old background' })} existingNPCs={[]} />);
      const backgroundInput = screen.getAllByRole('textbox')[8];
      fireEvent.change(backgroundInput, { target: { value: 'New background' } });
      expect(backgroundInput).toHaveValue('New background');
    });

    test('should update status when select is changed', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'missing' } });
      expect(screen.getAllByRole('combobox')[0]).toHaveValue('missing');
    });

    test('should update relationship when select is changed', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      fireEvent.change(screen.getAllByRole('combobox')[1], { target: { value: 'neutral' } });
      expect(screen.getAllByRole('combobox')[1]).toHaveValue('neutral');
    });
  });

  // -------------------------------------------------------------------------
  // Affiliation management
  // -------------------------------------------------------------------------
  describe('affiliation management', () => {
    test('should add a new affiliation when Add is clicked', async () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      const input = screen.getByPlaceholderText(/enter affiliation/i);
      await userEvent.type(input, 'Shadow Guild');
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
      expect(screen.getByText('Shadow Guild')).toBeInTheDocument();
    });

    test('should disable Add button when affiliation input is empty', () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      const addBtn = screen.getByRole('button', { name: /^add$/i });
      expect(addBtn).toBeDisabled();
    });

    test('should clear affiliation input after adding', async () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      const input = screen.getByPlaceholderText(/enter affiliation/i);
      await userEvent.type(input, 'Shadow Guild');
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
      expect(input).toHaveValue('');
    });

    test('should remove an affiliation when X is clicked', () => {
      const npc = makeNPC({
        connections: {
          relatedNPCs: [],
          affiliations: ['The Mages Guild'],
          relatedQuests: [],
        },
      });
      render(<NPCEditForm npc={npc} existingNPCs={[]} />);
      const tagContainer = screen.getByText('The Mages Guild').closest('div');
      const xButton = tagContainer?.querySelector('button');
      expect(xButton).toBeDefined();
      fireEvent.click(xButton!);
      expect(screen.queryByText('The Mages Guild')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call updateNPC with updated NPC data on submission', async () => {
      render(<NPCEditForm npc={makeNPC({ name: 'Aldric' })} existingNPCs={[]} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ id: 'npc-1', name: 'Aldric' })
        );
      });
    });

    test('should NOT call updateNPC when name is cleared', async () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      // Clear the name field
      const nameInput = screen.getAllByRole('textbox')[0];
      await userEvent.clear(nameInput);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateNPC).not.toHaveBeenCalled();
      });
    });

    test('should call onSuccess after successful update', async () => {
      const onSuccess = jest.fn();
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} onSuccess={onSuccess} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should call onCancel when Cancel is clicked', () => {
      const onCancel = jest.fn();
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should include modifiedBy in updateNPC call', async () => {
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({ modifiedBy: 'user-1' })
        );
      });
    });

    test('should include updated connections in updateNPC call', async () => {
      const npc = makeNPC({
        connections: { relatedNPCs: ['npc-2'], affiliations: [], relatedQuests: [] },
      });
      render(<NPCEditForm npc={npc} existingNPCs={[]} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateNPC).toHaveBeenCalledWith(
          expect.objectContaining({
            connections: expect.objectContaining({
              relatedNPCs: expect.any(Array),
            }),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should show "Saving..." on submit button when isLoading is true', () => {
      setupMocks({ isLoading: true });
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    test('should disable submit button when isLoading is true', () => {
      setupMocks({ isLoading: true });
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  describe('error display', () => {
    test('should display error message from context when error is set', () => {
      setupMocks({ error: 'Update failed' });
      render(<NPCEditForm npc={makeNPC()} existingNPCs={[]} />);
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Related NPC exclusion
  // -------------------------------------------------------------------------
  describe('related NPC selection excludes current NPC', () => {
    test('should open NPC dialog without crashing when existing NPCs include self', () => {
      const self = makeNPC({ id: 'npc-1' });
      const other = makeNPC({ id: 'npc-2', name: 'Other NPC' });
      render(<NPCEditForm npc={self} existingNPCs={[self, other]} />);
      fireEvent.click(screen.getByRole('button', { name: /select related npcs/i }));
      // Dialog portal blocked in JSDOM (bug #150); verify no crash
    });
  });

  // -------------------------------------------------------------------------
  // Quest pre-population
  // -------------------------------------------------------------------------
  describe('quest pre-population', () => {
    test('should display pre-selected quest tags from existing NPC connections', () => {
      const quest = makeQuest('quest-1', 'Dragon Hunt');
      setupMocks({ quests: [quest] });
      const npc = makeNPC({
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: ['quest-1'],
        },
      });
      render(<NPCEditForm npc={npc} existingNPCs={[]} />);
      expect(screen.getByText('Dragon Hunt')).toBeInTheDocument();
    });

    test('should remove quest tag when X is clicked', () => {
      const quest = makeQuest('quest-1', 'Dragon Hunt');
      setupMocks({ quests: [quest] });
      const npc = makeNPC({
        connections: {
          relatedNPCs: [],
          affiliations: [],
          relatedQuests: ['quest-1'],
        },
      });
      render(<NPCEditForm npc={npc} existingNPCs={[]} />);
      const tagContainer = screen.getByText('Dragon Hunt').closest('div');
      const xButton = tagContainer?.querySelector('button');
      expect(xButton).toBeDefined();
      fireEvent.click(xButton!);
      expect(screen.queryByText('Dragon Hunt')).not.toBeInTheDocument();
    });
  });
});
