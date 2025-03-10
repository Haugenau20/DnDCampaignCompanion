// src/pages/quests/QuestCreatePage.tsx
import React, { useEffect, useState } from 'react';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import QuestCreateForm from '../../components/features/quests/QuestCreateForm';
import { useFirebase } from '../../context/FirebaseContext';
import { useNavigation } from '../../context/NavigationContext';
import { useRumors } from '../../context/RumorContext';
import { ArrowLeft } from 'lucide-react';

const QuestCreatePage: React.FC = () => {
  const { navigateToPage, getCurrentQueryParams } = useNavigation();
  const { user } = useFirebase();
  const { getRumorById } = useRumors();
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