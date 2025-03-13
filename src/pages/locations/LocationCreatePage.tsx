// src/pages/locations/LocationCreatePage.tsx
import React, { useEffect } from 'react';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import LocationCreateForm from '../../components/features/locations/LocationCreateForm';
import { useAuth, useGroups, useCampaigns } from '../../context/firebase';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';

const LocationCreatePage: React.FC = () => {
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { navigateToPage } = useNavigation();
  
  // Check if we have required context
  const hasRequiredContext = !!activeGroupId && !!activeCampaignId;
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigateToPage('/locations');
    }
  }, [user, navigateToPage]);

  if (!hasRequiredContext) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Card>
          <Card.Content className="text-center py-8">
            <Typography variant="h3" className="mb-4">
              No Active Group or Campaign
            </Typography>
            <Typography color="secondary" className="mb-4">
              Please select a group and campaign to create a location.
            </Typography>
            <Button
              variant="ghost"
              onClick={() => navigateToPage('/locations')}
              startIcon={<ArrowLeft />}
            >
              Back to Locations
            </Button>
          </Card.Content>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigateToPage('/locations')}
          startIcon={<ArrowLeft />}
        >
          Back to Locations
        </Button>
        <Typography variant="h1">Create New Location</Typography>
      </div>

      <LocationCreateForm
        onSuccess={() => navigateToPage('/locations')}
        onCancel={() => navigateToPage('/locations')}
      />
    </div>
  );
};

export default LocationCreatePage;