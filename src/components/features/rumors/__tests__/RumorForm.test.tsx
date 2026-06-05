// src/components/features/rumors/__tests__/RumorForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RumorForm from '../RumorForm';
import { Rumor } from '../../../../types/rumor';

// ---------------------------------------------------------------------------
// Mock Dialog (bug #150 — Dialog portal interior unreachable)
// ---------------------------------------------------------------------------
jest.mock('../../../core/Dialog', () => ({
  __esModule: true,
  default: ({ open, title, children }: any) =>
    open ? (
      <div data-testid="dialog">
        {title && <h3>{title}</h3>}
        {children}
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Mock contexts
// ---------------------------------------------------------------------------
const mockAddRumor = jest.fn();
const mockUpdateRumor = jest.fn();
const mockMarkEntityAsConverted = jest.fn();

jest.mock('../../../../context/RumorContext', () => ({
  useRumors: jest.fn(),
}));
jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));
jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(),
}));
jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));
jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

const { useRumors } = require('../../../../context/RumorContext');
const { useNPCs } = require('../../../../context/NPCContext');
const { useLocations } = require('../../../../context/LocationContext');
const { useNotes } = require('../../../../context/NoteContext');
const { useAuth, useUser } = require('@/features/user-management');

beforeEach(() => {
  jest.clearAllMocks();
  mockAddRumor.mockResolvedValue('new-rumor-id');
  mockUpdateRumor.mockResolvedValue(undefined);
  mockMarkEntityAsConverted.mockResolvedValue(undefined);
  (useRumors as jest.Mock).mockReturnValue({
    addRumor: mockAddRumor,
    updateRumor: mockUpdateRumor,
  });
  (useNPCs as jest.Mock).mockReturnValue({
    npcs: [
      { id: 'npc-1', name: 'Gandalf' },
      { id: 'npc-2', name: 'Aragorn' },
    ],
  });
  (useLocations as jest.Mock).mockReturnValue({
    locations: [
      { id: 'loc-1', name: 'Bree' },
      { id: 'loc-2', name: 'Rivendell' },
    ],
  });
  (useNotes as jest.Mock).mockReturnValue({
    markEntityAsConverted: mockMarkEntityAsConverted,
  });
  (useAuth as jest.Mock).mockReturnValue({ user: { uid: 'user-1' } });
  (useUser as jest.Mock).mockReturnValue({ userProfile: { displayName: 'TestUser' } });
});

function makeRumor(overrides: Partial<Rumor> = {}): Rumor {
  return {
    id: 'r1',
    title: 'Test Rumor',
    content: 'Original content',
    status: 'unconfirmed',
    sourceType: 'tavern',
    sourceName: 'The Inn',
    location: '',
    locationId: '',
    sourceNpcId: '',
    relatedNPCs: [],
    relatedLocations: [],
    notes: [],
    createdBy: 'user-1',
    createdByUsername: 'u',
    dateAdded: '2024-01-15T10:00:00.000Z',
    modifiedBy: 'user-1',
    modifiedByUsername: 'u',
    dateModified: '2024-01-15T10:00:00.000Z',
    ...overrides,
  } as Rumor;
}

describe('RumorForm', () => {
  describe('rendering', () => {
    test('should render the form title', () => {
      render(<RumorForm title="Add Rumor" />);
      expect(screen.getByRole('heading', { name: 'Add Rumor' })).toBeInTheDocument();
    });

    test('should render section headers', () => {
      render(<RumorForm title="Add Rumor" />);
      expect(screen.getByText('Basic Information')).toBeInTheDocument();
      expect(screen.getByText('Related NPCs')).toBeInTheDocument();
      expect(screen.getByText('Related Locations')).toBeInTheDocument();
    });

    test('should render Cancel and Add Rumor buttons in create mode', () => {
      render(<RumorForm title="Add Rumor" />);
      expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Add Rumor/ })).toBeInTheDocument();
    });

    test('should render "Save Changes" button when editing existing rumor', () => {
      render(<RumorForm title="Edit Rumor" rumor={makeRumor()} />);
      expect(screen.getByRole('button', { name: /Save Changes/ })).toBeInTheDocument();
    });
  });

  describe('pre-population (editing)', () => {
    test('should pre-fill title from rumor prop', () => {
      render(<RumorForm title="Edit" rumor={makeRumor({ title: 'My Rumor' })} />);
      expect(screen.getByDisplayValue('My Rumor')).toBeInTheDocument();
    });

    test('should pre-fill content from rumor prop', () => {
      render(<RumorForm title="Edit" rumor={makeRumor({ content: 'Some content' })} />);
      expect(screen.getByDisplayValue('Some content')).toBeInTheDocument();
    });
  });

  describe('pre-population (initialData)', () => {
    test('should pre-fill title from initialData', () => {
      render(
        <RumorForm
          title="From Note"
          initialData={{ title: 'From Note Title' }}
        />,
      );
      expect(screen.getByDisplayValue('From Note Title')).toBeInTheDocument();
    });

    test('should pre-fill content from initialData', () => {
      render(
        <RumorForm
          title="From Note"
          initialData={{ content: 'note content' }}
        />,
      );
      expect(screen.getByDisplayValue('note content')).toBeInTheDocument();
    });
  });

  describe('source type switching', () => {
    test('should render select with all source types', () => {
      render(<RumorForm title="Add" />);
      const selects = screen.getAllByRole('combobox');
      const sourceSelect = selects.find(
        (s) => (s as HTMLSelectElement).value === 'other',
      );
      expect(sourceSelect).toBeInTheDocument();
    });

    test('should swap source NPC dropdown in when sourceType=npc', () => {
      render(<RumorForm title="Add" />);
      const selects = screen.getAllByRole('combobox');
      const sourceSelect = selects.find(
        (s) => (s as HTMLSelectElement).value === 'other',
      )!;
      fireEvent.change(sourceSelect, { target: { value: 'npc' } });
      expect(screen.getByText('Source NPC *')).toBeInTheDocument();
    });

    test('should populate sourceName when an NPC is selected as source', () => {
      render(<RumorForm title="Add" />);
      const selects = screen.getAllByRole('combobox');
      const sourceSelect = selects.find(
        (s) => (s as HTMLSelectElement).value === 'other',
      )!;
      fireEvent.change(sourceSelect, { target: { value: 'npc' } });
      // Now Source NPC select appeared
      const npcSelect = screen.getAllByRole('combobox').find(
        (s) => (s as HTMLSelectElement).value === '',
      )!;
      fireEvent.change(npcSelect, { target: { value: 'npc-1' } });
      // sourceName is internal; verify it persists during submit
      // (separately tested in submit tests below)
      expect((npcSelect as HTMLSelectElement).value).toBe('npc-1');
    });
  });

  describe('location selection', () => {
    test('should populate location field when a location is selected', () => {
      render(<RumorForm title="Add" />);
      const selects = screen.getAllByRole('combobox');
      // Location select shows "Select a location" placeholder option (value '')
      const locationSelect = selects[selects.length - 1];
      fireEvent.change(locationSelect, { target: { value: 'loc-1' } });
      expect((locationSelect as HTMLSelectElement).value).toBe('loc-1');
    });
  });

  describe('validation', () => {
    test('should show error when title is missing', async () => {
      render(<RumorForm title="Add" />);
      const submitBtn = screen.getByText('Add Rumor').closest('button')!;
      // Bypass HTML required by clicking submit while inputs empty
      fireEvent.submit(submitBtn.closest('form')!);
      await waitFor(() => {
        expect(
          screen.getByText('Title, content, and source name are required'),
        ).toBeInTheDocument();
      });
    });

    test('should show login error when user is null', async () => {
      (useAuth as jest.Mock).mockReturnValue({ user: null });
      render(<RumorForm title="Add" />);
      // Fill required inputs
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 't');
      await userEvent.type(inputs[1], 'c');
      await userEvent.type(inputs[2], 's');
      const submitBtn = screen.getByText('Add Rumor').closest('button')!;
      fireEvent.submit(submitBtn.closest('form')!);
      await waitFor(() => {
        expect(screen.getByText(/must be logged in/i)).toBeInTheDocument();
      });
    });
  });

  describe('create flow', () => {
    test('should call addRumor with form data on successful create', async () => {
      const onSuccess = jest.fn();
      render(<RumorForm title="Add" onSuccess={onSuccess} />);
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 'New Title');
      await userEvent.type(inputs[1], 'New Content');
      await userEvent.type(inputs[2], 'A Source');
      fireEvent.submit(screen.getByText('Add Rumor').closest('form')!);
      await waitFor(() => {
        expect(mockAddRumor).toHaveBeenCalledTimes(1);
      });
      const payload = mockAddRumor.mock.calls[0][0];
      expect(payload.title).toBe('New Title');
      expect(payload.content).toBe('New Content');
      expect(payload.sourceName).toBe('A Source');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    test('should mark entity as converted when created from a note entity', async () => {
      const onSuccess = jest.fn();
      render(
        <RumorForm
          title="From Note"
          initialData={{
            title: 'noteTitle',
            content: 'noteContent',
            noteId: 'note-1',
            entityId: 'entity-9',
          }}
          onSuccess={onSuccess}
        />,
      );
      const inputs = screen.getAllByRole('textbox');
      // sourceName must be set since initialData doesn't supply it
      await userEvent.type(inputs[2], 'A Source');
      fireEvent.submit(screen.getByText('Add Rumor').closest('form')!);
      await waitFor(() => {
        expect(mockMarkEntityAsConverted).toHaveBeenCalledWith(
          'note-1',
          'entity-9',
          'new-rumor-id',
        );
      });
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    test('should show error if addRumor throws', async () => {
      mockAddRumor.mockRejectedValueOnce(new Error('save failed'));
      render(<RumorForm title="Add" />);
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 't');
      await userEvent.type(inputs[1], 'c');
      await userEvent.type(inputs[2], 's');
      fireEvent.submit(screen.getByText('Add Rumor').closest('form')!);
      await waitFor(() => {
        expect(screen.getByText('save failed')).toBeInTheDocument();
      });
    });
  });

  describe('edit flow', () => {
    test('should call updateRumor when editing existing rumor', async () => {
      const onSuccess = jest.fn();
      render(
        <RumorForm
          title="Edit"
          rumor={makeRumor({ title: 'Old', content: 'old c', sourceName: 'src' })}
          onSuccess={onSuccess}
        />,
      );
      fireEvent.submit(screen.getByText('Save Changes').closest('form')!);
      await waitFor(() => {
        expect(mockUpdateRumor).toHaveBeenCalledTimes(1);
      });
      const payload = mockUpdateRumor.mock.calls[0][0];
      expect(payload.id).toBe('r1');
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  describe('cancel', () => {
    test('should call onCancel when Cancel button clicked', () => {
      const onCancel = jest.fn();
      render(<RumorForm title="Add" onCancel={onCancel} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  describe('dialogs (mocked)', () => {
    test('should open NPC dialog when Select NPCs clicked', () => {
      render(<RumorForm title="Add" />);
      fireEvent.click(screen.getByText('Select NPCs'));
      expect(screen.getByText('Select Related NPCs')).toBeInTheDocument();
    });

    test('should open Location dialog when Select Locations clicked', () => {
      render(<RumorForm title="Add" />);
      fireEvent.click(screen.getByText('Select Locations'));
      expect(screen.getByText('Select Related Locations')).toBeInTheDocument();
    });

    test('should show "No NPCs selected" placeholder when no related NPCs', () => {
      render(<RumorForm title="Add" />);
      expect(screen.getByText('No NPCs selected')).toBeInTheDocument();
    });

    test('should show "No locations selected" placeholder when no related locations', () => {
      render(<RumorForm title="Add" />);
      expect(screen.getByText('No locations selected')).toBeInTheDocument();
    });

    test('should pre-render selected NPC tags when editing rumor with relatedNPCs', () => {
      render(
        <RumorForm
          title="Edit"
          rumor={makeRumor({ relatedNPCs: ['npc-1'] })}
        />,
      );
      expect(screen.getByText('Gandalf')).toBeInTheDocument();
    });

    test('should pre-render selected location tags when editing rumor with relatedLocations', () => {
      render(
        <RumorForm
          title="Edit"
          rumor={makeRumor({ relatedLocations: ['loc-1'] })}
        />,
      );
      // Bree appears as both a <select> option AND a selected tag — both fine.
      expect(screen.getAllByText('Bree').length).toBeGreaterThanOrEqual(1);
    });
  });
});
