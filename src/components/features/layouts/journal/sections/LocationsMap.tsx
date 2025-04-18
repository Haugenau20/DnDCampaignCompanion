// components/features/layouts/journal/sections/LocationsMap.tsx
import React from 'react';
import { useTheme } from '../../../../../context/ThemeContext';
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
  const { theme } = useTheme();
  const { navigateToPage } = useNavigation();
  const themePrefix = theme.name;

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
    <div className={clsx(
      "relative",
      `${themePrefix}-journal-section`
    )}>
      <h3 className={clsx(
        "text-lg font-medium mb-3",
        `${themePrefix}-journal-heading`
      )}>
        Key Locations ({loading ? '...' : locations.length})
      </h3>

      {loading ? (
        <div className="space-y-2 animate-pulse">
          {[1, 2, 3].map(i => (
            <div 
              key={i}
              className={clsx(
                "h-10 rounded",
                `${themePrefix}-journal-loading`
              )}
            ></div>
          ))}
        </div>
      ) : sortedLocations.length === 0 ? (
        <div className={clsx(
          "text-center py-4",
          `${themePrefix}-journal-empty`
        )}>
          <Map className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm italic">No locations discovered yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sortedLocations.slice(0, 5).map(location => (
            <div
              key={location.id}
              onClick={() => handleLocationClick(location.id)}
              className={clsx(
                "p-2 rounded cursor-pointer transition-transform hover:scale-[1.01]",
                `${themePrefix}-journal-location-item`,
                location.status === 'explored' && `${themePrefix}-journal-location-explored`,
                location.status === 'visited' && `${themePrefix}-journal-location-visited`,
                location.status === 'known' && `${themePrefix}-journal-location-known`
              )}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-2">
                  <div className="mt-0.5">
                    <MapPin size={16} />
                  </div>
                  
                  <div>
                    <span className={clsx(
                      "text-sm font-medium",
                      `${themePrefix}-journal-location-name`
                    )}>
                      {location.name}
                    </span>
                    
                    <div className="flex items-center gap-2 text-xs">
                      <span className={clsx(
                        `${themePrefix}-location-type-${location.type || 'poi'}`
                      )}>
                        {getLocationType(location.type || 'poi')}
                      </span>
                      
                      <span className={clsx(
                        `${themePrefix}-location-status-${location.status || 'known'}`
                      )}>
                        • {getStatusDisplay(location.status || 'known')}
                      </span>
                    </div>
                    
                    {location.description && (
                      <p className={clsx(
                        "text-xs mt-1 line-clamp-1",
                        `${themePrefix}-typography-secondary`
                      )}>
                        {location.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {sortedLocations.length > 5 && (
            <div className={clsx(
              "text-right text-xs italic",
              `${themePrefix}-journal-more-note`
            )}>
              ...and {sortedLocations.length - 5} more locations
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocationsMap;