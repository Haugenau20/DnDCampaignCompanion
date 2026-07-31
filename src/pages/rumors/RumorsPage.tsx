// src/pages/rumors/RumorsPage.tsx
import React, { useMemo } from 'react';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { RumorDirectory, useRumors } from 'features/campaign-entities';
import { useAuth } from 'features/user-management';
import { useNavigation } from 'shared/hooks/useNavigation';
import {
  MessageSquare,
  XCircle,
  HelpCircle,
  Loader2,
  Plus,
  CheckCircle2
} from 'lucide-react';

const RumorsPage: React.FC = () => {
  // Auth state
  const { user } = useAuth();
  const { rumors, isLoading, error } = useRumors();
  const { navigateToPage } = useNavigation();

  // Calculate statistics
  const stats = useMemo(() => ({
    total: rumors.length,
    confirmed: rumors.filter(rumor => rumor.status === 'confirmed').length,
    unconfirmed: rumors.filter(rumor => rumor.status === 'unconfirmed').length,
    false: rumors.filter(rumor => rumor.status === 'false').length
  }), [rumors]);

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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <MessageSquare className="w-8 h-8 mr-4 status-general" />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.total}
              </Typography>
              <Typography color="secondary">
                Total Rumors
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <CheckCircle2 className="w-8 h-8 mr-4 rumor-status-confirmed" />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.confirmed}
              </Typography>
              <Typography color="secondary">
                Confirmed
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <HelpCircle className="w-8 h-8 mr-4 rumor-status-unconfirmed" />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.unconfirmed}
              </Typography>
              <Typography color="secondary">
                Unconfirmed
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <XCircle className="w-8 h-8 mr-4 rumor-status-false" />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.false}
              </Typography>
              <Typography color="secondary">
                False
              </Typography>
            </div>
          </Card.Content>
        </Card>
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