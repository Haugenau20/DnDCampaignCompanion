// src/context/__tests__/behavioral/LocationContext.bugs.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { LocationProvider, useLocations } from '../../LocationContext';
import { Location, LocationStatus, LocationType, LocationNote } from '../../../types/location';

/**
 * LocationContext Bug Discovery Testing
 * 
 * Tests that INTENTIONALLY FAIL to document and track real implementation bugs.
 * These tests define the EXPECTED behavior and will pass once bugs are fixed.
 * 
 * IMPORTANT: These tests are designed to fail until bugs are resolved.
 * Do not modify these tests to make them pass - fix the implementation instead.
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseLocationData = jest.fn();
const mockUseFirebaseData = jest.fn();

jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

jest.mock('../../../hooks/useLocationData', () => ({
  useLocationData: () => mockUseLocationData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Mock user utilities for proper testing
jest.mock('../../../utils/user-utils', () => ({
  getUserName: jest.fn(),
  getActiveCharacterName: jest.fn()
}));

const { getUserName, getActiveCharacterName } = require('../../../utils/user-utils');

const LocationTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const locationContext = useLocations();
  
  React.useEffect(() => {
    onContextChange(locationContext);
  }, [locationContext, onContextChange]);
  
  return <div data-testid="location-bugs-test">Location Bug Tests</div>;
};

describe('LocationContext Bug Discovery Tests', () => {
  let locationContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    locationContext = null;

    // Setup user utilities to return expected values
    getUserName.mockReturnValue('Test User');
    getActiveCharacterName.mockReturnValue('Test Character');

    mockAddData = jest.fn();
    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();

    // Setup authenticated state for bug testing
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user' },
    });

    mockUseUser.mockReturnValue({
      userProfile: { name: 'Test User' },
      activeGroupUserProfile: { 
        userId: 'test-user', 
        username: 'Test User',
        role: 'member',
        joinedAt: '2025-06-15T00:00:00.000Z',
        activeCharacterId: 'char-1',
        characters: [
          { id: 'char-1', name: 'Test Character' }
        ]
      },
    });

    mockUseGroups.mockReturnValue({
      activeGroupId: 'test-group',
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: 'test-campaign',
    });

    mockUseLocationData.mockReturnValue({
      locations: [],
      loading: false,
      error: null,
      refreshLocations: jest.fn(),
      hasRequiredContext: true,
    });

    mockUseFirebaseData.mockReturnValue({
      addData: mockAddData,
      updateData: mockUpdateData,
      deleteData: mockDeleteData,
    });
  });

  const renderLocationContext = () => {
    const handleContextChange = (context: any) => {
      locationContext = context;
    };

    return render(
      <LocationProvider>
        <LocationTestComponent onContextChange={handleContextChange} />
      </LocationProvider>
    );
  };

  describe('Bug #008: User Attribution Metadata Issues', () => {
    test('should include proper user attribution in location creation', async () => {
      mockAddData.mockResolvedValue(undefined);
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const locationData: Omit<Location, 'id'> = {
        name: 'Test Location',
        type: 'city' as LocationType,
        status: 'known' as LocationStatus,
        description: 'A test location for bug discovery',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await locationContext.createLocation(locationData);
      });

      // EXPECTED: Proper user attribution metadata should be included
      // Test failures indicate bugs in LocationContext implementation
      expect(mockAddData).toHaveBeenCalledWith(
        expect.objectContaining({
          createdByUsername: 'Test User',        // FAILS until LocationContext bug fixed
          createdByCharacterName: 'Test Character', // FAILS until LocationContext bug fixed
          modifiedByUsername: 'Test User',       // FAILS until LocationContext bug fixed
          modifiedByCharacterName: 'Test Character' // FAILS until LocationContext bug fixed
        }),
        'test-location'
      );
    });

    test('should include proper user attribution in location updates', async () => {
      const mockLocations = [
        {
          id: 'test-location',
          name: 'Test Location',
          type: 'city' as LocationType,
          status: 'known' as LocationStatus,
          description: 'A test location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseLocationData.mockReturnValue({
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: jest.fn(),
        hasRequiredContext: true,
      });

      mockUpdateData.mockResolvedValue(undefined);
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      await act(async () => {
        await locationContext.updateLocation('test-location', { description: 'Updated description' });
      });

      // EXPECTED: User attribution should be included in updates
      // Test failures indicate bugs in LocationContext implementation
      expect(mockUpdateData).toHaveBeenCalledWith(
        'test-location',
        expect.objectContaining({
          modifiedByUsername: 'Test User',       // FAILS until LocationContext bug fixed
          modifiedByCharacterName: 'Test Character' // FAILS until LocationContext bug fixed
        })
      );
    });
  });

  describe('Bug #009: Location ID Generation Collision Risk', () => {
    test('should generate unique IDs for case-variant location names', async () => {
      mockAddData.mockResolvedValue(undefined);
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const location1 = { 
        name: 'Test Location',
        type: 'city' as LocationType,
        status: 'known' as LocationStatus,
        description: 'First location',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      const location2 = { 
        name: 'TEST LOCATION',
        type: 'town' as LocationType,
        status: 'known' as LocationStatus,
        description: 'Second location',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await locationContext.createLocation(location1);
        await locationContext.createLocation(location2);
      });

      // EXPECTED: Different IDs for different location names (case-sensitive)
      // Test failure indicates bug in ID generation algorithm
      const [firstCall, secondCall] = mockAddData.mock.calls;
      expect(firstCall[1]).toBe('test-location');
      expect(secondCall[1]).not.toBe('test-location'); // FAILS until ID generation handles case variants
    });

    test('should generate unique IDs for punctuation-variant location names', async () => {
      mockAddData.mockResolvedValue(undefined);
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const location1 = { 
        name: "Dragon's Rest Inn",
        type: 'building' as LocationType,
        status: 'known' as LocationStatus,
        description: 'First inn',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      const location2 = { 
        name: "Dragons Rest Inn",
        type: 'building' as LocationType,
        status: 'known' as LocationStatus,
        description: 'Second inn',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await locationContext.createLocation(location1);
        await locationContext.createLocation(location2);
      });

      // EXPECTED: Different names with punctuation should generate different IDs
      const [firstCall, secondCall] = mockAddData.mock.calls;
      expect(firstCall[1]).not.toBe(secondCall[1]); // FAILS until ID generation handles punctuation variants

      // Both should be valid but unique
      expect(firstCall[1]).toMatch(/dragon.*rest.*inn/);
      expect(secondCall[1]).toMatch(/dragon.*rest.*inn/);
      expect(firstCall[1]).not.toBe(secondCall[1]);
    });
  });

  describe('Bug #010: Location Hierarchical Deletion Order Logic', () => {
    test('should delete children in proper depth-first order', async () => {
      const mockLocations = [
        {
          id: 'parent-location',
          name: 'Parent Location',
          type: 'region' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Parent location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'child-location-1',
          name: 'Child Location 1',
          type: 'city' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Child location 1',
          parentId: 'parent-location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'child-location-2',
          name: 'Child Location 2',
          type: 'town' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Child location 2',
          parentId: 'parent-location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'grandchild-location',
          name: 'Grandchild Location',
          type: 'building' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Grandchild location',
          parentId: 'child-location-1',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseLocationData.mockReturnValue({
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: jest.fn(),
        hasRequiredContext: true,
      });

      mockDeleteData.mockResolvedValue(undefined);
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      await act(async () => {
        await locationContext.deleteLocation('parent-location');
      });

      // EXPECTED: Proper depth-first deletion order for referential integrity
      // Test failure indicates bug in deletion order implementation
      expect(mockDeleteData).toHaveBeenCalledTimes(4);

      // EXPECTED BEHAVIOR: Deepest children first, then parents
      // This ensures database referential integrity
      expect(mockDeleteData).toHaveBeenNthCalledWith(1, 'grandchild-location'); // FAILS until order fixed
      expect(mockDeleteData).toHaveBeenNthCalledWith(2, 'child-location-1');    // FAILS until order fixed
      expect(mockDeleteData).toHaveBeenNthCalledWith(3, 'child-location-2');    // FAILS until order fixed
      expect(mockDeleteData).toHaveBeenNthCalledWith(4, 'parent-location');     // FAILS until order fixed
    });

    test('should handle sequential deletion instead of parallel', async () => {
      const mockLocations = [
        {
          id: 'parent',
          name: 'Parent',
          type: 'region' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Parent',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'child1',
          name: 'Child 1',
          type: 'city' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Child 1',
          parentId: 'parent',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'child2',
          name: 'Child 2',
          type: 'city' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Child 2',
          parentId: 'parent',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseLocationData.mockReturnValue({
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: jest.fn(),
        hasRequiredContext: true,
      });

      // Track call order to verify sequential vs parallel execution
      let callOrder: string[] = [];
      mockDeleteData.mockImplementation((id: string) => {
        callOrder.push(id);
        return Promise.resolve();
      });

      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      await act(async () => {
        await locationContext.deleteLocation('parent');
      });

      // EXPECTED: Sequential deletion for database safety
      // Test failure indicates parallel deletion implementation bug
      
      // For database integrity, deletions should be sequential, not parallel
      expect(callOrder).toEqual(['child1', 'child2', 'parent']); // FAILS until sequential deletion implemented
    });
  });

  describe('Bug Documentation: Error Boundary Integration', () => {
    test('useLocations hook error should integrate properly with React error boundaries', () => {
      // This test documents the React error boundary integration issue
      // The hook throws correctly but error boundary integration could be improved
      
      const TestComponent = () => {
        try {
          useLocations();
          return <div>Should not reach here</div>;
        } catch (error) {
          // Error boundary integration could be improved
          throw error; // Re-throw for proper error boundary handling
        }
      };

      // EXPECTED: Hook should throw proper error for error boundary handling
      expect(() => render(<TestComponent />)).toThrow(
        'useLocations must be used within a LocationProvider'
      );
    });
  });
});

/**
 * LocationContext Bug Discovery Tests
 * 
 * These tests follow specification-based testing methodology:
 * 1. Mock external dependencies to return expected values
 * 2. Test for EXPECTED behavior according to specifications
 * 3. Test failures indicate bugs in LocationContext implementation
 * 
 * IMPORTANT: These tests define specifications - do not modify them to pass.
 * Fix the LocationContext implementation to make the tests pass.
 * 
 * Bugs Tracked:
 * - #008: User Attribution Metadata Issues (High Priority)
 * - #009: Location ID Generation Collision Risk (Medium Priority)  
 * - #010: Location Hierarchical Deletion Order Logic (Medium Priority)
 * - React Error Boundary Integration (Low Priority)
 */