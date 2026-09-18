// src/components/features/quests/__tests__/QuestEditForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestEditForm from '../QuestEditForm';
import { Quest, QuestObjective } from '../../types';
import { unnamedControlsIn } from "../../../../../test-utils/accessible-names";
import { formAccentsIn } from "../../../../../test-utils/accent-budget";

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockUpdateQuest = jest.fn();

jest.mock('../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: jest.fn(() => ({ locations: [] })),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useQuests } = require('../../context/QuestContext');
const { useNPCs } = require('../../../npcs/context/NPCContext');
const { useLocations } = require('../../../locations/context/LocationContext');

function setupMocks({
  updateQuest = mockUpdateQuest,
  isLoading = false,
  error = null as string | null,
  npcs = [] as any[],
}: {
  updateQuest?: jest.Mock;
  isLoading?: boolean;
  error?: string | null;
  npcs?: any[];
} = {}) {
  (useQuests as jest.Mock).mockReturnValue({ updateQuest, isLoading, error });
  (useNPCs as jest.Mock).mockReturnValue({ npcs });
}

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeObjective(id: string, description: string, completed = false): QuestObjective {
  return { id, description, completed };
}

function makeQuest(overrides: Partial<Quest> = {}): Quest {
  return {
    id: 'quest-1',
    title: 'The Dark Rift',
    description: 'Investigate a mysterious rift',
    status: 'active',
    objectives: [makeObjective('obj-1', 'Find the rift', false)],
    leads: [],
    keyLocations: [],
    complications: [],
    rewards: [],
    relatedNPCIds: [],
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuestEditForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateQuest.mockResolvedValue(undefined);
    setupMocks();
  });

  // -------------------------------------------------------------------------
  // Rendering with pre-filled data
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render with quest title prefilled', () => {
      render(<QuestEditForm quest={makeQuest({ title: 'The Dark Rift' })} />);
      expect(screen.getByDisplayValue('The Dark Rift')).toBeInTheDocument();
    });

    test('should render with quest description prefilled', () => {
      render(<QuestEditForm quest={makeQuest({ description: 'A mysterious quest' })} />);
      expect(screen.getByDisplayValue('A mysterious quest')).toBeInTheDocument();
    });

    test('should render with quest status prefilled', () => {
      render(<QuestEditForm quest={makeQuest({ status: 'completed' })} />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'completed');
      expect(statusSelect).toBeDefined();
    });

    test('should render Save Changes button', () => {
      render(<QuestEditForm quest={makeQuest()} />);
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    });

    test('should render Cancel button', () => {
      render(<QuestEditForm quest={makeQuest()} />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render existing objectives', () => {
      render(
        <QuestEditForm
          quest={makeQuest({
            objectives: [makeObjective('obj-1', 'Existing objective', false)],
          })}
        />
      );
      expect(screen.getByDisplayValue('Existing objective')).toBeInTheDocument();
    });

    test('should render existing leads', () => {
      render(<QuestEditForm quest={makeQuest({ leads: ['Ask the innkeeper'] })} />);
      expect(screen.getByDisplayValue('Ask the innkeeper')).toBeInTheDocument();
    });

    test('should render existing rewards', () => {
      render(<QuestEditForm quest={makeQuest({ rewards: ['500 gold'] })} />);
      expect(screen.getByDisplayValue('500 gold')).toBeInTheDocument();
    });

    test('should render existing complications', () => {
      render(<QuestEditForm quest={makeQuest({ complications: ['Floods on the road'] })} />);
      expect(screen.getByDisplayValue('Floods on the road')).toBeInTheDocument();
    });

    test('should render all section headings', () => {
      render(<QuestEditForm quest={makeQuest()} />);
      expect(screen.getByText('Objectives')).toBeInTheDocument();
      expect(screen.getByText('Initial Leads')).toBeInTheDocument();
      expect(screen.getByText('Key Locations')).toBeInTheDocument();
      expect(screen.getByText('Possible Complications')).toBeInTheDocument();
      expect(screen.getByText('Rewards')).toBeInTheDocument();
      expect(screen.getByText('Related NPCs')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form interaction
  // -------------------------------------------------------------------------
  describe('form interaction', () => {
    test('should update title field when user types', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      const titleInput = screen.getByDisplayValue('The Dark Rift');
      await userEvent.clear(titleInput);
      await userEvent.type(titleInput, 'Updated Title');
      expect(titleInput).toHaveValue('Updated Title');
    });

    test('should update Status select when changed', () => {
      render(<QuestEditForm quest={makeQuest({ status: 'active' })} />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'active') as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'failed' } });
      expect(statusSelect).toHaveValue('failed');
    });
  });

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call updateQuest with correct data on valid submission', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'quest-1',
            title: 'The Dark Rift',
            description: 'Investigate a mysterious rift',
          })
        );
      });
    });

    test('should NOT call updateQuest when title is cleared', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      const titleInput = screen.getByDisplayValue('The Dark Rift');
      await userEvent.clear(titleInput);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateQuest).not.toHaveBeenCalled();
      });
    });

    test('should show validation error when title is missing', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      const titleInput = screen.getByDisplayValue('The Dark Rift');
      await userEvent.clear(titleInput);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/title and description are required/i)).toBeInTheDocument();
      });
    });

    test('should call onSuccess after successful submission', async () => {
      const onSuccess = jest.fn();
      render(<QuestEditForm quest={makeQuest()} onSuccess={onSuccess} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should call onCancel when Cancel is clicked', () => {
      const onCancel = jest.fn();
      render(<QuestEditForm quest={makeQuest()} onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should show error message when updateQuest throws', async () => {
      mockUpdateQuest.mockRejectedValue(new Error('Save failed'));
      render(<QuestEditForm quest={makeQuest()} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Save failed')).toBeInTheDocument();
      });
    });

    test('should show "Saving..." while submitting', async () => {
      mockUpdateQuest.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 100))
      );
      render(<QuestEditForm quest={makeQuest()} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });
    });

    test('should include relatedNPCIds in submitted data', async () => {
      render(<QuestEditForm quest={makeQuest({ relatedNPCIds: ['npc-1', 'npc-2'] })} />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockUpdateQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            relatedNPCIds: expect.arrayContaining(['npc-1', 'npc-2']),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // locationId capture (LocationCombobox wiring)
  // -------------------------------------------------------------------------
  describe('locationId capture (attach tray wiring)', () => {
    // Since `15-2` a quest's location is picked from the browse-first tray,
    // not typed into a combobox. A location that does not exist can no longer
    // be entered as free text: an invalid choice is unofferable rather than
    // silently stored.
    beforeEach(() => {
      (useLocations as jest.Mock).mockReturnValue({
        locations: [
          { id: 'loc-1', name: 'Ironhold', type: 'city', dateAdded: '2026-02-01T00:00:00.000Z' },
          { id: 'loc-2', name: 'Shadowfen', type: 'region', dateAdded: '2026-01-01T00:00:00.000Z' },
        ],
      });
    });

    afterEach(() => {
      (useLocations as jest.Mock).mockReturnValue({ locations: [] });
    });

    test('writes both locationId and the readable name when a location is attached', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Where it happens' }));
      await userEvent.click(screen.getByRole('option', { name: /Ironhold/ }));
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockUpdateQuest).toHaveBeenCalledWith(
          expect.objectContaining({ location: 'Ironhold', locationId: 'loc-1' })
        );
      });
    });

    test('offers only real locations, so a typo cannot become a reference', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Where it happens' }));
      // Scoped to the tray: this form also renders a native <select> for
      // status, whose <option> elements carry the same ARIA role.
      const tray = within(screen.getByRole('listbox', { name: 'Where it happens' }));
      expect(tray.getAllByRole('option')).toHaveLength(2);
    });

    test('clears both fields when the location is detached', async () => {
      render(<QuestEditForm quest={makeQuest()} />);
      
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Where it happens' }));
      await userEvent.click(screen.getByRole('option', { name: /Ironhold/ }));
      await userEvent.click(screen.getByRole('button', { name: 'Detach Ironhold' }));
      fireEvent.submit(document.querySelector('form')!);

      await waitFor(() => {
        expect(mockUpdateQuest).toHaveBeenCalledWith(
          expect.objectContaining({ location: '', locationId: '' })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should show "Saving..." when isLoading is true from context', () => {
      setupMocks({ isLoading: true });
      render(<QuestEditForm quest={makeQuest()} />);
      expect(screen.getByText('Saving...')).toBeInTheDocument();
    });

    test('should disable submit button when isLoading is true', () => {
      setupMocks({ isLoading: true });
      render(<QuestEditForm quest={makeQuest()} />);
      expect(screen.getByRole('button', { name: /saving\.\.\./i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Context error display
  // -------------------------------------------------------------------------
  describe('context error', () => {
    test('should display context error when set', () => {
      setupMocks({ error: 'Context error occurred' });
      render(<QuestEditForm quest={makeQuest()} />);
      expect(screen.getByText('Context error occurred')).toBeInTheDocument();
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
      const { container } = render(<QuestEditForm quest={makeQuest()} />);
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
      const { container } = render(<QuestEditForm quest={makeQuest()} />);
      expect(formAccentsIn(container)).toHaveLength(1);
    });
  });

});
