// src/pages/quests/QuestsPage.tsx
import React from 'react';
import Typography from '../../core/components/Typography';
import Card from '../../core/components/Card';
import Button from '../../core/components/Button';
import { QuestDirectory, useQuests } from 'features/campaign-entities';
import { useAuth, useGroups, useCampaigns } from 'features/user-management';
import { useNavigation } from 'shared/hooks/useNavigation';
import { Loader2, Plus, AlertCircle } from 'lucide-react';

const QuestsPage: React.FC = () => {
  // Auth state
  const { user } = useAuth();
  const { navigateToPage } = useNavigation();

  // Group and campaign context
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();

  // Get quests data
  const { quests, loading, error } = useQuests();

  // Show context selection message if needed
  if (!activeGroupId || !activeCampaignId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8 max-w-md">
          <Card.Content className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h3" className="mb-2">
              {!activeGroupId
                ? "No Group Selected"
                : "No Campaign Selected"}
            </Typography>
            <Typography color="secondary" className="mb-6">
              {!activeGroupId
                ? "Please select a group to view quests."
                : "Please select a campaign within your group to view quests."}
            </Typography>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading quests...</Typography>
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
            Error Loading Quests. Sign in to view content.
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <Typography variant="h1" className="mb-2">
            Campaign Quests
          </Typography>
          <Typography color="secondary">
            Track your party's epic adventures and missions
          </Typography>
        </div>

        {/* Auth actions */}
        <div className="flex gap-2">
          {user && (
            <Button
              onClick={() => navigateToPage('/quests/create')}
              startIcon={<Plus className="w-5 h-5" />}
            >
              Create Quest
            </Button>
          )}
        </div>
      </div>

      {/* Quest Directory */}
      <QuestDirectory
        quests={quests}
        isLoading={loading}
      />
    </div>
  );
};

export default QuestsPage;
