// src/pages/rumors/RumorCreatePage.tsx
import React, { useEffect } from 'react';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import RumorForm from '../../components/features/rumors/RumorForm';
import { useAuth } from '../../context/firebase';
import { useNavigation } from '../../hooks/useNavigation';
import { ArrowLeft } from 'lucide-react';

const RumorCreatePage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { user } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!user) {
      navigateToPage('/rumors');
    }
  }, [user, navigateToPage]);

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
        <Typography variant="h1">Create New Rumor</Typography>
      </div>

      <RumorForm
        title="Create New Rumor"
        onSuccess={() => navigateToPage('/rumors')}
        onCancel={() => navigateToPage('/rumors')}
      />
    </div>
  );
};

export default RumorCreatePage;