// src/pages/quests/QuestCreatePage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../core/components/Button';
import { QuestCreateForm } from 'features/campaign-entities';
import Breadcrumb from 'shared/components/Breadcrumb';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { ArrowLeft } from 'lucide-react';

/**
 * Page for creating a new quest.
 *
 * Write route ("quests", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to add a quest" in place of the form, rather than a form whose submit
 * would fail anyway -- `QuestContext` throws "User must be authenticated to
 * add a quest" before any write.
 */
const QuestCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const gate = usePageGate('quests', { mode: 'write' });

  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate('/quests');
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate('/quests');
    }
  };

  // Prepare initial data for QuestCreateForm
  const formInitialData = initialData ? {
    ...initialData,
    noteId,
    entityId
  } : undefined;

  return (
    <PageShell
      title="Create New Quest"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Quests', href: '/quests' },
            { label: 'Create' }
          ]}
          className="mb-4"
        />
      }
    >
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={handleCancel}
          startIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to {noteId ? 'Note' : 'Quests'}
        </Button>
      </div>

      <GatedContent gate={gate}>
        <QuestCreateForm
          initialData={formInitialData}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </GatedContent>
    </PageShell>
  );
};

export default QuestCreatePage;
