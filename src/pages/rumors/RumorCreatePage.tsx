// src/pages/rumors/RumorCreatePage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import { RumorForm } from 'features/campaign-entities';
import Breadcrumb from 'shared/components/Breadcrumb';
import { ArrowLeft } from 'lucide-react';

const RumorCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate('/rumors');
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate('/rumors');
    }
  };

  // Convert initialData to proper format for RumorForm
  const formInitialData = initialData ? {
    title: initialData.title || '',
    content: initialData.description || '', // Use description as content
    noteId,
    entityId
  } : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: 'Rumors', href: '/rumors' },
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
            Back to {noteId ? 'Note' : 'Rumors'}
          </Button>
          <Typography variant="h2">Create New Rumor</Typography>
        </div>
      </div>

      <RumorForm
        initialData={formInitialData}
        title="Create Rumor"
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default RumorCreatePage;