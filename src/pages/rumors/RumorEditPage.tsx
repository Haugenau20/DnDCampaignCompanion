// src/pages/rumors/RumorEditPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { RumorForm, useRumors } from 'features/campaign-entities';
import { useNavigation } from 'shared/hooks/useNavigation';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { ArrowLeft } from 'lucide-react';

/**
 * Page for editing an existing rumor.
 *
 * Write route ("rumors", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to record a rumor" in place, rather than the old `!user` redirect effect
 * that bounced them back to `/rumors` before the page could say why -- the
 * form was never reachable while signed out anyway, since `RumorContext`
 * throws "User must be authenticated to add a rumor" before any write, and
 * `gate.canAct` only turns true once the gate is `ready`.
 */
const RumorEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { rumorId } = useParams<{ rumorId: string }>();
  const { rumors, isLoading, error } = useRumors();

  const editingRumor = rumors.find(rumor => rumor.id === rumorId);

  const gate = usePageGate('rumors', { loading: isLoading, error, mode: 'write' });

  return (
    <PageShell
      title={editingRumor ? `Edit ${editingRumor.title}` : 'Edit Rumor'}
      breadcrumb={
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigateToPage('/rumors')}
            startIcon={<ArrowLeft />}
          >
            Back to Rumors
          </Button>
        </div>
      }
    >
      <GatedContent gate={gate}>
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
      </GatedContent>
    </PageShell>
  );
};

export default RumorEditPage;
