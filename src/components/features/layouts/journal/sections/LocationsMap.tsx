// components/features/layouts/journal/sections/LocationsMap.tsx
import React from 'react';
import { useNavigation } from '../../../../../context/NavigationContext';
import { Location } from '../../../../../types/location';
import { Map, MapPin } from 'lucide-react';
import clsx from 'clsx';

interface LocationsMapProps {
  locations: Location[];
  loading: boolean;
}

/**
 * Displays a styled list of important locations in journal format
 */
const LocationsMap: React.FC<LocationsMapProps> = ({ locations, loading }) => {
  const { navigateToPage } = useNavigation();

  // Sort locations by status (explored first) then by name
  const sortedLocations = [...locations].sort((a, b) => {
    // First, sort by exploration status
    if (a.status !== b.status) {
      if (a.status === 'explored') return 1;
      if (b.status === 'explored') return -1;
      if (a.status === 'visited') return 1;
      if (b.status === 'visited') return -1;
    }
    
    // Then by name
    return a.name.localeCompare(b.name);
  });
  
  // Get location type display name
  const getLocationType = (type: string): string => {
    const typeMap: Record<string, string> = {
      region: 'Region',
      city: 'City',
      town: 'Town',
      village: 'Village',
      dungeon: 'Dungeon',
      landmark: 'Landmark',
      building: 'Building',
      poi: 'Point of Interest'
    };
    
    return typeMap[type] || 'Location';
  };
  
  // Get status display
  const getStatusDisplay = (status: string): string => {
    const statusMap: Record<string, string> = {
      explored: 'Explored',
      visited: 'Visited',
      known: 'Known'
    };
    
    return statusMap[status] || 'Unexplored';
  };
  
  // Handle location click
  const handleLocationClick = (locationId: string) => {
    navigateToPage(`/locations?highlight=${locationId}`);
  };

  return (
    <div className="relative journal-section">
      <h3 className="text-lg font-medium mb-3 journal-heading">
        Key Locations ({loading ? '...' : locations.length})
      </h3>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className="h-10 rounded journal-loading"
            ></div>
          ))}
        </div>
      ) : sortedLocations.length === 0 ? (
        <div className="text-center py-4 journal-empty">
          <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm italic">No locations discovered yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedLocations.slice(0, 5).map(location => (
            <div
              key={location.id}
              onClick={() => handleLocationClick(location.id)}
              className="p-2 rounded cursor-pointer transition-transform hover:scale-[1.01]"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <MapPin size={16} />
                  </div>
                  
                  <div>
                    <span className="text-sm font-medium">
                      {location.name}
                    </span>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className={clsx(
                        `location-type-${location.type || 'poi'}`
                      )}>
                        {getLocationType(location.type || 'poi')}
                      </span>
                      
                      <span className={clsx(
                        `location-status-${location.status || 'known'}`
                      )}>
                        • {getStatusDisplay(location.status || 'known')}
                      </span>
                    </div>
                    
                    {location.description && (
                      <p className="text-xs mt-1 line-clamp-1 typography-secondary">
                        {location.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {sortedLocations.length > 5 && (
            <div className="text-right text-xs italic journal-more-note">
              ...and {sortedLocations.length - 5} more locations
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationsMap;