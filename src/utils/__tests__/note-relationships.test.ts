// src/utils/__tests__/note-relationships.test.ts

// Mock the firebase services module before importing the SUT.
jest.mock('../../services/firebase', () => ({
  __esModule: true,
  default: {
    document: {
      getDocument: jest.fn(),
      updateDocument: jest.fn(),
      queryDocuments: jest.fn(),
    },
  },
}));

import {
  linkNoteToEntity,
  unlinkNoteFromEntity,
  getEntitiesForNote,
} from '../note-relationships';
import firebaseServices from '../../services/firebase';

const mockedDocument = (firebaseServices as any).document as {
  getDocument: jest.Mock;
  updateDocument: jest.Mock;
  queryDocuments: jest.Mock;
};

describe('note-relationships', () => {
  beforeEach(() => {
    mockedDocument.getDocument.mockReset();
    mockedDocument.updateDocument.mockReset();
    mockedDocument.queryDocuments.mockReset();
  });

  describe('linkNoteToEntity', () => {
    test('should map npc entity type to "npcs" collection and add note id when entity has no related notes', async () => {
      mockedDocument.getDocument.mockResolvedValue({ id: 'npc-1' });

      await linkNoteToEntity('note-1', 'npc-1', 'npc');

      expect(mockedDocument.getDocument).toHaveBeenCalledWith('npcs', 'npc-1');
      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('npcs', 'npc-1', {
        relatedNotes: ['note-1'],
      });
    });

    test('should map location entity type to "locations" collection', async () => {
      mockedDocument.getDocument.mockResolvedValue({ id: 'loc-1' });
      await linkNoteToEntity('note-1', 'loc-1', 'location');
      expect(mockedDocument.getDocument).toHaveBeenCalledWith('locations', 'loc-1');
      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('locations', 'loc-1', {
        relatedNotes: ['note-1'],
      });
    });

    test('should map quest entity type to "quests" collection', async () => {
      mockedDocument.getDocument.mockResolvedValue({ id: 'quest-1' });
      await linkNoteToEntity('note-1', 'quest-1', 'quest');
      expect(mockedDocument.getDocument).toHaveBeenCalledWith('quests', 'quest-1');
      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('quests', 'quest-1', {
        relatedNotes: ['note-1'],
      });
    });

    test('should map rumor entity type to "rumors" collection', async () => {
      mockedDocument.getDocument.mockResolvedValue({ id: 'rumor-1' });
      await linkNoteToEntity('note-1', 'rumor-1', 'rumor');
      expect(mockedDocument.getDocument).toHaveBeenCalledWith('rumors', 'rumor-1');
      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('rumors', 'rumor-1', {
        relatedNotes: ['note-1'],
      });
    });

    test('should append the note id to existing relatedNotes', async () => {
      mockedDocument.getDocument.mockResolvedValue({
        id: 'npc-1',
        relatedNotes: ['existing-1', 'existing-2'],
      });

      await linkNoteToEntity('note-1', 'npc-1', 'npc');

      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('npcs', 'npc-1', {
        relatedNotes: ['existing-1', 'existing-2', 'note-1'],
      });
    });

    test('should not add the note id if it is already present (idempotent)', async () => {
      mockedDocument.getDocument.mockResolvedValue({
        id: 'npc-1',
        relatedNotes: ['note-1', 'existing-2'],
      });

      await linkNoteToEntity('note-1', 'npc-1', 'npc');

      expect(mockedDocument.updateDocument).not.toHaveBeenCalled();
    });

    test('should throw when entity is not found', async () => {
      mockedDocument.getDocument.mockResolvedValue(null);

      await expect(linkNoteToEntity('note-1', 'missing', 'npc')).rejects.toThrow(
        'Entity not found'
      );
      expect(mockedDocument.updateDocument).not.toHaveBeenCalled();
    });

    test('should throw for an unsupported entity type', async () => {
      await expect(
        linkNoteToEntity('note-1', 'x', 'bogus' as any)
      ).rejects.toThrow(/Unsupported entity type/);
      expect(mockedDocument.getDocument).not.toHaveBeenCalled();
    });
  });

  describe('unlinkNoteFromEntity', () => {
    test('should remove note id from relatedNotes', async () => {
      mockedDocument.getDocument.mockResolvedValue({
        id: 'npc-1',
        relatedNotes: ['note-1', 'note-2', 'note-3'],
      });

      await unlinkNoteFromEntity('note-2', 'npc-1', 'npc');

      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('npcs', 'npc-1', {
        relatedNotes: ['note-1', 'note-3'],
      });
    });

    test('should silently return (no throw) when entity is not found', async () => {
      mockedDocument.getDocument.mockResolvedValue(null);

      await expect(unlinkNoteFromEntity('note-1', 'missing', 'npc')).resolves.toBeUndefined();
      expect(mockedDocument.updateDocument).not.toHaveBeenCalled();
    });

    test('should call updateDocument with empty array when entity has no relatedNotes', async () => {
      mockedDocument.getDocument.mockResolvedValue({ id: 'npc-1' });

      await unlinkNoteFromEntity('note-1', 'npc-1', 'npc');

      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('npcs', 'npc-1', {
        relatedNotes: [],
      });
    });

    test('should produce an empty filtered list when no notes match', async () => {
      mockedDocument.getDocument.mockResolvedValue({
        id: 'npc-1',
        relatedNotes: ['note-other'],
      });

      await unlinkNoteFromEntity('note-target', 'npc-1', 'npc');

      expect(mockedDocument.updateDocument).toHaveBeenCalledWith('npcs', 'npc-1', {
        relatedNotes: ['note-other'],
      });
    });

    test('should throw for unsupported entity type', async () => {
      await expect(
        unlinkNoteFromEntity('note-1', 'x', 'bogus' as any)
      ).rejects.toThrow(/Unsupported entity type/);
    });
  });

  describe('getEntitiesForNote', () => {
    test('should aggregate entities across all collections', async () => {
      mockedDocument.queryDocuments
        .mockResolvedValueOnce([{ id: 'npc-1', name: 'Bilbo' }]) // npcs
        .mockResolvedValueOnce([{ id: 'loc-1', name: 'Shire' }]) // locations
        .mockResolvedValueOnce([{ id: 'quest-1', title: 'Find Ring' }]) // quests
        .mockResolvedValueOnce([{ id: 'rumor-1', name: 'Whispers' }]); // rumors

      const result = await getEntitiesForNote('note-1');

      expect(result).toEqual(
        expect.arrayContaining([
          { id: 'npc-1', type: 'npc', noteId: 'note-1', title: 'Bilbo' },
          { id: 'loc-1', type: 'location', noteId: 'note-1', title: 'Shire' },
          { id: 'quest-1', type: 'quest', noteId: 'note-1', title: 'Find Ring' },
          { id: 'rumor-1', type: 'rumor', noteId: 'note-1', title: 'Whispers' },
        ])
      );
      expect(result).toHaveLength(4);
    });

    test('should query each collection with the correct parameters', async () => {
      mockedDocument.queryDocuments.mockResolvedValue([]);

      await getEntitiesForNote('note-42');

      const collections = ['npcs', 'locations', 'quests', 'rumors'];
      collections.forEach((col) => {
        expect(mockedDocument.queryDocuments).toHaveBeenCalledWith(
          col,
          'relatedNotes',
          'array-contains',
          'note-42'
        );
      });
    });

    test('should fall back to type-based title when entity has neither name nor title', async () => {
      mockedDocument.queryDocuments
        .mockResolvedValueOnce([{ id: 'npc-1' }]) // npcs - no name
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getEntitiesForNote('note-1');

      expect(result).toEqual([
        { id: 'npc-1', type: 'npc', noteId: 'note-1', title: 'npc npc-1' },
      ]);
    });

    test('should prefer name over title when both are present', async () => {
      mockedDocument.queryDocuments
        .mockResolvedValueOnce([{ id: 'npc-1', name: 'NameField', title: 'TitleField' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await getEntitiesForNote('note-1');
      expect(result[0].title).toBe('NameField');
    });

    test('should continue when one collection query fails', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockedDocument.queryDocuments
        .mockResolvedValueOnce([{ id: 'npc-1', name: 'Bilbo' }])
        .mockRejectedValueOnce(new Error('locations query failed'))
        .mockResolvedValueOnce([{ id: 'quest-1', title: 'Find Ring' }])
        .mockResolvedValueOnce([]);

      const result = await getEntitiesForNote('note-1');

      expect(result).toEqual(
        expect.arrayContaining([
          { id: 'npc-1', type: 'npc', noteId: 'note-1', title: 'Bilbo' },
          { id: 'quest-1', type: 'quest', noteId: 'note-1', title: 'Find Ring' },
        ])
      );
      expect(result).toHaveLength(2);
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });

    test('should return empty array when no entities reference the note', async () => {
      mockedDocument.queryDocuments.mockResolvedValue([]);
      const result = await getEntitiesForNote('note-1');
      expect(result).toEqual([]);
    });
  });
});
