// src/context/LocationContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { Location, LocationStatus, LocationContextValue, LocationNote } from '../types/location';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useAuth, useUser, useGroups, useCampaigns } from './firebase';
import { getUserName, getActiveCharacterName } from '../utils/user-utils';

// Custom event for location changes (deletion, update, etc.)
export const LOCATION_CHANGED_EVENT = 'location-data-changed';

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { items: initialLocations, loading, error, refreshData } = useFirebaseData<Location>({ collection: 'locations' });
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const hasRequiredContext = true; // TODO: Implement proper context checking
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { updateData, deleteData, addData } = useFirebaseData<Location>({ collection: 'locations' });

  // Update locations when initialLocations changes
  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  // Create refresh wrapper
  const refreshLocations = useCallback(async (): Promise<void> => {
    await refreshData();
  }, [refreshData]);

  // Add listener for the custom event
  useEffect(() => {
    const handleLocationChanged = () => {
      refreshLocations();
    };

    window.addEventListener(LOCATION_CHANGED_EVENT, handleLocationChanged);
    return () => {
      window.removeEventListener(LOCATION_CHANGED_EVENT, handleLocationChanged);
    };
  }, [refreshLocations]);

  // Dispatch location changed event
  const dispatchLocationChangedEvent = useCallback(() => {
    const event = new CustomEvent(LOCATION_CHANGED_EVENT);
    window.dispatchEvent(event);
  }, []);

  // Get location by ID
  const getLocationById = useCallback((id: string) => {
    return locations.find(location => location.id === id);
  }, [locations]);

  // Get locations by type
  const getLocationsByType = useCallback((type: string) => {
    return locations.filter(location => location.type === type);
  }, [locations]);

  // Get locations by status
  const getLocationsByStatus = useCallback((status: LocationStatus) => {
    return locations.filter(location => location.status === status);
  }, [locations]);

  // Get all child locations for a parent
  const getChildLocations = useCallback((parentId: string) => {
    return locations.filter(location => location.parentId === parentId);
  }, [locations]);

  // Get parent location for a location
  const getParentLocation = useCallback((locationId: string) => {
    const location = getLocationById(locationId);
    return location?.parentId ? getLocationById(location.parentId) : undefined;
  }, [getLocationById]);

  // Update a location
  const updateLocation = useCallback(async (locationId: string, updatedLocation: Partial<Location>): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to update a location');
    }

    // Get the current location to update
    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Add attribution data
    const updatedData = {
      ...updatedLocation,
      modifiedBy: user.uid,
      modifiedByUsername: getUserName(activeGroupUserProfile),
      modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
      dateModified: new Date().toISOString()
    };

    await updateData(locationId, updatedData);
    
    // Optimistically update the local state
    setLocations(prevLocations => 
      prevLocations.map(loc => 
        loc.id === locationId ? { ...loc, ...updatedData } : loc
      )
    );
    
    // Trigger refresh of locations
    dispatchLocationChangedEvent();
  }, [user, activeGroupId, activeCampaignId, getLocationById, updateData, dispatchLocationChangedEvent]);

  // Update location note
  const updateLocationNote = useCallback(async (locationId: string, note: LocationNote): Promise<void> => {
    if (!user || !userProfile || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to add location notes');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    const updatedLocation = {
      ...location,
      notes: [
        ...(location.notes || []),
        {
          ...note,
          date: new Date().toISOString()
        }
      ]
    };

    await updateData(locationId, updatedLocation);
    
    // Optimistically update the local state
    setLocations(prevLocations => 
      prevLocations.map(loc => 
        loc.id === locationId ? updatedLocation : loc
      )
    );
    
    // Trigger refresh of locations
    dispatchLocationChangedEvent();
  }, [user, userProfile, activeGroupId, activeCampaignId, getLocationById, updateData, dispatchLocationChangedEvent]);

  // Update location status
  const updateLocationStatus = useCallback(async (locationId: string, status: LocationStatus): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to update location status');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    const updatedLocation = {
      ...location,
      status
    };

    await updateData(locationId, updatedLocation);
    
    // Optimistically update the local state
    setLocations(prevLocations => 
      prevLocations.map(loc => 
        loc.id === locationId ? updatedLocation : loc
      )
    );
    
    // Trigger refresh of locations
    dispatchLocationChangedEvent();
  }, [user, activeGroupId, activeCampaignId, getLocationById, updateData, dispatchLocationChangedEvent]);

  // Delete location and all its children
  const deleteLocation = useCallback(async (locationId: string): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to delete a location');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    // Recursively get all child location IDs
    const getAllChildrenIds = (parentId: string): string[] => {
      const directChildren = locations.filter(loc => loc.parentId === parentId);
      return [
        ...directChildren.map(child => child.id),
        ...directChildren.flatMap(child => getAllChildrenIds(child.id))
      ];
    };

    const childrenIds = getAllChildrenIds(locationId);
    
    // Delete all children first
    if (childrenIds.length > 0) {
      await Promise.all(childrenIds.map(id => deleteData(id)));
    }
    
    // Then delete the parent location
    await deleteData(locationId);
    
    // Optimistically update local state by removing deleted locations
    setLocations(prevLocations => 
      prevLocations.filter(loc => 
        loc.id !== locationId && !childrenIds.includes(loc.id)
      )
    );
    
    // Also trigger a full refresh to ensure data consistency
    dispatchLocationChangedEvent();
  }, [user, activeGroupId, activeCampaignId, getLocationById, locations, deleteData, dispatchLocationChangedEvent]);

  // Create a new location
  const createLocation = useCallback(async (locationData: Omit<Location, 'id'>): Promise<string> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to create a location');
    }

    // Generate a location ID from the name
    const locationId = locationData.name.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // Add creation attribution data
    const newLocation = {
      ...locationData,
      id: locationId,
      createdBy: user.uid,
      createdByUsername: getUserName(activeGroupUserProfile),
      createdByCharacterName: getActiveCharacterName(activeGroupUserProfile),
      dateAdded: new Date().toISOString(),
      modifiedBy: user.uid,
      modifiedByUsername: getUserName(activeGroupUserProfile),
      modifiedByCharacterName: getActiveCharacterName(activeGroupUserProfile),
      dateModified: new Date().toISOString()
    } as Location;

    await addData(newLocation, locationId);
    
    // Optimistically update the local state
    setLocations(prevLocations => [...prevLocations, newLocation]);
    
    // Trigger refresh of locations
    dispatchLocationChangedEvent();
    
    return locationId;
  }, [user, activeGroupId, activeCampaignId, addData, dispatchLocationChangedEvent]);

  const value: LocationContextValue = {
    locations,
    isLoading: loading,
    error,
    getLocationById,
    getLocationsByType,
    getLocationsByStatus,
    getChildLocations,
    getParentLocation,
    updateLocation,
    updateLocationNote,
    updateLocationStatus,
    deleteLocation,
    createLocation,
    refreshLocations,
    hasRequiredContext
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocations = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocations must be used within a LocationProvider');
  }
  return context;
};

// Legacy compatibility during transition
export const useLocationData = useLocations;