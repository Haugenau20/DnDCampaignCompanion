// src/pages/quests/QuestEditPage.tsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { QuestEditForm, useQuests } from 'features/campaign-entities';
import { useAuth, useGroups } from 'features/user-management';
import { useNavigation } from 'shared/context/NavigationContext';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';

const QuestEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { questId } = useParams<{ questId: string }>();
  const { quests, loading, error, refreshQuests, hasRequiredContext } = useQuests();
  const { user } = useAuth();
  const { activeGroupId } = useGroups();
  
  const editingQuest = quests.find(quest => quest.id === questId);

  // Redirect if not authenticated.
  //
  // Gated on `loading` for the same reason the render branches below are
  // ordered the way they are (bug #1413, extended by #1423): `user` is null
  // both when nobody is signed in AND while Firebase Auth is still rehydrating
  // on a fresh page load. Firing on the bare `!user` sends a signed-in user
  // back to the list ~124ms into a reload, before auth can restore -- so
  // reloading this page, or opening a bookmark to it, never worked.
  useEffect(() => {
    if (!loading && !user) {
      navigateToPage('/quests');
    }
  }, [loading, user, navigateToPage]);

  // Loading is checked BEFORE the context-selection message on purpose
  // (bug #1413). `loading` now folds in "auth/campaign still restoring", so on
  // a fresh page load this renders the spinner instead of telling the user they
  // have selected no campaign when they have — the error below is reached only
  // once restoration has finished and genuinely produced nothing.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading quest data...</Typography>
          </div>
        </Card>
      </div>
    );
  }

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
            Edit Quest
          </Typography>
        </div>

        <Card>
          <Card.Content className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 typography-secondary" />
            <Typography variant="h3" className="mb-2">
              {!activeGroupId
                ? "No Group Selected"
                : "No Campaign Selected"}
            </Typography>
            <Typography color="secondary" className="mb-6">
              {!activeGroupId
                ? "Please select a group to edit quests."
                : "Please select a campaign within your group to edit quests."}
            </Typography>
          </Card.Content>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <Typography color="error">
            Error loading quest data. Please try again later.
          </Typography>
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
          {editingQuest ? `Edit ${editingQuest.title}` : 'Edit Quest'}
        </Typography>
      </div>

      {editingQuest ? (
        <QuestEditForm
          quest={editingQuest}
          onSuccess={() => {
            refreshQuests(); // Refresh quest data after successful edit
            navigateToPage('/quests');
          }}
          onCancel={() => navigateToPage('/quests')}
        />
      ) : (
        <Card>
          <Card.Content>
            <Typography color="error">Quest not found</Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default QuestEditPage;