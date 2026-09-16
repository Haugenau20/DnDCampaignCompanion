// src/pages/rumors/RumorCreatePage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../core/components/Button';
import { RumorForm } from 'features/campaign-entities';
import Breadcrumb from 'shared/components/Breadcrumb';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { ArrowLeft } from 'lucide-react';

/**
 * Page for creating a new rumor.
 *
 * Write route ("rumors", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to record a rumor" in place of the form, rather than a form whose submit
 * would fail anyway once it reached the rumor context.
 */
const RumorCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const gate = usePageGate('rumors', { mode: 'write' });

  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate('/rumors');
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate('/rumors');
    }
  };

  // Convert initialData to proper format for RumorForm
  const formInitialData = initialData ? {
    title: initialData.title || '',
    content: initialData.description || '', // Use description as content
    noteId,
    entityId
  } : undefined;

  return (
    <PageShell
      title="Create New Rumor"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'Rumors', href: '/rumors' },
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
          Back to {noteId ? 'Note' : 'Rumors'}
        </Button>
      </div>

      <GatedContent gate={gate}>
        <RumorForm
          initialData={formInitialData}
          title="Create Rumor"
          onSuccess={handleSuccess}
          onCancel={handleCancel}
        />
      </GatedContent>
    </PageShell>
  );
};

export default RumorCreatePage;
