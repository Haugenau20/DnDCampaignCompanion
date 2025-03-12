// src/pages/rumors/RumorEditPage.tsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import RumorForm from '../../components/features/rumors/RumorForm';
import { useRumors } from '../../context/RumorContext';
import { useAuth } from '../../context/firebase';
import { useNavigation } from '../../hooks/useNavigation';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';
import { ArrowLeft, Loader2 } from 'lucide-react';

const RumorEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { rumorId } = useParams<{ rumorId: string }>();
  const { rumors, isLoading, error } = useRumors();
  const { user } = useAuth();
  const { theme } = useTheme();
  const themePrefix = theme.name;
  
  const editingRumor = rumors.find(rumor => rumor.id === rumorId);

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigateToPage('/rumors');
    }
  }, [user, navigateToPage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className={clsx("w-6 h-6 animate-spin", `${themePrefix}-primary`)} />
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