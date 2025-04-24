// src/pages/locations/LocationsPage.tsx
import React, { useState, useMemo } from 'react';
import Typography from '../../components/core/Typography';
import Card from '../../components/core/Card';
import LocationDirectory from '../../components/features/locations/LocationDirectory';
import { useAuth } from '../../context/firebase';
import { useLocations } from '../../context/LocationContext';
import { Map, MapPin, Eye, EyeOff, Plus } from 'lucide-react';
import Button from '../../components/core/Button';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../themes/ThemeContext';
import clsx from 'clsx';

const LocationsPage: React.FC = () => {
  // Auth state
  const { user } = useAuth();
  const { 
    locations, 
    isLoading, 
    error, 
    hasRequiredContext 
  } = useLocations();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  const { navigateToPage } = useNavigation();
  
  // Calculate statistics
  const stats = useMemo(() => ({
    total: locations.length,
    visited: locations.filter(loc => loc.status === 'visited').length,
    explored: locations.filter(loc => loc.status === 'explored').length,
    known: locations.filter(loc => loc.status === 'known').length
  }), [locations]);

  // Handle create new location
  const handleCreateLocation = () => {
    navigateToPage('/locations/create');
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <Card.Content className="text-center py-8">
            <div className={clsx(
              "animate-spin w-8 h-8 border-4 rounded-full mx-auto mb-4",
              `${themePrefix}-spinner-border`
            )} />
            <Typography>Loading locations...</Typography>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
            <Typography color="error">
              Error Loading Locations. Sign in to view content.
            </Typography>
        </Card>
      </div>
    );
  }

  if (!hasRequiredContext) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <Card.Content className="text-center py-8">
            <Typography variant="h3" className="mb-4">
              No Active Group or Campaign
            </Typography>
            <Typography color="secondary" className="mb-4">
              Please select a group and campaign to view locations.
            </Typography>
            {user && (
              <Button
                onClick={() => { /* Open group/campaign selector */ }}
              >
                Select Group & Campaign
              </Button>
            )}
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Typography variant="h1" className="mb-2">
            Locations
          </Typography>
          <Typography color="secondary">
            Explore and track the places you've discovered in your adventures
          </Typography>
        </div>

        {/* Auth actions */}
        <div className="flex gap-2">
          {user && hasRequiredContext && (
            <Button
              onClick={handleCreateLocation}
              startIcon={<Plus className="w-5 h-5" />}
            >
              Add Location
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Map className={clsx("w-8 h-8 mr-4", `${themePrefix}-location-type-region`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.total}
              </Typography>
              <Typography color="secondary">
                Total Locations
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Eye className={clsx("w-8 h-8 mr-4", `${themePrefix}-location-status-explored`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.explored}
              </Typography>
              <Typography color="secondary">
                Explored
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <MapPin className={clsx("w-8 h-8 mr-4", `${themePrefix}-location-status-visited`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.visited}
              </Typography>
              <Typography color="secondary">
                Visited
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <EyeOff className={clsx("w-8 h-8 mr-4", `${themePrefix}-location-status-known`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.known}
              </Typography>
              <Typography color="secondary">
                Known
              </Typography>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* Location Directory */}
      <LocationDirectory 
        locations={locations || []} // Provide empty array as fallback
        isLoading={isLoading}
      />
    </div>
  );
};

export default LocationsPage;