// src/features/campaign-entities/rumors/components/__tests__/RumorForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RumorForm from '../RumorForm';
import { Rumor } from '../../types';
import { unnamedControlsIn } from "../../../../../test-utils/accessible-names";
import { formAccentsIn } from "../../../../../test-utils/accent-budget";

// ---------------------------------------------------------------------------
// Mock Dialog (bug #150 — Dialog portal interior unreachable)
// ---------------------------------------------------------------------------
jest.mock('../../../../../core/components/Dialog', () => ({
  __esModule: true,
  default: ({ open, title, children }: any) =>
    open ? (
      <div data-testid="dialog" role="dialog">
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

jest.mock('../../context/RumorContext', () => ({
  useRumors: jest.fn(),
}));
jest.mock('../../../npcs/context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));
jest.mock('../../../locations/context/LocationContext', () => ({
  useLocations: jest.fn(),
}));
jest.mock('features/collaboration', () => ({
  useNotes: jest.fn(),
}));
jest.mock('@/features/user-management', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
}));

const { useRumors } = require('../../context/RumorContext');
const { useNPCs } = require('../../../npcs/context/NPCContext');
const { useLocations } = require('../../../locations/context/LocationContext');
const { useNotes } = require('features/collaboration');
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

    test('should populate sourceName when an NPC is attached as source', async () => {
      // Since `15-2` the source NPC is picked from the tray, not from a
      // dropdown of bare names.
      render(<RumorForm title="Add" />);
      const selects = screen.getAllByRole('combobox');
      const sourceSelect = selects.find(
        (s) => (s as HTMLSelectElement).value === 'other',
      )!;
      fireEvent.change(sourceSelect, { target: { value: 'npc' } });

      await userEvent.click(screen.getByRole('button', { name: 'Attach to Source NPC' }));
      await userEvent.click(screen.getByRole('option', { name: /Gandalf/ }));

      expect(screen.getByRole('button', { name: 'Detach Gandalf' })).toBeInTheDocument();
    });
  });

  describe('location selection', () => {
    test('should show the attached location by name', async () => {
      render(<RumorForm title="Add" />);
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Location' }));
      await userEvent.click(screen.getByRole('option', { name: /Bree/ }));
      expect(screen.getByRole('button', { name: 'Detach Bree' })).toBeInTheDocument();
    });

    // Covers the write-side contract: selecting a real Location writes both
    // `locationId` and `location` (the name) into the submitted payload.
    test('should write both locationId and location when submitting after selecting a real location', async () => {
      render(<RumorForm title="Add" />);
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 'T');
      await userEvent.type(inputs[1], 'C');
      await userEvent.type(inputs[2], 'S');
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Location' }));
      await userEvent.click(screen.getByRole('option', { name: /Bree/ }));
      fireEvent.submit(screen.getByText('Add Rumor').closest('form')!);

      await waitFor(() => {
        expect(mockAddRumor).toHaveBeenCalledTimes(1);
      });
      const payload = mockAddRumor.mock.calls[0][0];
      expect(payload.locationId).toBe('loc-1');
      expect(payload.location).toBe('Bree');
    });

    // Regression test for the bug this pass fixed: handleLocationSelect('') used to find no
    // matching Location and silently no-op, leaving a stale locationId/location pair from a
    // prior real selection in place. Switching back to the blank "Select a location" option
    // must clear both fields, not leave a lie behind.
    test('should clear locationId and location when switching back to the blank placeholder (regression)', async () => {
      render(<RumorForm title="Add" />);
      const inputs = screen.getAllByRole('textbox');
      await userEvent.type(inputs[0], 'T');
      await userEvent.type(inputs[1], 'C');
      await userEvent.type(inputs[2], 'S');
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Location' }));
      await userEvent.click(screen.getByRole('option', { name: /Bree/ }));
      // Then detach it again: both fields must clear, not keep a stale pair.
      await userEvent.click(screen.getByRole('button', { name: 'Detach Bree' }));
      fireEvent.submit(screen.getByText('Add Rumor').closest('form')!);

      await waitFor(() => {
        expect(mockAddRumor).toHaveBeenCalledTimes(1);
      });
      const payload = mockAddRumor.mock.calls[0][0];
      expect(payload.locationId).toBe('');
      expect(payload.location).toBe('');
    });

    // An un-migrated rumor (free-text `location`, no `locationId`) must load and submit
    // without the form inventing an id for it.
    test('should load and submit an un-migrated rumor (location set, no locationId) without inventing an id', async () => {
      const rumor = makeRumor({ location: 'Bree', title: 'Old', content: 'old c', sourceName: 'src' });
      delete (rumor as any).locationId;
      render(<RumorForm title="Edit" rumor={rumor} />);
      fireEvent.submit(screen.getByText('Save Changes').closest('form')!);

      await waitFor(() => {
        expect(mockUpdateRumor).toHaveBeenCalledTimes(1);
      });
      const payload = mockUpdateRumor.mock.calls[0][0];
      expect(payload.location).toBe('Bree');
      expect(payload.locationId).toBeUndefined();
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
    test('opens the related-NPC tray in place, not in a dialog', async () => {
      render(<RumorForm title="Add" />);
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Related NPCs' }));

      expect(screen.getByRole('listbox', { name: 'Related NPCs' })).toBeInTheDocument();
      // §5 / Phase 14 §1: the tray is part of the form, never an overlay over it.
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('opens the related-location tray in place', async () => {
      render(<RumorForm title="Add" />);
      await userEvent.click(screen.getByRole('button', { name: 'Attach to Related Locations' }));

      expect(screen.getByRole('listbox', { name: 'Related Locations' })).toBeInTheDocument();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    test('retires the flat list of every location in the campaign', () => {
      render(<RumorForm title="Add" />);
      expect(screen.queryByText('Select a location')).toBeNull();
      expect(screen.queryByText('Select Locations')).toBeNull();
      expect(screen.queryByText('Select NPCs')).toBeNull();
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
      const { container } = render(<RumorForm title="Add Rumor" />);
      expect(unnamedControlsIn(container)).toEqual([]);
    });
  });


  // -------------------------------------------------------------------------
  // The accent budget, with chips selected (PR 8.2)
  //
  // 8.2's gate: "a form with several selections has exactly one accent, and it
  // is the primary action." This is why a selected chip is accent-*bordered*
  // rather than accent-filled -- six filled chips would put six accents on the
  // form and leave the control that actually writes competing with them.
  // -------------------------------------------------------------------------
  describe("accent budget", () => {
    test("keeps exactly one filled accent no matter how many relations are attached", async () => {
      const user = userEvent.setup();
      const { container } = render(<RumorForm title="Add Rumor" />);

      await user.click(screen.getByRole("button", { name: "Attach to Related NPCs" }));
      // Attach whatever is still unattached, re-querying each time: clicking a
      // row that is already attached would detach it again.
      // Scoped to the tray: this form also renders native <select>s whose
      // <option> children carry the same ARIA role and never become selected,
      // so an unscoped query would loop forever.
      const tray = () => within(screen.getByRole("listbox", { name: "Related NPCs" }));
      const total = tray().getAllByRole("option").length;
      expect(total).toBeGreaterThan(0);

      const unattached = () =>
        tray()
          .getAllByRole("option")
          .filter((option) => option.getAttribute("aria-selected") !== "true");

      let next = unattached();
      while (next.length > 0) {
        await user.click(next[0]);
        next = unattached();
      }

      // Every attached row is marked, and none of them is filled: the one
      // filled accent on the form belongs to the control that writes.
      const attached = tray()
        .getAllByRole("option")
        .filter((option) => option.getAttribute("aria-selected") === "true");
      expect(attached).toHaveLength(total);
      attached.forEach((option) => {
        expect(option).not.toHaveClass("button-primary");
      });
      expect(formAccentsIn(container)).toHaveLength(1);
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
      const { container } = render(<RumorForm title="Add Rumor" />);
      expect(formAccentsIn(container)).toHaveLength(1);
    });
  });

});
