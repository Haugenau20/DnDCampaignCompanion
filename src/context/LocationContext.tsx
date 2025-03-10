// src/context/LocationContext.tsx
import React, { createContext, useContext, useCallback } from 'react';
import { Location, LocationStatus, LocationContextValue, LocationNote } from '../types/location';
import { useLocationData } from '../hooks/useLocationData';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { useFirebase } from './FirebaseContext';

const LocationContext = createContext<LocationContextValue | undefined>(undefined);

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locations, loading, error } = useLocationData();
  const { user, userProfile } = useFirebase();
  const { updateData } = useFirebaseData<Location>({ collection: 'locations' });

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

  // Update location note
  const updateLocationNote = useCallback(async (locationId: string, note: LocationNote) => {
    if (!user || !userProfile) {
      throw new Error('User must be authenticated to add location notes');
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
  }, [user, userProfile, getLocationById, updateData]);

  // Update location status
  const updateLocationStatus = useCallback(async (locationId: string, status: LocationStatus) => {
    if (!user) {
      throw new Error('User must be authenticated to update location status');
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
  }, [user, getLocationById, updateData]);

  const value: LocationContextValue = {
    locations,
    isLoading: loading,
    error,
    getLocationById,
    getLocationsByType,
    getLocationsByStatus,
    getChildLocations,
    getParentLocation,
    updateLocationNote,
    updateLocationStatus
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