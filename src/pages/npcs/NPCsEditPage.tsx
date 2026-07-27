// src/pages/npcs/NPCsEditPage.tsx
import React from 'react';
import { useParams } from 'react-router-dom';
import Typography from '../../core/components/Typography';
import Button from '../../core/components/Button';
import Card from '../../core/components/Card';
import { NPCEditForm, useNPCData } from 'features/campaign-entities';
import { useNavigation } from '../../context/NavigationContext';
import { ArrowLeft } from 'lucide-react';

const NPCsEditPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { npcId } = useParams<{ npcId: string }>();
  const { npcs } = useNPCData();
  
  const editingNPC = npcs.find(npc => npc.id === npcId);

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