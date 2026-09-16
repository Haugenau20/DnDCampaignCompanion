// src/pages/npcs/NPCsCreatePage.tsx
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '../../core/components/Button';
import { NPCForm, useNPCs } from 'features/campaign-entities';
import Breadcrumb from 'shared/components/Breadcrumb';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { ArrowLeft } from 'lucide-react';

/**
 * Page for creating a new NPC.
 *
 * Write route ("npcs", `mode: "write"`) so a signed-out visitor sees "Sign in
 * to add an NPC" in place of the form, rather than a form whose submit would
 * fail anyway once it reached the NPC context.
 */
const NPCsCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { npcs } = useNPCs();

  const gate = usePageGate('npcs', { mode: 'write' });

  // Check for initial data from navigation state
  const initialData = location.state?.initialData;
  const noteId = location.state?.noteId;
  const entityId = location.state?.entityId;

  const handleSuccess = () => {
    navigate('/npcs');
  };

  const handleCancel = () => {
    // Go back to the previous page (note if coming from note conversion)
    if (noteId) {
      navigate(`/notes/${noteId}`);
    } else {
      navigate('/npcs');
    }
  };

  // Prepare initial data for NPCForm
  const formInitialData = initialData ? {
    ...initialData,
    noteId,
    entityId
  } : undefined;

  return (
    <PageShell
      title="Create New NPC"
      breadcrumb={
        <Breadcrumb
          items={[
            { label: 'NPCs', href: '/npcs' },
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
          Back to {noteId ? 'Note' : 'NPCs'}
        </Button>
      </div>

      <GatedContent gate={gate}>
        <NPCForm
          initialData={formInitialData}
          onSuccess={handleSuccess}
          onCancel={handleCancel}
          existingNPCs={npcs}
        />
      </GatedContent>
    </PageShell>
  );
};

export default NPCsCreatePage;
