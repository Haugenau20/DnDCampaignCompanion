// src/features/campaign-entities/locations/context/LocationContext.tsx
import React, { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { Location, LocationStatus, LocationContextValue, LocationNote, LocationChildStrategy } from '../types';
import { descendantIdsDeepestFirst, wouldCreateCycle } from '../utils/location-tree';
import { DomainData } from 'core/types/common';
import { useLocationData } from '../hooks/useLocationData';
import { useFirebaseData } from 'shared/hooks/useFirebaseData';
import { toNoteDate } from 'shared/utils/dateFormatter';
import { useAuth, useUser, useGroups, useCampaigns } from 'features/user-management';
import { generateUniqueEntityId } from 'core/utils/entity-id';

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
  // `autoFetch: false` because nothing renders off this instance's `data`:
  // the list comes from `useLocationData()` above. Its `error` is bound as
  // `writeError` so write failures are not conflated with read failures
  // (bug #1401).
  const { updateData, deleteData, addData, error: writeError } = useFirebaseData<Location>({
    collection: 'locations',
    autoFetch: false
  });

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
          date: toNoteDate()
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

  /**
   * Move a location under a new parent.
   *
   * The write the whole cycle guard exists for. Nothing in the product could
   * choose a parent before `15-4`, so `PERF-11`'s unterminating walks needed
   * hand-edited data to reach; *Move elsewhere* makes them one click away. The
   * tray refuses to offer self or a descendant and this refuses to write one,
   * because the two failures have very different blast radii: an unofferable
   * choice is a UI gap, a written cycle is a campaign nobody can open.
   */
  const moveLocation = useCallback(async (
    locationId: string,
    nextParentId: string | undefined
  ): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to move a location');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    if (wouldCreateCycle(locations, locationId, nextParentId)) {
      const parent = nextParentId ? getLocationById(nextParentId) : undefined;
      throw new Error(
        nextParentId === locationId
          ? `${location.name} cannot be inside itself.`
          : `${parent?.name ?? 'That place'} is already inside ${location.name}.`
      );
    }

    // '' rather than `undefined`: Firestore rejects `undefined`, and it is what
    // both the form and quick add already write for "no parent".
    await updateLocation(locationId, { parentId: nextParentId ?? '' });
  }, [user, activeGroupId, activeCampaignId, getLocationById, locations, updateLocation]);

  /**
   * Delete a location, and say what happens to the places inside it.
   *
   * §6.2: **never orphan, never decide silently.** `promote-to-grandparent`
   * moves the direct children up one level -- to this location's own parent, or
   * to the top level when it had none -- before the record goes; each child's
   * own subtree travels with it untouched, because only the edge that pointed
   * at the deleted location is broken.
   *
   * `delete-subtree` stays the default only because it is what every caller
   * written before this question existed already does. Every caller that asks
   * passes a strategy explicitly.
   */
  const deleteLocation = useCallback(async (
    locationId: string,
    childStrategy: LocationChildStrategy = 'delete-subtree'
  ): Promise<void> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to delete a location');
    }

    const location = getLocationById(locationId);
    if (!location) {
      throw new Error('Location not found');
    }

    if (childStrategy === 'promote-to-grandparent') {
      const grandparentId = location.parentId || '';
      const directChildren = locations.filter(loc => loc.parentId === locationId);

      // The children are re-homed *before* the parent goes. The other order
      // leaves a window in which a reader loading the campaign sees children
      // pointing at an id that no longer resolves -- the dangling-parent state
      // #303 catalogued, created deliberately by the fix for orphaning.
      for (const child of directChildren) {
        await updateData(child.id, { parentId: grandparentId });
      }

      await deleteData(locationId);

      setLocations(prevLocations =>
        prevLocations
          .filter(loc => loc.id !== locationId)
          .map(loc =>
            loc.parentId === locationId ? { ...loc, parentId: grandparentId } : loc
          )
      );

      dispatchLocationChangedEvent();
      return;
    }

    // Every descendant, deepest first: the ordering bug #010 was filed about,
    // unchanged. What changed is that the walk now carries a visited set and a
    // depth cap -- the recursion it replaces had neither, so a parent cycle
    // meant deleting a location never returned.
    const childrenIds = descendantIdsDeepestFirst(locations, locationId);

    // Sequential (rather than Promise.all) execution is required here: it is the
    // only way to guarantee descendants are actually removed from the database
    // before their ancestors. This trades throughput (N round trips instead of
    // one batch) for that guarantee.
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
  }, [user, activeGroupId, activeCampaignId, getLocationById, locations, deleteData, updateData, dispatchLocationChangedEvent]);

  // Ids issued during this session but not yet reflected in `locations`
  // (local state). Two locations can be created back-to-back within a single
  // `act()` / event handler before the first create's `setLocations` update
  // has committed and re-rendered this provider -- a collision check against
  // `getLocationById` alone would miss that first id and silently let the
  // second create overwrite it. This ref is the second source of truth
  // `isTaken` below consults, alongside already-loaded/local state.
  const issuedIds = useRef<Set<string>>(new Set());

  // Create a new location
  const createLocation = useCallback(async (locationData: DomainData<Location>): Promise<string> => {
    if (!user || !activeGroupId || !activeCampaignId) {
      throw new Error('User must be authenticated and group/campaign context must be set to create a location');
    }

    // Generate a location ID from the name, disambiguating only on collision
    const isTaken = (candidateId: string) =>
      issuedIds.current.has(candidateId) || Boolean(getLocationById(candidateId));

    const locationId = generateUniqueEntityId(locationData.name, isTaken);
    issuedIds.current.add(locationId);

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
  }, [user, activeGroupId, activeCampaignId, activeGroupUserProfile, getLocationById, addData, dispatchLocationChangedEvent]);

  const value: LocationContextValue = {
    locations,
    isLoading: loading,
    // Trailing `|| null` normalizes the type. The real `useFirebaseData` declares
    // `useState<string | null>(null)`, so `writeError` is never `undefined` in
    // production -- but suites that mock the hook return an object with no `error`
    // key at all, which makes this expression `undefined` and violates the
    // `string | null` contract consumers rely on. Cheap to keep, and it means the
    // contract holds regardless of how the hook is supplied.
    error: error || writeError || null,
    getLocationById,
    getLocationsByType,
    getLocationsByStatus,
    getChildLocations,
    getParentLocation,
    updateLocation,
    moveLocation,
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