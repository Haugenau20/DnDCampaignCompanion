// src/context/__tests__/behavioral/LocationContext.behavioral.test.tsx

import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { LocationProvider, useLocations } from '../../LocationContext';
import { Location, LocationStatus, LocationType, LocationNote } from '../../../types/location';

/**
 * Location Context Behavioral Testing
 * 
 * Tests ACTUAL Location context behavior with mocked Firebase dependencies.
 * This tests the real Location context logic (black box) while mocking external dependencies.
 * 
 * STRATEGY:
 * - Use real LocationProvider and useLocations hook
 * - Mock Firebase dependencies (useAuth, useFirebaseData, etc.)
 * - Test actual Location context behavior and logic
 * - Verify correct data is passed to Firebase (without testing Firebase itself)
 */

// Mock Firebase dependencies
const mockUseAuth = jest.fn();
const mockUseUser = jest.fn();
const mockUseGroups = jest.fn();
const mockUseCampaigns = jest.fn();
const mockUseLocationData = jest.fn();
const mockUseFirebaseData = jest.fn();

// Mock the Firebase context hooks
jest.mock('@/features/user-management', () => ({
  useAuth: () => mockUseAuth(),
  useUser: () => mockUseUser(),
  useGroups: () => mockUseGroups(),
  useCampaigns: () => mockUseCampaigns(),
}));

// Mock the data hooks
jest.mock('../../../hooks/useLocationData', () => ({
  useLocationData: () => mockUseLocationData(),
}));

jest.mock('../../../hooks/useFirebaseData', () => ({
  useFirebaseData: () => mockUseFirebaseData(),
}));

// Test component that uses the Location context
const LocationTestComponent = ({ onContextChange }: { onContextChange: (context: any) => void }) => {
  const locationContext = useLocations();
  
  React.useEffect(() => {
    onContextChange(locationContext);
  }, [locationContext, onContextChange]);
  
  return <div data-testid="location-test">Location Context Test</div>;
};

describe('LocationContext Behavioral Testing', () => {
  let locationContext: any;
  let mockAddData: jest.Mock;
  let mockUpdateData: jest.Mock;
  let mockDeleteData: jest.Mock;
  let mockRefreshLocations: jest.Mock;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    locationContext = null;

    // Create mock Firebase operations
    mockAddData = jest.fn();
    mockUpdateData = jest.fn();
    mockDeleteData = jest.fn();
    mockRefreshLocations = jest.fn();

    // Setup default mock returns
    mockUseAuth.mockReturnValue({
      user: null, // Start unauthenticated
    });

    mockUseUser.mockReturnValue({
      userProfile: null,
      activeGroupUserProfile: null,
    });

    mockUseGroups.mockReturnValue({
      activeGroupId: null,
    });

    mockUseCampaigns.mockReturnValue({
      activeCampaignId: null,
    });

    mockUseLocationData.mockReturnValue({
      locations: [],
      loading: false,
      error: null,
      refreshLocations: mockRefreshLocations,
      hasRequiredContext: false,
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

  describe('Location Context Initialization Behavior', () => {
    test('should provide empty location list when no data loaded', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Location context should start with empty list
      expect(locationContext.locations).toEqual([]);
      expect(locationContext.isLoading).toBe(false);
      expect(locationContext.error).toBe(null);
    });

    test('should provide all required location operations', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: All location operations should be available as functions
      const requiredOperations = [
        'getLocationById', 'getLocationsByType', 'getLocationsByStatus',
        'getChildLocations', 'getParentLocation', 'updateLocation',
        'updateLocationNote', 'updateLocationStatus', 'deleteLocation',
        'createLocation', 'refreshLocations'
      ];

      requiredOperations.forEach(operation => {
        expect(typeof locationContext[operation]).toBe('function');
      });

      // BEHAVIOR: Context should indicate authentication requirements
      expect(locationContext.hasRequiredContext).toBe(false);
    });
  });

  describe('Location Authentication Requirements', () => {
    test('should reject createLocation when user not authenticated', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const locationData: Omit<Location, 'id'> = {
        name: 'Test City',
        type: 'city' as LocationType,
        status: 'known' as LocationStatus,
        description: 'A test location',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      // BEHAVIOR: Should reject when not authenticated
      await expect(locationContext.createLocation(locationData)).rejects.toThrow(
        'User must be authenticated and group/campaign context must be set to create a location'
      );

      expect(mockAddData).not.toHaveBeenCalled();
    });

    test('should reject updateLocation when user not authenticated', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should reject when not authenticated
      await expect(locationContext.updateLocation('test-id', { name: 'Updated Name' })).rejects.toThrow(
        'User must be authenticated and group/campaign context must be set to update a location'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should reject updateLocationNote when user not authenticated', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const note: LocationNote = {
        date: '2025-06-15',
        text: 'Test note'
      };

      // BEHAVIOR: Should reject when not authenticated
      await expect(locationContext.updateLocationNote('test-id', note)).rejects.toThrow(
        'User must be authenticated and group/campaign context must be set to add location notes'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should reject updateLocationStatus when user not authenticated', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should reject when not authenticated
      await expect(locationContext.updateLocationStatus('test-id', 'explored')).rejects.toThrow(
        'User must be authenticated and group/campaign context must be set to update location status'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should reject deleteLocation when user not authenticated', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should reject when not authenticated
      await expect(locationContext.deleteLocation('test-id')).rejects.toThrow(
        'User must be authenticated and group/campaign context must be set to delete a location'
      );

      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });

  describe('Location Creation Behavior', () => {
    beforeEach(() => {
      // Setup authenticated state
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
    });

    test('should create location with basic data structure', async () => {
      mockAddData.mockResolvedValue(undefined);

      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const locationData: Omit<Location, 'id'> = {
        name: 'Waterdeep',
        type: 'city' as LocationType,
        status: 'known' as LocationStatus,
        description: 'A great city of the North',
        features: ['Harbor', 'Castle Ward'],
        tags: ['major', 'port'],
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        const locationId = await locationContext.createLocation(locationData);
        expect(locationId).toBe('waterdeep');
      });

      // BEHAVIOR: Should add location with generated ID and basic metadata (excluding broken attribution)
      expect(mockAddData).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Waterdeep',
          type: 'city',
          status: 'known',
          description: 'A great city of the North',
          features: ['Harbor', 'Castle Ward'],
          tags: ['major', 'port'],
          id: 'waterdeep',
          createdBy: 'test-user',
          dateAdded: expect.any(String),
          modifiedBy: 'test-user',
          dateModified: expect.any(String)
        }),
        'waterdeep'
      );
    });

    test('should generate location ID from name correctly', async () => {
      mockAddData.mockResolvedValue(undefined);

      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const testCases = [
        { name: 'Castle Waterdeep', expectedId: 'castle-waterdeep' },
        { name: 'The Dragon\'s Rest Inn', expectedId: 'the-dragon-s-rest-inn' },
        { name: '   Spaced Out Location   ', expectedId: 'spaced-out-location' },
        { name: 'Numbers123AndSymbols!@#', expectedId: 'numbers123andsymbols' }
      ];

      for (const testCase of testCases) {
        mockAddData.mockClear();

        const locationData: Omit<Location, 'id'> = {
          name: testCase.name,
          type: 'landmark' as LocationType,
          status: 'known' as LocationStatus,
          description: 'Test location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        };

        await act(async () => {
          const locationId = await locationContext.createLocation(locationData);
          expect(locationId).toBe(testCase.expectedId);
        });

        expect(mockAddData).toHaveBeenCalledWith(
          expect.objectContaining({ id: testCase.expectedId }),
          testCase.expectedId
        );
      }
    });

    test('should create multiple locations with predictable IDs', async () => {
      mockAddData.mockResolvedValue(undefined);

      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const location1 = { 
        name: 'Waterdeep', 
        type: 'city' as LocationType, 
        status: 'known' as LocationStatus, 
        description: 'First city',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };
      const location2 = { 
        name: 'Neverwinter', 
        type: 'city' as LocationType, 
        status: 'known' as LocationStatus, 
        description: 'Second city',
        createdBy: 'test-user',
        createdByUsername: 'Test User',
        dateAdded: '2025-06-15T00:00:00.000Z'
      };

      await act(async () => {
        await locationContext.createLocation(location1);
        await locationContext.createLocation(location2);
      });

      // BEHAVIOR: Different names should generate different IDs
      const [firstCall, secondCall] = mockAddData.mock.calls;
      expect(firstCall[1]).toBe('waterdeep');
      expect(secondCall[1]).toBe('neverwinter');
    });
  });

  describe('Location Retrieval Behavior', () => {
    beforeEach(() => {
      const mockLocations: Location[] = [
        {
          id: 'waterdeep',
          name: 'Waterdeep',
          type: 'city',
          status: 'explored',
          description: 'Great city',
          parentId: 'sword-coast',
          features: ['Harbor'],
          tags: ['major'],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'sword-coast',
          name: 'Sword Coast',
          type: 'region',
          status: 'known',
          description: 'Coastal region',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'yawning-portal',
          name: 'Yawning Portal',
          type: 'building',
          status: 'visited',
          description: 'Famous tavern',
          parentId: 'waterdeep',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      mockUseLocationData.mockReturnValue({
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: mockRefreshLocations,
        hasRequiredContext: true,
      });
    });

    test('should retrieve location by ID correctly', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should find existing location
      const location = locationContext.getLocationById('waterdeep');
      expect(location).toEqual(expect.objectContaining({
        id: 'waterdeep',
        name: 'Waterdeep',
        type: 'city'
      }));

      // BEHAVIOR: Should return undefined for non-existent location
      const nonExistent = locationContext.getLocationById('non-existent');
      expect(nonExistent).toBeUndefined();
    });

    test('should filter locations by type correctly', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should filter by location type
      const cities = locationContext.getLocationsByType('city');
      expect(cities).toHaveLength(1);
      expect(cities[0].name).toBe('Waterdeep');

      const regions = locationContext.getLocationsByType('region');
      expect(regions).toHaveLength(1);
      expect(regions[0].name).toBe('Sword Coast');

      const buildings = locationContext.getLocationsByType('building');
      expect(buildings).toHaveLength(1);
      expect(buildings[0].name).toBe('Yawning Portal');

      // BEHAVIOR: Should return empty array for non-matching type
      const dungeons = locationContext.getLocationsByType('dungeon');
      expect(dungeons).toHaveLength(0);
    });

    test('should filter locations by status correctly', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should filter by location status
      const explored = locationContext.getLocationsByStatus('explored');
      expect(explored).toHaveLength(1);
      expect(explored[0].name).toBe('Waterdeep');

      const known = locationContext.getLocationsByStatus('known');
      expect(known).toHaveLength(1);
      expect(known[0].name).toBe('Sword Coast');

      const visited = locationContext.getLocationsByStatus('visited');
      expect(visited).toHaveLength(1);
      expect(visited[0].name).toBe('Yawning Portal');
    });

    test('should handle parent-child location relationships correctly', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should find child locations
      const swordCoastChildren = locationContext.getChildLocations('sword-coast');
      expect(swordCoastChildren).toHaveLength(1);
      expect(swordCoastChildren[0].name).toBe('Waterdeep');

      const waterdeepChildren = locationContext.getChildLocations('waterdeep');
      expect(waterdeepChildren).toHaveLength(1);
      expect(waterdeepChildren[0].name).toBe('Yawning Portal');

      // BEHAVIOR: Should return empty array for locations with no children
      const noChildren = locationContext.getChildLocations('yawning-portal');
      expect(noChildren).toHaveLength(0);

      // BEHAVIOR: Should find parent location
      const waterdeepParent = locationContext.getParentLocation('waterdeep');
      expect(waterdeepParent?.name).toBe('Sword Coast');

      const portalParent = locationContext.getParentLocation('yawning-portal');
      expect(portalParent?.name).toBe('Waterdeep');

      // BEHAVIOR: Should return undefined for root location
      const rootParent = locationContext.getParentLocation('sword-coast');
      expect(rootParent).toBeUndefined();
    });
  });

  describe('Location Update Behavior', () => {
    let mockLocations: Location[];

    beforeEach(() => {
      mockLocations = [
        {
          id: 'test-location',
          name: 'Test Location',
          type: 'city',
          status: 'known',
          description: 'A test location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      // Setup authenticated state
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
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: mockRefreshLocations,
        hasRequiredContext: true,
      });

      mockUpdateData.mockResolvedValue(undefined);
    });

    test('should update location with basic metadata', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const updates = {
        name: 'Updated Location',
        description: 'Updated description',
        status: 'explored' as LocationStatus
      };

      await act(async () => {
        await locationContext.updateLocation('test-location', updates);
      });

      // BEHAVIOR: Should update with basic attribution metadata
      expect(mockUpdateData).toHaveBeenCalledWith(
        'test-location',
        expect.objectContaining({
          ...updates,
          modifiedBy: 'test-user',
          dateModified: expect.any(String)
        })
      );
    });

    test('should reject update for non-existent location', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should reject update for non-existent location
      await expect(locationContext.updateLocation('non-existent', { name: 'Updated' })).rejects.toThrow(
        'Location not found'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });

    test('should update location status correctly', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      await act(async () => {
        await locationContext.updateLocationStatus('test-location', 'explored');
      });

      // BEHAVIOR: Should update status in database
      expect(mockUpdateData).toHaveBeenCalledWith(
        'test-location',
        expect.objectContaining({
          status: 'explored'
        })
      );
    });

    test('should reject status update for non-existent location', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should reject status update for non-existent location
      await expect(locationContext.updateLocationStatus('non-existent', 'explored')).rejects.toThrow(
        'Location not found'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });
  });

  describe('Location Note Management Behavior', () => {
    let mockLocations: Location[];

    beforeEach(() => {
      mockLocations = [
        {
          id: 'test-location',
          name: 'Test Location',
          type: 'city',
          status: 'known',
          description: 'A test location',
          notes: [
            { date: '2025-06-14', text: 'Initial note' }
          ],
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      // Setup authenticated state
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
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: mockRefreshLocations,
        hasRequiredContext: true,
      });

      mockUpdateData.mockResolvedValue(undefined);
    });

    test('should add location note correctly', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const newNote: LocationNote = {
        date: '2025-06-15',
        text: 'New session note'
      };

      await act(async () => {
        await locationContext.updateLocationNote('test-location', newNote);
      });

      // BEHAVIOR: Should add note to existing notes with timestamp
      expect(mockUpdateData).toHaveBeenCalledWith(
        'test-location',
        expect.objectContaining({
          notes: [
            { date: '2025-06-14', text: 'Initial note' },
            { 
              date: expect.any(String), // Should be current timestamp
              text: 'New session note'
            }
          ]
        })
      );
    });

    test('should reject note update for non-existent location', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      const note: LocationNote = {
        date: '2025-06-15',
        text: 'Test note'
      };

      // BEHAVIOR: Should reject note update for non-existent location
      await expect(locationContext.updateLocationNote('non-existent', note)).rejects.toThrow(
        'Location not found'
      );

      expect(mockUpdateData).not.toHaveBeenCalled();
    });
  });

  describe('Location Deletion Behavior', () => {
    let mockLocations: Location[];

    beforeEach(() => {
      mockLocations = [
        {
          id: 'parent-location',
          name: 'Parent Location',
          type: 'region',
          status: 'known',
          description: 'Parent location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'child-location-1',
          name: 'Child Location 1',
          type: 'city',
          status: 'known',
          description: 'Child location 1',
          parentId: 'parent-location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'child-location-2',
          name: 'Child Location 2',
          type: 'town',
          status: 'known',
          description: 'Child location 2',
          parentId: 'parent-location',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        },
        {
          id: 'grandchild-location',
          name: 'Grandchild Location',
          type: 'building',
          status: 'known',
          description: 'Grandchild location',
          parentId: 'child-location-1',
          createdBy: 'test-user',
          createdByUsername: 'Test User',
          dateAdded: '2025-06-15T00:00:00.000Z'
        }
      ];

      // Setup authenticated state
      mockUseAuth.mockReturnValue({
        user: { uid: 'test-user' },
      });

      mockUseGroups.mockReturnValue({
        activeGroupId: 'test-group',
      });

      mockUseCampaigns.mockReturnValue({
        activeCampaignId: 'test-campaign',
      });

      mockUseLocationData.mockReturnValue({
        locations: mockLocations,
        loading: false,
        error: null,
        refreshLocations: mockRefreshLocations,
        hasRequiredContext: true,
      });

      mockDeleteData.mockResolvedValue(undefined);
    });

    test('should delete location and all children', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      await act(async () => {
        await locationContext.deleteLocation('parent-location');
      });

      // BEHAVIOR: Should delete all locations in hierarchy
      expect(mockDeleteData).toHaveBeenCalledTimes(4);
      
      // Should delete all child and parent locations
      expect(mockDeleteData).toHaveBeenCalledWith('grandchild-location');
      expect(mockDeleteData).toHaveBeenCalledWith('child-location-1');
      expect(mockDeleteData).toHaveBeenCalledWith('child-location-2');
      expect(mockDeleteData).toHaveBeenCalledWith('parent-location');
    });

    test('should delete single location with no children', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      await act(async () => {
        await locationContext.deleteLocation('grandchild-location');
      });

      // BEHAVIOR: Should delete only the specified location
      expect(mockDeleteData).toHaveBeenCalledTimes(1);
      expect(mockDeleteData).toHaveBeenCalledWith('grandchild-location');
    });

    test('should reject deletion for non-existent location', async () => {
      renderLocationContext();

      await waitFor(() => {
        expect(locationContext).toBeDefined();
      });

      // BEHAVIOR: Should reject deletion for non-existent location
      await expect(locationContext.deleteLocation('non-existent')).rejects.toThrow(
        'Location not found'
      );

      expect(mockDeleteData).not.toHaveBeenCalled();
    });
  });

  describe('useLocations Hook Behavior', () => {
    test('should throw error when used outside LocationProvider', () => {
      // Create a test component that uses the hook outside of provider
      const TestComponent = () => {
        useLocations();
        return <div>Test</div>;
      };

      // BEHAVIOR: Should throw error when used outside provider
      expect(() => render(<TestComponent />)).toThrow(
        'useLocations must be used within a LocationProvider'
      );
    });
  });
});