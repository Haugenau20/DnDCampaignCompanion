// src/pages/quests/QuestCreatePage.tsx
import React, { useEffect, useState } from 'react';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import QuestCreateForm from '../../components/features/quests/QuestCreateForm';
import { useAuth, useGroups, useCampaigns } from '../../context/firebase';
import { useNavigation } from '../../context/NavigationContext';
import { useRumors } from '../../context/RumorContext';
import { useQuests } from '../../context/QuestContext';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';

const QuestCreatePage: React.FC = () => {
  const { navigateToPage, getCurrentQueryParams } = useNavigation();
  const { user } = useAuth();
  const { getRumorById } = useRumors();
  const { hasRequiredContext } = useQuests();
  const { activeGroupId } = useGroups();
  const { activeCampaignId } = useCampaigns();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  const [initialData, setInitialData] = useState<any>(null);
  const { fromRumor } = getCurrentQueryParams();

  // Handle pre-filling form if rumor ID is provided
  useEffect(() => {
    if (fromRumor) {
      const rumor = getRumorById(fromRumor);
      if (rumor) {
        console.log("Converting rumor to quest:", rumor);
        
        // Prepare initial data for quest from rumor
        setInitialData({
          title: `Quest: ${rumor.title}`,
          description: rumor.content,
          background: `This quest was derived from a rumor about "${rumor.title}" from ${rumor.sourceName}.`,
          objectives: [
            {
              id: crypto.randomUUID(),
              description: `Investigate the rumor about "${rumor.title}"`,
              completed: false
            }
          ],
          // Make sure to include the location from the rumor
          location: rumor.location || '',
          locationId: rumor.locationId || '',
          // Include related NPCs
          relatedNPCIds: rumor.relatedNPCs || [],
          dateAdded: new Date().toISOString().split('T')[0]
        });
      }
    }
  }, [fromRumor, getRumorById]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigateToPage('/quests');
    }
  }, [user, navigateToPage]);

  // Show context selection message if needed
  if (!hasRequiredContext) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigateToPage('/quests')}
            startIcon={<ArrowLeft />}
          >
            Back to Quests
          </Button>
          <Typography variant="h1">
            Create New Quest
          </Typography>
        </div>

        <Card>
          <Card.Content className="text-center py-12">
            <AlertCircle className={clsx("w-12 h-12 mx-auto mb-4", `${themePrefix}-typography-secondary`)} />
            <Typography variant="h3" className="mb-2">
              {!activeGroupId 
                ? "No Group Selected" 
                : "No Campaign Selected"}
            </Typography>
            <Typography color="secondary" className="mb-6">
              {!activeGroupId 
                ? "Please select a group to create quests." 
                : "Please select a campaign within your group to create quests."}
            </Typography>
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
          onClick={() => navigateToPage('/quests')}
          startIcon={<ArrowLeft />}
        >
          Back to Quests
        </Button>
        <Typography variant="h1">
          {fromRumor ? 'Convert Rumor to Quest' : 'Create New Quest'}
        </Typography>
      </div>

      <QuestCreateForm
        initialData={initialData}
        onSuccess={() => navigateToPage('/quests')}
        onCancel={() => navigateToPage('/quests')}
      />
    </div>
  );
};

export default QuestCreatePage;