// src/pages/npcs/NPCsEditPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { NPCEditForm, useNPCData } from 'features/campaign-entities';
import { useNavigation } from 'shared/context/NavigationContext';
import { ArrowLeft, Loader2 } from 'lucide-react';

const NPCsEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { npcId } = useParams<{ npcId: string }>();
  const { npcs, loading } = useNPCData();

  const editingNPC = npcs.find(npc => npc.id === npcId);

  // Checked before the "not found" branch below, and the reason this page reads
  // `loading` at all (bug #1424). `npcs` is an empty array while auth and the
  // campaign are still restoring, which made `editingNPC` undefined and
  // rendered a red "NPC not found" for ~4s on every reload of this page before
  // the real form replaced it. That is #1413's defect wearing different words:
  // a terminal error state committed while the context is still unsettled.
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className="w-6 h-6 animate-spin primary" />
            <Typography>Loading NPC data...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigateToPage('/npcs')}
          startIcon={<ArrowLeft />}
        >
          Back to NPCs
        </Button>
        <Typography variant="h1">
          {editingNPC ? `Edit ${editingNPC.name}` : 'Edit NPC'}
        </Typography>
      </div>

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
    </div>
  );
};

export default NPCsEditPage;