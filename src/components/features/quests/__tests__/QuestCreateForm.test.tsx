// src/components/features/quests/__tests__/QuestCreateForm.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuestCreateForm from '../QuestCreateForm';

// ---------------------------------------------------------------------------
// Mock external dependencies
// ---------------------------------------------------------------------------

const mockAddQuest = jest.fn();
const mockMarkEntityAsConverted = jest.fn();

jest.mock('../../../../context/QuestContext', () => ({
  useQuests: jest.fn(),
}));

jest.mock('../../../../context/NoteContext', () => ({
  useNotes: jest.fn(),
}));

jest.mock('../../../../context/NPCContext', () => ({
  useNPCs: jest.fn(),
}));

jest.mock('../../../../context/LocationContext', () => ({
  useLocations: jest.fn(() => ({ locations: [] })),
}));

// ---------------------------------------------------------------------------
// Hook setup helpers
// ---------------------------------------------------------------------------

const { useQuests } = require('../../../../context/QuestContext');
const { useNotes } = require('../../../../context/NoteContext');
const { useNPCs } = require('../../../../context/NPCContext');

function setupMocks({
  addQuest = mockAddQuest,
  isLoading = false,
  error = null as string | null,
  npcs = [] as any[],
  markEntityAsConverted = mockMarkEntityAsConverted,
}: {
  addQuest?: jest.Mock;
  isLoading?: boolean;
  error?: string | null;
  npcs?: any[];
  markEntityAsConverted?: jest.Mock;
} = {}) {
  (useQuests as jest.Mock).mockReturnValue({ addQuest, isLoading, error });
  (useNotes as jest.Mock).mockReturnValue({ markEntityAsConverted });
  (useNPCs as jest.Mock).mockReturnValue({ npcs });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('QuestCreateForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddQuest.mockResolvedValue('new-quest-id');
    mockMarkEntityAsConverted.mockResolvedValue(undefined);
    setupMocks();
  });

  // NOTE: Input component missing htmlFor/id association — bug #251.
  // Use getByText() for labels and getAllByRole('textbox') for inputs.

  // -------------------------------------------------------------------------
  // Rendering
  // -------------------------------------------------------------------------
  describe('rendering', () => {
    test('should render Title label', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Title *')).toBeInTheDocument();
    });

    test('should render Description label', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Description *')).toBeInTheDocument();
    });

    test('should render Status select with default "active"', () => {
      render(<QuestCreateForm />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'active');
      expect(statusSelect).toBeDefined();
    });

    test('should render Create Quest submit button', () => {
      render(<QuestCreateForm />);
      expect(screen.getByRole('button', { name: /create quest/i })).toBeInTheDocument();
    });

    test('should render Cancel button', () => {
      render(<QuestCreateForm />);
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    test('should render Objectives section', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Objectives')).toBeInTheDocument();
    });

    test('should render Initial Leads section', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Initial Leads')).toBeInTheDocument();
    });

    test('should render Key Locations section', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Key Locations')).toBeInTheDocument();
    });

    test('should render Possible Complications section', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Possible Complications')).toBeInTheDocument();
    });

    test('should render Rewards section', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Rewards')).toBeInTheDocument();
    });

    test('should render Related NPCs section', () => {
      render(<QuestCreateForm />);
      expect(screen.getByText('Related NPCs')).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------------------
  // Initial data pre-population
  // -------------------------------------------------------------------------
  describe('initialData pre-population', () => {
    test('should prefill title from initialData', () => {
      render(<QuestCreateForm initialData={{ title: 'Prefilled Quest' }} />);
      const textboxes = screen.getAllByRole('textbox');
      expect(textboxes[0]).toHaveValue('Prefilled Quest');
    });

    test('should prefill description from initialData', () => {
      render(<QuestCreateForm initialData={{ description: 'A heroic task' }} />);
      expect(screen.getByDisplayValue('A heroic task')).toBeInTheDocument();
    });

    test('should prefill status from initialData', () => {
      render(<QuestCreateForm initialData={{ status: 'completed' }} />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'completed');
      expect(statusSelect).toBeDefined();
    });

    test('should prefill objectives from initialData as strings', async () => {
      render(
        <QuestCreateForm
          initialData={{
            objectives: ['Talk to the innkeeper', 'Find the cave'],
          }}
        />
      );
      await waitFor(() => {
        expect(screen.getByDisplayValue('Talk to the innkeeper')).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------------------
  // Form interaction
  // -------------------------------------------------------------------------
  describe('form interaction', () => {
    test('should update title field when user types', async () => {
      render(<QuestCreateForm />);
      const titleInput = screen.getAllByRole('textbox')[0];
      await userEvent.type(titleInput, 'New Quest');
      expect(titleInput).toHaveValue('New Quest');
    });

    test('should update Status select when changed', () => {
      render(<QuestCreateForm />);
      const selects = screen.getAllByRole('combobox');
      const statusSelect = selects.find(s => (s as HTMLSelectElement).value === 'active') as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'completed' } });
      expect(statusSelect).toHaveValue('completed');
    });
  });

  // -------------------------------------------------------------------------
  // Form submission
  // -------------------------------------------------------------------------
  describe('form submission', () => {
    test('should call addQuest with correct data on valid submission', async () => {
      render(<QuestCreateForm />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New Quest' } });
      // Description is a textarea
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'Quest description' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockAddQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'New Quest',
            description: 'Quest description',
            status: 'active',
          })
        );
      });
    });

    test('should NOT call addQuest when title is empty', async () => {
      render(<QuestCreateForm />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockAddQuest).not.toHaveBeenCalled();
      });
    });

    test('should show validation error when title is empty on submit', async () => {
      render(<QuestCreateForm />);
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText(/title and description are required/i)).toBeInTheDocument();
      });
    });

    test('should call onSuccess after successful submission', async () => {
      const onSuccess = jest.fn();
      render(<QuestCreateForm onSuccess={onSuccess} />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New Quest' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'Quest description' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    test('should call onCancel when Cancel is clicked', () => {
      const onCancel = jest.fn();
      render(<QuestCreateForm onCancel={onCancel} />);
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    test('should call markEntityAsConverted when noteId and entityId are provided', async () => {
      render(
        <QuestCreateForm
          initialData={{
            title: 'Converted Quest',
            description: 'From a note',
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
          'new-quest-id'
        );
      });
    });

    test('should NOT call markEntityAsConverted when noteId is absent', async () => {
      render(
        <QuestCreateForm
          initialData={{ title: 'Quest', description: 'No note' }}
        />
      );
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockAddQuest).toHaveBeenCalled();
      });
      expect(mockMarkEntityAsConverted).not.toHaveBeenCalled();
    });

    test('should show error message when addQuest throws', async () => {
      mockAddQuest.mockRejectedValue(new Error('Network error'));
      render(<QuestCreateForm />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New Quest' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'Quest description' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Network error')).toBeInTheDocument();
      });
    });

    test('should show "Creating..." text on submit button while submitting', async () => {
      mockAddQuest.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('id-1'), 100))
      );
      render(<QuestCreateForm />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New Quest' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'Quest description' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(screen.getByText('Creating...')).toBeInTheDocument();
      });
    });

    test('should include relatedNPCIds in submitted data', async () => {
      render(<QuestCreateForm />);
      const textboxes = screen.getAllByRole('textbox');
      fireEvent.change(textboxes[0], { target: { value: 'New Quest' } });
      const descLabel = screen.getByText('Description *');
      const descTextarea = descLabel.parentElement?.querySelector('textarea');
      fireEvent.change(descTextarea!, { target: { value: 'Quest description' } });
      fireEvent.submit(document.querySelector('form')!);
      await waitFor(() => {
        expect(mockAddQuest).toHaveBeenCalledWith(
          expect.objectContaining({
            relatedNPCIds: expect.any(Array),
          })
        );
      });
    });
  });

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    test('should show "Creating..." when isLoading is true from context', () => {
      setupMocks({ isLoading: true });
      render(<QuestCreateForm />);
      expect(screen.getByText('Creating...')).toBeInTheDocument();
    });

    test('should disable submit button when isLoading is true', () => {
      setupMocks({ isLoading: true });
      render(<QuestCreateForm />);
      expect(screen.getByRole('button', { name: /creating\.\.\./i })).toBeDisabled();
    });
  });

  // -------------------------------------------------------------------------
  // Error from context
  // -------------------------------------------------------------------------
  describe('context error', () => {
    test('should display context error when set', () => {
      setupMocks({ error: 'Failed to save quest' });
      render(<QuestCreateForm />);
      expect(screen.getByText('Failed to save quest')).toBeInTheDocument();
    });
  });
});
