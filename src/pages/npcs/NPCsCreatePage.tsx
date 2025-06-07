// src/pages/npcs/NPCsCreatePage.tsx
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import NPCForm from '../../components/features/npcs/NPCForm';
import Breadcrumb from '../../components/layout/Breadcrumb';
import { useNPCs } from '../../context/NPCContext';
import { ArrowLeft } from 'lucide-react';

const NPCsCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { npcs } = useNPCs();
  
  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate('/npcs');
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate('/npcs');
    }
  };

  // Prepare initial data for NPCForm
  const formInitialData = initialData ? {
    ...initialData,
    noteId,
    entityId
  } : undefined;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: 'NPCs', href: '/npcs' },
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
            Back to {noteId ? 'Note' : 'NPCs'}
          </Button>
          <Typography variant="h2">Create New NPC</Typography>
        </div>
      </div>

      <NPCForm
        initialData={formInitialData}
        onSuccess={handleSuccess}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default NPCsCreatePage;