// src/pages/rumors/RumorEditPage.tsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { RumorForm, useRumors } from 'features/campaign-entities';
import { useAuth } from 'features/user-management';
import { useNavigation } from 'shared/hooks/useNavigation';
import { ArrowLeft, Loader2 } from 'lucide-react';

const RumorEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { rumorId } = useParams<{ rumorId: string }>();
  const { rumors, isLoading, error } = useRumors();
  const { user } = useAuth();
  
  const editingRumor = rumors.find(rumor => rumor.id === rumorId);

  // Redirect if not authenticated.
  //
  // Gated on `isLoading` because `user` is null both when nobody is signed in
  // AND while Firebase Auth is still rehydrating on a fresh page load. Firing
  // on the bare `!user` sent a signed-in user back to the list mid-restore, so
  // reloading this page or opening a bookmark to it never worked (bug #1423,
  // the redirect-shaped half of #1413).
  useEffect(() => {
    if (!isLoading && !user) {
      navigateToPage('/rumors');
    }
  }, [isLoading, user, navigateToPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading rumor data...</Typography>
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
            Error loading rumor data. Please try again later.
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
          onClick={() => navigateToPage('/rumors')}
          startIcon={<ArrowLeft />}
        >
          Back to Rumors
        </Button>
        <Typography variant="h1">
          {editingRumor ? `Edit ${editingRumor.title}` : 'Edit Rumor'}
        </Typography>
      </div>

      {editingRumor ? (
        <RumorForm
          rumor={editingRumor}
          title="Edit Rumor"
          onSuccess={() => navigateToPage('/rumors')}
          onCancel={() => navigateToPage('/rumors')}
        />
      ) : (
        <Card>
          <Card.Content>
            <Typography color="error">Rumor not found</Typography>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default RumorEditPage;