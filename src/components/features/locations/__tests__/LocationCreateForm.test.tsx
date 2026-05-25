// src/components/features/locations/__tests__/LocationCreateForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LocationCreateForm from '../LocationCreateForm';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockCreateLocation = jest.fn();
const mockGetLocationById = jest.fn();
const mockMarkEntityAsConverted = jest.fn();

jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(),
}));

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('../../../../context/firebase', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  useGroups: jest.fn(),
  useCampaigns: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useLocations } = require('../../../../context/LocationContext');
const { useNotes } = require('../../../../context/NoteContext');
const { useNPCs } = require('../../../../context/NPCContext');
const { useQuests } = require('../../../../context/QuestContext');
const { useAuth, useGroups, useCampaigns } = require('../../../../context/firebase');

function setupMocks({
  createLocation = mockCreateLocation,
  getLocationById = mockGetLocationById,
  user = { uid: 'user-1' },
  activeGroupId = 'group-1',
  activeCampaignId = 'campaign-1',
  npcs = [] as any[],
  quests = [] as any[],
  markEntityAsConverted = mockMarkEntityAsConverted,
}: {
  createLocation?: jest.Mock;
  getLocationById?: jest.Mock;
  user?: { uid: string } | null;
  activeGroupId?: string | null;
  activeCampaignId?: string | null;
  npcs?: any[];
  quests?: any[];
  markEntityAsConverted?: jest.Mock;
} = {}) {
  (useAuth as jest.Mock).mockReturnValue({ user });
  (useGroups as jest.Mock).mockReturnValue({ activeGroupId });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId });
  (useLocations as jest.Mock).mockReturnValue({
    createLocation,
    getLocationById,
    locations: [],
  });
  (useNotes as jest.Mock).mockReturnValue({ markEntityAsConverted });
  (useNPCs as jest.Mock).mockReturnValue({ npcs });
  (useQuests as jest.Mock).mockReturnValue({ quests });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LocationCreateForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateLocation.mockResolvedValue('new-location-id');
    mockGetLocationById.mockReturnValue(undefined);
    mockMarkEntityAsConverted.mockResolvedValue(undefined);
    setupMocks();
  });

  // NOTE: The Input component (src/components/core/Input.tsx) renders labels without
  // htmlFor/id association — getByLabelText() will not work. Bug #251.
  // Use getByText() for labels and getAllByRole('textbox') for inputs.

  // -------------------------------------------------------------------------
  // No required context
  // -------------------------------------------------------------------------
  describe('missing context', () => {
    test('should show "No Active Group or Campaign" when group/campaign missing', () => {
      setupMocks({ activeGroupId: null, activeCampaignId: null });
      render(<LocationCreateForm />);
      expect(screen.getByText('No Active Group or Campaign')).toBeInTheDocument();
    });

    test('should show Go Back button when context is missing', () => {
      setupMocks({ activeGroupId: null, activeCampaignId: null });
      render(<LocationCreateForm />);
      expect(screen.getByRole('button', { name: /go back/i })).toBeInTheDocument();
    });

    test('should call onCancel when Go Back is clicked in missing context state', () => {
      setupMocks({ activeGroupId: null, activeCampaignId: null });
      const onCancel = jest.fn();
      render(<LocationCreateForm onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /go back/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Name label', () => {
      render(<LocationCreateForm />);
      expect(screen.getByText('Name *')).toBeInTheDocument();
    });

    test('should render Description label', () => {
      render(<LocationCreateForm />);
      expect(screen.getByText('Description *')).toBeInTheDocument();
    });

    test('should render Type select', () => {
      render(<LocationCreateForm />);
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    test('should render Status select with default "known"', () => {
      render(<LocationCreateForm />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'known');
      expect(statusSelect).toBeDefined();
    });

    test('should render Type select with default "poi"', () => {
      render(<LocationCreateForm />);
      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'poi');
      expect(typeSelect).toBeDefined();
    });

    test('should render Create Location submit button', () => {
      render(<LocationCreateForm />);
      expect(screen.getByRole('button', { name: /create location/i })).toBeInTheDocument();
    });

    test('should render Cancel button', () => {
      render(<LocationCreateForm />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render Tags section', () => {
      render(<LocationCreateForm />);
      expect(screen.getByText('Tags')).toBeInTheDocument();
    });

    test('should render Notable Features section', () => {
      render(<LocationCreateForm />);
      expect(screen.getByText('Notable Features')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Initial data pre-population
  // -------------------------------------------------------------------------
  describe('initialData pre-population', () => {
    test('should prefill name from initialData', () => {
      render(<LocationCreateForm initialData={{ name: 'Prefilled City' }} />);
      const textboxes = screen.getAllByRole('textbox');
      const nameInput = textboxes[0];
      expect(nameInput).toHaveValue('Prefilled City');
    });

    test('should prefill description from initialData', () => {
      render(<LocationCreateForm initialData={{ description: 'A great city' }} />);
      expect(screen.getByDisplayValue('A great city')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form interaction
  // -------------------------------------------------------------------------
  describe('form interaction', () => {
    test('should update name field when user types', async () => {
      render(<LocationCreateForm />);
      const nameInput = screen.getAllByRole('textbox')[0];
      await userEvent.type(nameInput, 'New City');
      expect(nameInput).toHaveValue('New City');
    });

    test('should update Type select when changed', () => {
      render(<LocationCreateForm />);
      const selects = screen.getAllByRole('combobox');
      const typeSelect = selects.find(s => (s as HTMLSelectElement).value === 'poi') as HTMLSelectElement;
      expect(typeSelect).toBeDefined();
      fireEvent.change(typeSelect, { target: { value: 'city' } });
      expect(typeSelect).toHaveValue('city');
    });

    test('should update Status select when changed', () => {
      render(<LocationCreateForm />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'known') as HTMLSelectElement;
      expect(statusSelect).toBeDefined();
      fireEvent.change(statusSelect, { target: { value: 'explored' } });
      expect(statusSelect).toHaveValue('explored');
    });
  });

  // -------------------------------------------------------------------------
  // Tags management
  // -------------------------------------------------------------------------
  describe('tags management', () => {
    test('should add a tag when Add is clicked', async () => {
      render(<LocationCreateForm />);
      const tagInput = screen.getByPlaceholderText('Enter tag...');
      await userEvent.type(tagInput, 'trade-hub');
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
      expect(screen.getByText('trade-hub')).toBeInTheDocument();
    });

    test('should disable Add button when tag input is empty', () => {
      render(<LocationCreateForm />);
      expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    });

    test('should clear tag input after adding', async () => {
      render(<LocationCreateForm />);
      const tagInput = screen.getByPlaceholderText('Enter tag...');
      await userEvent.type(tagInput, 'trade-hub');
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
      expect(tagInput).toHaveValue('');
    });

    test('should remove a tag when X is clicked', async () => {
      render(<LocationCreateForm />);
      const tagInput = screen.getByPlaceholderText('Enter tag...');
      await userEvent.type(tagInput, 'trade-hub');
      fireEvent.click(screen.getByRole('button', { name: /^add$/i }));
      expect(screen.getByText('trade-hub')).toBeInTheDocument();
      const tagContainer = screen.getByText('trade-hub').closest('div');
      const xButton = tagContainer?.querySelector('button');
      expect(xButton).toBeDefined();
      fireEvent.click(xButton!);
      expect(screen.queryByText('trade-hub')).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call createLocation with correct data on valid submission', async () => {
      render(<LocationCreateForm />);
      // Fill required fields
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New City' } });

      // Get description textarea
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      expect(descTextarea).toBeDefined();
      fireEvent.change(descTextarea!, { target: { value: 'A great city' } });

      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockCreateLocation).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'New City',
            description: 'A great city',
          })
        );
      });
    });

    test('should NOT call createLocation when name is empty', async () => {
      render(<LocationCreateForm />);
      // Don't fill name — description present
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'A great city' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockCreateLocation).not.toHaveBeenCalled();
      });
    });

    test('should call onSuccess after successful submission', async () => {
      const onSuccess = jest.fn();
      render(<LocationCreateForm onSuccess={onSuccess} />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New City' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'A great city' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should call onCancel when Cancel is clicked', () => {
      const onCancel = jest.fn();
      render(<LocationCreateForm onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should call markEntityAsConverted when noteId and entityId are provided', async () => {
      render(
        <LocationCreateForm
          initialData={{
            name: 'Cave Location',
            description: 'A dark cave',
            noteId: 'note-1',
            entityId: 'entity-1',
          }}
        />
      );
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockMarkEntityAsConverted).toHaveBeenCalledWith(
          'note-1',
          'entity-1',
          'new-location-id'
        );
      });
    });

    test('should NOT call markEntityAsConverted when noteId is absent', async () => {
      render(
        <LocationCreateForm
          initialData={{ name: 'Cave Location', description: 'A dark cave' }}
        />
      );
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockCreateLocation).toHaveBeenCalled();
      });
      expect(mockMarkEntityAsConverted).not.toHaveBeenCalled();
    });

    test('should show error message when createLocation throws', async () => {
      mockCreateLocation.mockRejectedValue(new Error('Network error'));
      render(<LocationCreateForm />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New City' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'A great city' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('should show "Creating..." text on submit button while submitting', async () => {
      // Delay the mock to observe loading state
      mockCreateLocation.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('id-1'), 100))
      );
      render(<LocationCreateForm />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New City' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'A great city' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // NPCs and Quests dialog buttons
  // -------------------------------------------------------------------------
  describe('dialog buttons', () => {
    test('should render "Select Related Quests" button', () => {
      render(<LocationCreateForm />);
      expect(
        screen.getByRole('button', { name: /select related quests/i })
      ).toBeInTheDocument();
    });

    test('should render "Select Connected NPCs" button', () => {
      render(<LocationCreateForm />);
      expect(
        screen.getByRole('button', { name: /select connected npcs/i })
      ).toBeInTheDocument();
    });
  });
});
