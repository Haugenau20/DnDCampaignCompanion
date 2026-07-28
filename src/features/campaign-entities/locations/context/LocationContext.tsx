// src/features/campaign-entities/locations/context/LocationContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { Location, LocationStatus, LocationContextValue, LocationNote } from '../types';
import { DomainData } from 'core/types/common';
import { useLocationData } from '../hooks/useLocationData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { useAuth, useUser, useGroups, useCampaigns } from 'features/user-management';

// Custom event for location changes (deletion, update, etc.)
export const LOCATION_CHANGED_EVENT = 'location-data-changed';

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locations: initialLocations, loading, error, refreshLocations, hasRequiredContext } = useLocationData();
  const [locations, setLocations] = useState<Location[]>(initialLocations);
  const { user } = useAuth();
  const { userProfile, activeGroupUserProfile } = useUser();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { updateData, deleteData, addData } = useFirebaseData<Location>({ collection: 'locations' });

  // Update locations when initialLocations changes
  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

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

    const updatedData = {
      ...updatedLocation
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

    // Recursively get all child location IDs in depth-first post-order: for each
    // direct child, its own descendants come first, then the child itself. This
    // guarantees deepest-first ordering so referential integrity is preserved when
    // the IDs are deleted in sequence below (parent is never removed before any of
    // its descendants).
    const getAllChildrenIds = (parentId: string): string[] => {
      const directChildren = locations.filter(loc => loc.parentId === parentId);
      return directChildren.flatMap(child => [
        ...getAllChildrenIds(child.id),
        child.id
      ]);
    };

    const childrenIds = getAllChildrenIds(locationId);

    // Delete all children first, sequentially and in depth-first order. Sequential
    // (rather than Promise.all) execution is required here: it is the only way to
    // guarantee descendants are actually removed from the database before their
    // ancestors. This trades throughput (N round trips instead of one batch) for
    // that guarantee — for deep or wide location trees this is slower than the
    // previous parallel deletion, but ordering is the point of the fix.
    for (const id of childrenIds) {
      await deleteData(id);
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
  const createLocation = useCallback(async (locationData: DomainData<Location>): Promise<string> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to create a location');
    }

    // Generate a location ID from the name
    const locationId = locationData.name.toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    // `addData` itself no longer needs a full Location (see DomainData in
    // core/types/common.ts), but this same object is also appended directly to
    // this context's own `locations` state below, which IS what renders --
    // unlike the dead `data` state inside useFirebaseData's addData. `Location[]`
    // requires the full BaseContent attribution fields, which this optimistic
    // entry genuinely does not have until the next refresh, so the cast stays
    // load-bearing here (pre-existing behaviour, not introduced by this change).
    const newLocation = {
      ...locationData,
      id: locationId
    } as Location;

    await addData(newLocation, locationId);

    setLocations(prevLocations => [...prevLocations, newLocation]);

    dispatchLocationChangedEvent();

    return locationId;
  }, [user, activeGroupId, activeCampaignId, activeGroupUserProfile, addData, dispatchLocationChangedEvent]);

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