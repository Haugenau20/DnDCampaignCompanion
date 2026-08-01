// src/pages/rumors/RumorsPage.tsx
import React from 'react';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { RumorDirectory, useRumors } from 'features/campaign-entities';
import { useAuth } from 'features/user-management';
import { useNavigation } from 'shared/hooks/useNavigation';
import {
  Loader2,
  Plus
} from 'lucide-react';

const RumorsPage: React.FC = () => {
  // Auth state
  const { user } = useAuth();
  const { rumors, isLoading, error } = useRumors();
  const { navigateToPage } = useNavigation();

  // Handle create new rumor
  const handleCreateRumor = () => {
    navigateToPage('/rumors/create');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading rumors...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <Typography color="error">
            Error Loading Rumors. Sign in to view content.
          </Typography>
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
            Rumors
          </Typography>
          <Typography color="secondary">
            Track and investigate rumors from across the realm
          </Typography>
        </div>

        {/* Auth actions */}
        <div className="flex gap-2">
          {user && (
            <Button
              onClick={handleCreateRumor}
              startIcon={<Plus className="w-5 h-5" />}
            >
              Add Rumor
            </Button>
          )}
        </div>
      </div>

      {/* Rumor Directory */}
      <RumorDirectory
        rumors={rumors}
        isLoading={isLoading}
      />
    </div>
  );
};

export default RumorsPage;