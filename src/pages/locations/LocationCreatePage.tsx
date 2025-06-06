// src/pages/locations/LocationCreatePage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import LocationCreateForm from '../../components/features/locations/LocationCreateForm';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { ArrowLeft } from 'lucide-react';

const LocationCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate('/locations');
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate('/locations');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: 'Locations', href: '/locations' },
          { label: 'Create' }
        ]}
        className="mb-4"
      />

      <div className="mb-8 flex items-center justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-4"
            onClick={handleCancel}
            startIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Back to {noteId ? 'Note' : 'Locations'}
          </Button>
          <Typography variant="h2">Create New Location</Typography>
        </div>
      </div>

      <LocationCreateForm
        initialData={{ ...initialData, noteId, entityId }}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default LocationCreatePage;