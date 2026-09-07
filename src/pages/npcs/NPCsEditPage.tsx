// src/pages/npcs/NPCsEditPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { NPCEditForm, useNPCData } from 'features/campaign-entities';
import { useNavigation } from 'shared/context/NavigationContext';
import { usePageGate, GatedContent } from 'shared/components/gated';
import PageShell from 'shared/components/page-shell/PageShell';
import { ArrowLeft } from 'lucide-react';

/**
 * Page for editing an existing NPC.
 *
 * Write route ("npcs", `mode: "write"`) so a signed-out visitor sees "Sign in
 * to add an NPC" in place, and the shared pick-campaign panel when no group or
 * campaign is chosen yet -- this page previously had no context guard of its
 * own at all, so a signed-out or context-less visitor fell straight through
 * to a bare "NPC not found" or an empty form.
 *
 * `loading` (bug #1424) still folds into the gate's `resolving` state the
 * same way it always did: `npcs` is an empty array while auth and the
 * campaign are still restoring, and without this the page would render "NPC
 * not found" for the found-but-not-yet-loaded case.
 */
const NPCsEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { npcId } = useParams<{ npcId: string }>();
  const { npcs, loading } = useNPCData();

  const editingNPC = npcs.find(npc => npc.id === npcId);

  const gate = usePageGate('npcs', { loading, mode: 'write' });

  return (
    <PageShell title={editingNPC ? `Edit ${editingNPC.name}` : 'Edit NPC'}>
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigateToPage('/npcs')}
          startIcon={<ArrowLeft />}
        >
          Back to NPCs
        </Button>
      </div>

      <GatedContent gate={gate}>
        {editingNPC ? (
          <NPCEditForm
            npc={editingNPC}
            onSuccess={() => navigateToPage('/npcs')}
            onCancel={() => navigateToPage('/npcs')}
            existingNPCs={npcs}
          />
        ) : (
          <Card>
            <Card.Content>
              <Typography color="error">NPC not found</Typography>
            </Card.Content>
          </Card>
        )}
      </GatedContent>
    </PageShell>
  );
};

export default NPCsEditPage;
