// src/features/collaboration/notes/components/__tests__/NoteReferences.test.tsx

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import NoteReferences from '../NoteReferences';
import { Note } from '../../types';

const mockNavigateToPage = jest.fn();
const mockGetNoteById = jest.fn();
const mockGetCollection = jest.fn();

jest.mock('../../context/NoteContext', () => ({ useNotes: jest.fn() }));
jest.mock('@/features/user-management', () => ({ useCampaigns: jest.fn() }));
jest.mock('@/features/campaign-entities', () => ({
  useNPCs: jest.fn(),
  useLocations: jest.fn(),
  useQuests: jest.fn(),
  useRumors: jest.fn(),
}));
jest.mock('shared/hooks/useNavigation', () => ({ useNavigation: jest.fn() }));
jest.mock('core/services/firebase/data/DocumentService', () => ({
  __esModule: true,
  default: { getInstance: () => ({ getCollection: mockGetCollection }) },
}));

const { useNotes } = require('../../context/NoteContext');
const { useCampaigns } = require('@/features/user-management');
const { useNPCs, useLocations, useQuests, useRumors } = require('@/features/campaign-entities');
const { useNavigation } = require('shared/hooks/useNavigation');

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'note-1',
    title: 'Session',
    content: '',
    extractedEntities: [],
    status: 'active',
    tags: [],
    updatedAt: '2024-01-15T10:00:00.000Z',
    campaignId: 'campaign-1',
    createdBy: 'user-1',
    createdByUsername: 'TestUser',
    dateAdded: '2024-01-15T10:00:00.000Z',
    ...overrides,
  };
}

function setupMocks({
  content = '',
  npcs = [] as any[],
  locations = [] as any[],
  quests = [] as any[],
  rumors = [] as any[],
  activeCampaignId = 'campaign-1' as string | null,
} = {}) {
  mockGetNoteById.mockReturnValue(makeNote({ content }));
  (useNotes as jest.Mock).mockReturnValue({ getNoteById: mockGetNoteById });
  (useCampaigns as jest.Mock).mockReturnValue({ activeCampaignId });
  (useNPCs as jest.Mock).mockReturnValue({ npcs, isLoading: false });
  (useLocations as jest.Mock).mockReturnValue({ locations, isLoading: false });
  (useQuests as jest.Mock).mockReturnValue({ quests, isLoading: false });
  (useRumors as jest.Mock).mockReturnValue({ rumors, isLoading: false });
  (useNavigation as jest.Mock).mockReturnValue({
    navigateToPage: mockNavigateToPage,
    currentPath: '/notes/note-1',
  });
}

describe('NoteReferences', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should find an NPC named in the note', async () => {
    setupMocks({
      content: 'The party met Gundren Rockseeker at the inn.',
      npcs: [{ id: 'npc-1', name: 'Gundren Rockseeker' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.getByText('Gundren Rockseeker')).toBeInTheDocument();
    });
  });

  test('should NOT fetch collections from DocumentService', async () => {
    setupMocks({
      content: 'The party met Gundren Rockseeker.',
      npcs: [{ id: 'npc-1', name: 'Gundren Rockseeker' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.getByText('Gundren Rockseeker')).toBeInTheDocument();
    });
    // The whole point of the change: four network reads per note open, gone.
    expect(mockGetCollection).not.toHaveBeenCalled();
  });

  test('should not match an entity spanning a sentence boundary', async () => {
    setupMocks({
      content: 'We camped in the cave. Wave Echo starts tomorrow.',
      locations: [{ id: 'loc-1', name: 'Cave Wave Echo' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Cave Wave Echo')).not.toBeInTheDocument();
    });
  });

  test('should not match a name inside a longer word', async () => {
    setupMocks({
      content: 'The caverns were flooded.',
      locations: [{ id: 'loc-1', name: 'Cave' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Cave')).not.toBeInTheDocument();
    });
  });

  test('should report matches across all four entity types', async () => {
    setupMocks({
      content: 'Gundren went to Phandalin about the Lost Mine and the Black Spider.',
      npcs: [{ id: 'npc-1', name: 'Gundren' }],
      locations: [{ id: 'loc-1', name: 'Phandalin' }],
      quests: [{ id: 'quest-1', title: 'Lost Mine' }],
      rumors: [{ id: 'rumor-1', title: 'Black Spider' }],
    });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.getByText('Gundren')).toBeInTheDocument();
    });
    expect(screen.getByText('Phandalin')).toBeInTheDocument();
    expect(screen.getByText('Lost Mine')).toBeInTheDocument();
    expect(screen.getByText('Black Spider')).toBeInTheDocument();
  });

  test('should report no references for an empty note', async () => {
    setupMocks({ content: '', npcs: [{ id: 'npc-1', name: 'Gundren' }] });

    render(<NoteReferences noteId="note-1" />);

    await waitFor(() => {
      expect(screen.queryByText('Gundren')).not.toBeInTheDocument();
    });
  });

  test('should surface found references to its parent', async () => {
    const onReferencesFound = jest.fn();
    setupMocks({
      content: 'Gundren was here.',
      npcs: [{ id: 'npc-1', name: 'Gundren' }],
    });

    render(<NoteReferences noteId="note-1" onReferencesFound={onReferencesFound} />);

    await waitFor(() => {
      expect(onReferencesFound).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'npc-1', type: 'npc', title: 'Gundren' }),
      ]);
    });
  });
});
