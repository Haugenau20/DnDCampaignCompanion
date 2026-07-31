// src/pages/locations/LocationsPage.tsx
import React from 'react';
import Typography from '../../core/components/Typography';
import Card from '../../core/components/Card';
import { useAuth } from 'features/user-management';
import { useLocations, LocationDirectory } from 'features/campaign-entities';
import { Plus } from 'lucide-react';
import Button from '../../core/components/Button';
import { useNavigation } from 'shared/context/NavigationContext';

const LocationsPage: React.FC = () => {
  // Auth state
  const { user } = useAuth();
  const {
    locations,
    isLoading,
    error,
    hasRequiredContext
  } = useLocations();

  const { navigateToPage } = useNavigation();

  // Handle create new location
  const handleCreateLocation = () => {
    navigateToPage('/locations/create');
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <Card.Content className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 rounded-full mx-auto mb-4 spinner-border" />
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

      {/* Location Directory */}
      <LocationDirectory 
        locations={locations || []} // Provide empty array as fallback
        isLoading={isLoading}
      />
    </div>
  );
};

export default LocationsPage;