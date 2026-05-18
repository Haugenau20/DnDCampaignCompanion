// src/utils/__tests__/user-utils.test.ts

import { 
  getUserDisplayName, 
  getUserName, 
  getActiveCharacterId, 
  getActiveCharacterName 
} from '../user-utils';

describe('user-utils', () => {
  describe('getUserDisplayName', () => {
    test('should return empty string for null/undefined profile', () => {
      expect(getUserDisplayName(null)).toBe('');
      expect(getUserDisplayName(undefined)).toBe('');
    });

    test('should return active character name when available', () => {
      const userProfile = {
        username: 'testuser',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Gandalf the Grey' },
          { id: 'char-2', name: 'Legolas' }
        ]
      };

      expect(getUserDisplayName(userProfile)).toBe('Gandalf the Grey');
    });

    test('should ignore string characters in array', () => {
      const userProfile = {
        username: 'testuser',
        activeCharacterId: 'char-1',
        characters: [
          'invalid-string-character', // Should be ignored
          { id: 'char-1', name: 'Gimli' },
          'another-string' // Should be ignored
        ]
      };

      expect(getUserDisplayName(userProfile)).toBe('Gimli');
    });

    test('should fallback to username when active character not found', () => {
      const userProfile = {
        username: 'testuser',
        activeCharacterId: 'nonexistent-char',
        characters: [
          { id: 'char-1', name: 'Frodo' }
        ]
      };

      expect(getUserDisplayName(userProfile)).toBe('testuser');
    });

    test('should fallback to username when no activeCharacterId', () => {
      const userProfile = {
        username: 'testuser',
        characters: [
          { id: 'char-1', name: 'Sam' }
        ]
      };

      expect(getUserDisplayName(userProfile)).toBe('testuser');
    });

    test('should fallback to username when no characters array', () => {
      const userProfile = {
        username: 'testuser',
        activeCharacterId: 'char-1'
      };

      expect(getUserDisplayName(userProfile)).toBe('testuser');
    });

    test('should return empty string when no username and no active character', () => {
      const userProfile = {
        activeCharacterId: 'char-1',
        characters: []
      };

      expect(getUserDisplayName(userProfile)).toBe('');
    });
  });

  describe('getUserName', () => {
    test('should return username when available', () => {
      const userProfile = { username: 'testuser' };
      expect(getUserName(userProfile)).toBe('testuser');
    });

    test('should return empty string for null/undefined profile', () => {
      expect(getUserName(null)).toBe('');
      expect(getUserName(undefined)).toBe('');
    });

    test('should return empty string when username not available', () => {
      const userProfile = { name: 'Test User' }; // Wrong field name
      expect(getUserName(userProfile)).toBe('');
    });

    test('should handle empty username', () => {
      const userProfile = { username: '' };
      expect(getUserName(userProfile)).toBe('');
    });

    // CORRECTED TESTS: These use the proper TypeScript interface structure
    test('should work with proper GroupUserProfile structure', () => {
      const activeGroupUserProfile = { 
        userId: 'test-user',
        username: 'Test User',        // Correct field name
        role: 'member' as const,
        joinedAt: '2025-06-15T00:00:00.000Z'
      };
      
      // This should work correctly with proper data structure
      expect(getUserName(activeGroupUserProfile)).toBe('Test User'); // ✅ Should work
    });

    test('LEGACY: old test mocks with wrong field names', () => {
      // This documents what our test mocks were incorrectly using
      const incorrectTestMockProfile = {
        uid: 'test-user',
        name: 'Test User',          // ❌ Wrong field name (should be username)
        characterName: 'Test Character' // ❌ Wrong structure (should be characters array)
      };

      // This expectation is correct - wrong field names should return empty
      expect(getUserName(incorrectTestMockProfile)).toBe(''); // ✅ Correctly returns empty for wrong field
    });
  });

  describe('getActiveCharacterId', () => {
    test('should return activeCharacterId when available', () => {
      const userProfile = { activeCharacterId: 'char-123' };
      expect(getActiveCharacterId(userProfile)).toBe('char-123');
    });

    test('should return null for null/undefined profile', () => {
      expect(getActiveCharacterId(null)).toBe(null);
      expect(getActiveCharacterId(undefined)).toBe(null);
    });

    test('should return null when activeCharacterId not available', () => {
      const userProfile = { username: 'testuser' };
      expect(getActiveCharacterId(userProfile)).toBe(null);
    });

    test('should handle empty activeCharacterId', () => {
      const userProfile = { activeCharacterId: '' };
      expect(getActiveCharacterId(userProfile)).toBe(null); // Empty string becomes null
    });
  });

  describe('getActiveCharacterName', () => {
    test('should return character name when found', () => {
      const userProfile = {
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Aragorn' },
          { id: 'char-2', name: 'Boromir' }
        ]
      };

      expect(getActiveCharacterName(userProfile)).toBe('Aragorn');
    });

    test('should return null for null/undefined profile', () => {
      expect(getActiveCharacterName(null)).toBe(null);
      expect(getActiveCharacterName(undefined)).toBe(null);
    });

    test('should return null when no activeCharacterId', () => {
      const userProfile = {
        characters: [
          { id: 'char-1', name: 'Merry' }
        ]
      };

      expect(getActiveCharacterName(userProfile)).toBe(null);
    });

    test('should return null when no characters array', () => {
      const userProfile = {
        activeCharacterId: 'char-1'
      };

      expect(getActiveCharacterName(userProfile)).toBe(null);
    });

    test('should return null when character not found', () => {
      const userProfile = {
        activeCharacterId: 'nonexistent',
        characters: [
          { id: 'char-1', name: 'Pippin' }
        ]
      };

      expect(getActiveCharacterName(userProfile)).toBe(null);
    });

    test('should ignore string characters in array', () => {
      const userProfile = {
        activeCharacterId: 'char-1',
        characters: [
          'string-character', // Should be ignored
          { id: 'char-1', name: 'Elrond' }
        ]
      };

      expect(getActiveCharacterName(userProfile)).toBe('Elrond');
    });

    // CORRECTED TESTS: These use the proper TypeScript interface structure
    test('should work with proper GroupUserProfile structure', () => {
      const activeGroupUserProfile = {
        userId: 'test-user',
        username: 'TestUser',
        role: 'member' as const,
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',        // Correct field name
        characters: [                       // Correct structure (CharacterNameEntry[])
          { id: 'char-1', name: 'Test Character' },
          { id: 'char-2', name: 'Another Character' }
        ]
      };

      // This should work correctly with proper data structure
      expect(getActiveCharacterName(activeGroupUserProfile)).toBe('Test Character'); // ✅ Should work
    });

    test('LEGACY: old test mocks with wrong field names', () => {
      // This documents what our test mocks were incorrectly using
      const incorrectTestMockProfile = {
        uid: 'test-user',
        name: 'Test User',
        characterName: 'Test Character'  // ❌ Wrong structure (should be characters array + activeCharacterId)
      };

      // This expectation is correct - wrong structure should return null
      expect(getActiveCharacterName(incorrectTestMockProfile)).toBe(null); // ✅ Correctly returns null for wrong structure
    });

    test('LEGACY: alternative incorrect test pattern', () => {
      // Another pattern our tests were incorrectly using
      const incorrectTestMockProfile = {
        uid: 'test-user',
        username: 'TestUser',
        activeCharacterName: 'Test Character'  // ❌ Wrong field name (should be activeCharacterId + characters)
      };

      // This expectation is correct - wrong field names should return null
      expect(getActiveCharacterName(incorrectTestMockProfile)).toBe(null); // ✅ Correctly returns null for wrong structure
    });
  });

  describe('Integration Tests: Real-world Usage Patterns', () => {
    test('INTEGRATION: Firebase auth context typical structure', () => {
      // This structure is typical of what Firebase auth contexts provide
      const firebaseUserProfile = {
        uid: 'firebase-user-123',
        email: 'user@example.com',
        displayName: 'John Doe'
      };

      // Current utilities don't handle Firebase user structure
      expect(getUserName(firebaseUserProfile)).toBe(''); // Should extract from displayName?
      expect(getActiveCharacterName(firebaseUserProfile)).toBe(null); // Expected behavior
    });

    test('INTEGRATION: Correct GroupUserProfile structure', () => {
      // This is the CORRECT structure that Firebase contexts should provide
      const groupUserProfile = {
        userId: 'user-123',
        username: 'johndoe',
        role: 'member' as const,
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Thorin Oakenshield' }
        ]
      };

      // All utilities should work correctly with proper structure
      expect(getUserName(groupUserProfile)).toBe('johndoe'); // ✓ Works
      expect(getActiveCharacterName(groupUserProfile)).toBe('Thorin Oakenshield'); // ✓ Should work
    });

    test('INTEGRATION: Complete user profile structure', () => {
      // This is the structure the utilities expect
      const completeUserProfile = {
        uid: 'user-123',
        username: 'johndoe',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Thorin Oakenshield' },
          { id: 'char-2', name: 'Balin' }
        ]
      };

      // This structure works correctly
      expect(getUserName(completeUserProfile)).toBe('johndoe'); // ✓ Works
      expect(getActiveCharacterName(completeUserProfile)).toBe('Thorin Oakenshield'); // ✓ Works
      expect(getUserDisplayName(completeUserProfile)).toBe('Thorin Oakenshield'); // ✓ Works
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle malformed characters array', () => {
      const userProfile = {
        activeCharacterId: 'char-1',
        characters: [
          null, // Malformed entry
          { id: 'char-1', name: 'Dwalin' },
          undefined // Malformed entry
        ]
      };

      expect(getActiveCharacterName(userProfile)).toBe('Dwalin');
    });

    test('should handle characters array with missing name', () => {
      const userProfile = {
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1' } // Missing name field
        ]
      };

      expect(getActiveCharacterName(userProfile)).toBe(undefined); // Returns undefined name
    });

    test('should handle non-string activeCharacterId', () => {
      const userProfile = {
        activeCharacterId: 123, // Number instead of string
        characters: [
          { id: '123', name: 'Ori' }
        ]
      };

      // Should still work due to loose equality in find()
      expect(getActiveCharacterName(userProfile)).toBe(null); // Might not match due to type mismatch
    });
  });
});