import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useLocation as useRouterLocation } from 'react-router-dom';
import { Location } from '../../../types/location';
import LocationCard from './LocationCard';
import Card from '../../core/Card';
import Typography from '../../core/Typography';
import Input from '../../core/Input';
import { Search, MapPin, Building } from 'lucide-react';
import { useFirebaseData } from '../../../hooks/useFirebaseData';
import { useNavigation } from '../../../context/NavigationContext';
import clsx from 'clsx';

interface LocationDirectoryProps {
  locations: Location[];
  isLoading?: boolean;
}

export const LocationDirectory: React.FC<LocationDirectoryProps> = ({ 
  locations: initialLocations,
  isLoading = false 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [highlightedLocationId, setHighlightedLocationId] = useState<string | null>(null);
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  // Use Firebase hook for real-time updates
  const { data: updatedLocations } = useFirebaseData<Location>({
    collection: 'locations'
  });

  // Get URL search params for highlighted location
  // Use the most up-to-date data
  const locations = updatedLocations.length > 0 ? updatedLocations : initialLocations;
  const { getCurrentQueryParams } = useNavigation();
  const { highlight: highlightId } = getCurrentQueryParams();

  // Group locations by parent to create hierarchy
  const locationHierarchy = useMemo(() => {
    return locations.reduce((acc, location) => {
      const parentId = location.parentId || 'root';
      if (!acc[parentId]) {
        acc[parentId] = [];
      }
      acc[parentId].push(location);
      return acc;
    }, {} as Record<string, Location[]>);
  }, [locations]);

  // Helper function to get parent location IDs
  const getParentLocationIds = useCallback((locationId: string): string[] => {
    const parentIds: string[] = [];
    let currentLocation = locations.find(loc => loc.id === locationId);
    
    while (currentLocation?.parentId) {
      parentIds.push(currentLocation.parentId);
      currentLocation = locations.find(loc => loc.id === currentLocation?.parentId);
    }
    
    return parentIds;
  }, [locations]);

  // Handle highlighted location from URL
  useEffect(() => {
    if (highlightId) {
      const highlightedLocation = locations.find(loc => 
        loc.id === highlightId || 
        loc.name.toLowerCase() === highlightId.toLowerCase()
      );

      if (highlightedLocation) {
        setHighlightedLocationId(highlightedLocation.id);
        
        // Get and expand all parent locations
        const parentIds = getParentLocationIds(highlightedLocation.id);
        setExpandedLocations(prev => new Set([...prev, ...parentIds]));
        
        // Scroll to the highlighted location
        setTimeout(() => {
          const element = document.getElementById(`location-${highlightedLocation.id}`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
      }
    }
  }, [highlightId, locations, getParentLocationIds]);

  // Toggle expansion state without losing previous state
  const toggleExpansion = (locationId: string) => {
    setExpandedLocations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(locationId)) {
        newSet.delete(locationId);
      } else {
        newSet.add(locationId);
      }
      return newSet;
    });
  };

  // Helper function to check if a location or its children match filters
  const locationMatchesFilters = useCallback((
    loc: Location,
    locationHierarchy: Record<string, Location[]>,
    statusFilter: string,
    typeFilter: string,
    searchQuery: string,
    isChild: boolean = false
  ): boolean => {
    const matchesStatus = statusFilter === 'all' || loc.status === statusFilter;
    const matchesType = typeFilter === 'all' || loc.type === typeFilter;
    const matchesSearch = !searchQuery || 
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      loc.type.toLowerCase().includes(searchQuery.toLowerCase());

    // If this is a child location and the parent matches type filter,
    // only check status and search
    if (isChild) {
      return matchesStatus && matchesSearch;
    }

    // Check if the location itself matches all criteria
    if (matchesStatus && matchesType && matchesSearch) {
      return true;
    }

    // If it's a parent location, check if any children match
    // but only if this location doesn't match the current filter
    const children = locationHierarchy[loc.id] || [];
    return children.some(child => 
      locationMatchesFilters(child, locationHierarchy, statusFilter, typeFilter, searchQuery, false)
    );
  }, []);

  // Update locations based on filters
  useEffect(() => {
    // Only auto-expand when specific filters are applied
    if (typeFilter === 'all' && statusFilter === 'all' && !searchQuery) {
      return;
    }

    const locationsToExpand = new Set<string>();

    // Function to find and add all parent IDs of matching locations
    const addParentIdsForMatches = (parentId: string = 'root') => {
      const children = locationHierarchy[parentId] || [];
      
      children.forEach(child => {
        if (locationMatchesFilters(child, locationHierarchy, statusFilter, typeFilter, searchQuery)) {
          // Add all parent IDs up to the root
          const parentIds = getParentLocationIds(child.id);
          parentIds.forEach(id => locationsToExpand.add(id));
        }
        // Recursively check children
        addParentIdsForMatches(child.id);
      });
    };

    addParentIdsForMatches();
    setExpandedLocations(prev => new Set([...prev, ...locationsToExpand]));
  }, [typeFilter, statusFilter, searchQuery, locations, locationHierarchy, locationMatchesFilters, getParentLocationIds]);

  // Recursive function to render location hierarchy
  const renderLocationHierarchy = (parentId: string = 'root', level: number = 0) => {
    const childLocations = locationHierarchy[parentId] || [];

    const filteredChildLocations = childLocations.filter(location => {
      // If parent location exists and matches type filter, show all children
      const parentLocation = locations.find(loc => loc.id === parentId);
      if (parentLocation && (typeFilter === 'all' || parentLocation.type === typeFilter)) {
        return locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, true);
      }
      // Otherwise, apply regular filtering
      return locationMatchesFilters(location, locationHierarchy, statusFilter, typeFilter, searchQuery, false);
    });

    if (filteredChildLocations.length === 0) {
      return null;
    }

    return (
      <div className="space-y-6">
        {filteredChildLocations.map(location => {
          const hasChildren = locationHierarchy[location.id]?.length > 0;
          const isExpanded = expandedLocations.has(location.id);

          return (
            <div key={location.id} className="relative">
              {/* Connection lines for hierarchy */}
              {level > 0 && (
                <>
                  <div 
                    className="absolute border-l-2 divider" 
                    style={{ 
                      left: `${level}rem`,
                      top: '0',
                      bottom: '0',
                      marginLeft: '-1px'
                    }}
                  />
                  <div 
                    className="absolute border-t-2 divider"
                    style={{ 
                      left: `${level}rem`,
                      width: '1rem',
                      top: '1.5rem',
                      marginLeft: '-1px'
                    }}
                  />
                </>
              )}
              <div style={{ marginLeft: level > 0 ? `${level * 2}rem` : '0' }}>
                <div
                  id={`location-${location.id}`}
                  className={clsx(
                    "transition-all duration-300",
                    highlightedLocationId === location.id && `highlighted-item`
                  )}
                >
                  <LocationCard 
                    location={location}
                    hasChildren={hasChildren}
                    isExpanded={isExpanded}
                    onToggleExpand={() => toggleExpansion(location.id)}
                  />
                </div>
              </div>
              {/* Render children if expanded */}
              {isExpanded && (
                <div className="mt-6">
                  {renderLocationHierarchy(location.id, level + 1)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <Card.Content>
          <Typography>Loading locations...</Typography>
        </Card.Content>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <Card>
        <Card.Content className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <Input
                placeholder="Search locations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                startIcon={<Search className="typography-secondary" />}
                fullWidth
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Building size={20} className="typography-secondary" />
              <select
                className="rounded p-2 input"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="region">Regions</option>
                <option value="city">Cities</option>
                <option value="town">Towns</option>
                <option value="village">Villages</option>
                <option value="dungeon">Dungeons</option>
                <option value="landmark">Landmarks</option>
                <option value="building">Buildings</option>
                <option value="poi">Points of Interest</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <MapPin size={20} className="typography-secondary" />
              <select
                className="rounded p-2 input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="known">Known</option>
                <option value="explored">Explored</option>
                <option value="visited">Visited</option>
              </select>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Location List */}
      {renderLocationHierarchy()}

      {/* Empty State */}
      {!renderLocationHierarchy() && (
        <Card>
          <Card.Content className="text-center py-8">
            <MapPin className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h3" className="mb-2">
              No Locations Found
            </Typography>
            <Typography color="secondary">
              {searchQuery
                ? 'No locations match your search criteria'
                : 'There are no locations to display'}
            </Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default LocationDirectory;