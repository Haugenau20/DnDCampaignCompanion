// src/utils/__tests__/attribution-utils.test.ts

import {
  formatAttributionDate,
  shouldShowModification,
  getCreationAttributionText,
  getModificationAttributionText,
  determineAttributionActor,
  fetchAttributionUsernames,
  AttributionData,
} from '../attribution-utils';

describe('attribution-utils', () => {
  describe('formatAttributionDate', () => {
    test('should return empty string for undefined input', () => {
      expect(formatAttributionDate(undefined)).toBe('');
    });

    test('should return empty string for empty string', () => {
      expect(formatAttributionDate('')).toBe('');
    });

    test('should format a valid ISO date string in en-uk locale (dd/mm/yyyy)', () => {
      const result = formatAttributionDate('2025-06-15T12:00:00Z');
      // en-uk locale: dd/mm/yyyy with 2-digit month/day
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
      expect(result).toContain('06');
      expect(result).toContain('2025');
    });

    test('should return empty string for invalid date strings', () => {
      expect(formatAttributionDate('not-a-date')).toBe('');
    });

    test('should handle Date.toISOString() outputs', () => {
      const iso = new Date(2025, 0, 5).toISOString();
      const result = formatAttributionDate(iso);
      expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    });
  });

  describe('shouldShowModification', () => {
    test('should return false when modifiedByUsername is missing', () => {
      const data: AttributionData = { dateModified: '2025-06-15T12:00:00Z' };
      expect(shouldShowModification(data)).toBe(false);
    });

    test('should return false when dateModified is missing', () => {
      const data: AttributionData = { modifiedByUsername: 'alice' };
      expect(shouldShowModification(data)).toBe(false);
    });

    test('should return true when modifier differs from creator', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        modifiedByUsername: 'bob',
        dateModified: '2025-06-15T12:00:00Z',
        dateAdded: '2025-06-15T11:00:00Z',
      };
      expect(shouldShowModification(data)).toBe(true);
    });

    test('should return true when modification date is meaningfully later than creation date', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        modifiedByUsername: 'alice',
        dateAdded: '2025-06-15T12:00:00Z',
        dateModified: '2025-06-15T12:00:05Z', // 5 seconds later
      };
      expect(shouldShowModification(data)).toBe(true);
    });

    test('should return false when modification is within 1 second of creation', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        modifiedByUsername: 'alice',
        dateAdded: '2025-06-15T12:00:00.000Z',
        dateModified: '2025-06-15T12:00:00.500Z', // 500 ms later
      };
      expect(shouldShowModification(data)).toBe(false);
    });

    test('should return false when modification equals creation exactly', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        modifiedByUsername: 'alice',
        dateAdded: '2025-06-15T12:00:00Z',
        dateModified: '2025-06-15T12:00:00Z',
      };
      expect(shouldShowModification(data)).toBe(false);
    });

    test('should handle missing dateAdded (treated as invalid date)', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        modifiedByUsername: 'alice',
        dateModified: '2025-06-15T12:00:00Z',
        // dateAdded missing
      };
      // new Date('').getTime() is NaN → NaN > anything is false → returns false
      expect(shouldShowModification(data)).toBe(false);
    });
  });

  describe('getCreationAttributionText', () => {
    test('should return empty string when createdByUsername is missing', () => {
      const data: AttributionData = { dateAdded: '2025-06-15T12:00:00Z' };
      expect(getCreationAttributionText(data)).toBe('');
    });

    test('should include both name and date when both are present', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        dateAdded: '2025-06-15T12:00:00Z',
      };
      const result = getCreationAttributionText(data);
      expect(result).toContain('Added by alice on');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}$/);
    });

    test('should return only name when date is invalid or missing', () => {
      const data: AttributionData = { createdByUsername: 'alice' };
      expect(getCreationAttributionText(data)).toBe('Added by alice');
    });

    test('should return only name when dateAdded is invalid', () => {
      const data: AttributionData = {
        createdByUsername: 'alice',
        dateAdded: 'not-a-date',
      };
      expect(getCreationAttributionText(data)).toBe('Added by alice');
    });
  });

  describe('getModificationAttributionText', () => {
    test('should return empty string when modifiedByUsername is missing', () => {
      const data: AttributionData = { dateModified: '2025-06-15T12:00:00Z' };
      expect(getModificationAttributionText(data)).toBe('');
    });

    test('should return empty string when dateModified is missing', () => {
      const data: AttributionData = { modifiedByUsername: 'bob' };
      expect(getModificationAttributionText(data)).toBe('');
    });

    test('should include both name and date when both are present and date is valid', () => {
      const data: AttributionData = {
        modifiedByUsername: 'bob',
        dateModified: '2025-06-15T12:00:00Z',
      };
      const result = getModificationAttributionText(data);
      expect(result).toContain('Modified by bob on');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}$/);
    });

    test('should return only name when date is invalid', () => {
      const data: AttributionData = {
        modifiedByUsername: 'bob',
        dateModified: 'invalid',
      };
      expect(getModificationAttributionText(data)).toBe('Modified by bob');
    });
  });

  describe('determineAttributionActor', () => {
    test('should return empty string when no attribution data is present', () => {
      expect(determineAttributionActor({})).toBe('');
    });

    test('should prioritize modifiedByCharacterName above all', () => {
      const item = {
        modifiedByCharacterName: 'Gandalf',
        modifiedByUsername: 'alice',
        modifiedBy: 'uid-1',
        createdByCharacterName: 'Frodo',
        createdByUsername: 'bob',
        createdBy: 'uid-2',
      };
      expect(determineAttributionActor(item, { 'uid-1': 'alice-name' })).toBe('Gandalf');
    });

    test('should fall back to modifiedByUsername when character name absent', () => {
      const item = {
        modifiedByUsername: 'alice',
        modifiedBy: 'uid-1',
        createdByCharacterName: 'Frodo',
      };
      expect(determineAttributionActor(item)).toBe('alice');
    });

    test('should fall back to modifiedBy lookup when username absent', () => {
      const item = { modifiedBy: 'uid-1', createdByCharacterName: 'Frodo' };
      expect(determineAttributionActor(item, { 'uid-1': 'looked-up-name' })).toBe(
        'looked-up-name'
      );
    });

    test('should fall back to createdByCharacterName when no modification info', () => {
      const item = {
        createdByCharacterName: 'Frodo',
        createdByUsername: 'bob',
        createdBy: 'uid-2',
      };
      expect(determineAttributionActor(item)).toBe('Frodo');
    });

    test('should fall back to createdByUsername when no character names', () => {
      const item = { createdByUsername: 'bob', createdBy: 'uid-2' };
      expect(determineAttributionActor(item)).toBe('bob');
    });

    test('should fall back to createdBy lookup when no username available', () => {
      const item = { createdBy: 'uid-2' };
      expect(determineAttributionActor(item, { 'uid-2': 'creator-name' })).toBe('creator-name');
    });

    test('should return empty string when createdBy is set but no usernameMap entry exists', () => {
      const item = { createdBy: 'uid-2' };
      expect(determineAttributionActor(item)).toBe('');
    });

    test('should accept missing usernameMap (default to empty object)', () => {
      const item = { createdByUsername: 'bob' };
      expect(determineAttributionActor(item)).toBe('bob');
    });
  });

  describe('fetchAttributionUsernames', () => {
    test('should return empty object when groupId is empty', async () => {
      const result = await fetchAttributionUsernames('', ['u1'], {});
      expect(result).toEqual({});
    });

    test('should return empty object when userIds is empty', async () => {
      const result = await fetchAttributionUsernames('group-1', [], {});
      expect(result).toEqual({});
    });

    test('should fetch and map usernames for the given user IDs', async () => {
      const mockGetGroupUserProfile = jest
        .fn()
        .mockResolvedValueOnce({ username: 'alice' })
        .mockResolvedValueOnce({ username: 'bob' });
      const firebaseServices = {
        user: { getGroupUserProfile: mockGetGroupUserProfile },
      };

      const result = await fetchAttributionUsernames(
        'group-1',
        ['u1', 'u2'],
        firebaseServices
      );

      expect(mockGetGroupUserProfile).toHaveBeenCalledTimes(2);
      expect(mockGetGroupUserProfile).toHaveBeenCalledWith('group-1', 'u1');
      expect(mockGetGroupUserProfile).toHaveBeenCalledWith('group-1', 'u2');
      expect(result).toEqual({ u1: 'alice', u2: 'bob' });
    });

    test('should deduplicate user IDs before fetching', async () => {
      const mockGetGroupUserProfile = jest
        .fn()
        .mockResolvedValue({ username: 'alice' });
      const firebaseServices = {
        user: { getGroupUserProfile: mockGetGroupUserProfile },
      };

      await fetchAttributionUsernames('group-1', ['u1', 'u1', 'u1'], firebaseServices);

      expect(mockGetGroupUserProfile).toHaveBeenCalledTimes(1);
    });

    test('should omit users whose profile has no username', async () => {
      const mockGetGroupUserProfile = jest
        .fn()
        .mockResolvedValueOnce({ username: 'alice' })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({});
      const firebaseServices = {
        user: { getGroupUserProfile: mockGetGroupUserProfile },
      };

      const result = await fetchAttributionUsernames(
        'group-1',
        ['u1', 'u2', 'u3'],
        firebaseServices
      );

      expect(result).toEqual({ u1: 'alice' });
    });

    test('should continue processing other users when one lookup throws', async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const mockGetGroupUserProfile = jest
        .fn()
        .mockResolvedValueOnce({ username: 'alice' })
        .mockRejectedValueOnce(new Error('lookup failed'))
        .mockResolvedValueOnce({ username: 'carol' });
      const firebaseServices = {
        user: { getGroupUserProfile: mockGetGroupUserProfile },
      };

      const result = await fetchAttributionUsernames(
        'group-1',
        ['u1', 'u2', 'u3'],
        firebaseServices
      );

      expect(result).toEqual({ u1: 'alice', u3: 'carol' });
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
});
