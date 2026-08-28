import React, { useMemo } from 'react';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { NPCDirectory, useNPCData } from 'features/campaign-entities';
import { useAuth } from 'features/user-management';
import { useCampaignContextStatus } from 'shared/hooks/useCampaignContextStatus';
import { useNavigation } from 'shared/context/NavigationContext';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

const NPCsPage: React.FC = () => {
  // Hooks
  const { user } = useAuth();
  const { npcs, loading, error, refreshNPCs } = useNPCData();
  // Single shared source of truth for "still resolving vs. genuinely no
  // selection" (bug #1413) -- see the hook's doc comment. `loading` above
  // already has auth/group/campaign restoration folded in, so this can't
  // fire while a real selection is still being restored on page load.
  const { missingContext } = useCampaignContextStatus();
  const { navigateToPage } = useNavigation();

  const contextError = useMemo(() => {
    if (missingContext === 'group') return "Please select a group to view NPCs";
    if (missingContext === 'campaign') return "Please select a campaign to view NPCs";
    return null;
  }, [missingContext]);

  // Handle NPC update
  const handleNPCUpdate = async () => {
    await refreshNPCs();
  };

  // Handle NPC deletion
  const handleNPCDelete = async () => {
    await refreshNPCs();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading NPCs...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  // Show context error state
  if (contextError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="w-12 h-12 status-failed" />
            <Typography variant="h3">{contextError}</Typography>
            <Typography color="secondary">
              You must select a group and campaign to view and manage NPCs.
            </Typography>
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <Typography color="error">
            Error Loading NPCs. Sign in to view content.
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <Typography variant="h1" className="mb-2">
            NPCs
          </Typography>
          <Typography color="secondary">
            Keep track of all the characters you've met in your adventures
          </Typography>
        </div>

        {/* Auth actions */}
        {user && (
          <div className="flex gap-2">
            <Button
              onClick={() => navigateToPage('/npcs/create')}
              startIcon={<Plus className="w-5 h-5" />}
            >
              Add NPC
            </Button>
          </div>
        )}
      </div>

      {/* NPC Directory */}
      <NPCDirectory 
        npcs={npcs}
        onNPCUpdate={handleNPCUpdate}
        onNPCDelete={handleNPCDelete}
      />
    </div>
  );
};

export default NPCsPage;