// src/pages/locations/LocationCreatePage.tsx
import React, { useEffect } from 'react';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import LocationCreateForm from '../../components/features/locations/LocationCreateForm';
import { useFirebase } from '../../context/FirebaseContext';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

const LocationCreatePage: React.FC = () => {
  const { user } = useFirebase();
  const { navigateToPage } = useNavigation();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigateToPage('/locations');
    }
  }, [user, navigateToPage]);

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