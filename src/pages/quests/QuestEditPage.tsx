// src/pages/quests/QuestEditPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { QuestEditForm, useQuests } from 'features/campaign-entities';
import { useNavigation } from 'shared/context/NavigationContext';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { ArrowLeft } from 'lucide-react';

/**
 * Page for editing an existing quest.
 *
 * Write route ("quests", `mode: "write"`) so a signed-out visitor sees "Sign
 * in to add a quest" in place, rather than the old `!user` redirect effect
 * that bounced them back to `/quests` before the page could say why -- the
 * form was never reachable while signed out anyway, since `QuestContext`
 * throws "User must be authenticated to add a quest" before any write, and
 * `gate.canAct` only turns true once the gate is `ready`.
 *
 * The old `hasRequiredContext` early return and its four-string "No Group
 * Selected" / "No Campaign Selected" card are gone too: `usePageGate` derives
 * the same missing-context state from the real hook, and `GatedContent`
 * renders the shared pick-campaign panel instead.
 */
const QuestEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { questId } = useParams<{ questId: string }>();
  const { quests, loading, error, refreshQuests } = useQuests();

  const editingQuest = quests.find(quest => quest.id === questId);

  const gate = usePageGate('quests', { loading, error, mode: 'write' });

  return (
    <PageShell
      title={editingQuest ? `Edit ${editingQuest.title}` : 'Edit Quest'}
      breadcrumb={
        <div className="mb-8 flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigateToPage('/quests')}
            startIcon={<ArrowLeft />}
          >
            Back to Quests
          </Button>
        </div>
      }
    >
      <GatedContent gate={gate}>
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
      </GatedContent>
    </PageShell>
  );
};

export default QuestEditPage;
