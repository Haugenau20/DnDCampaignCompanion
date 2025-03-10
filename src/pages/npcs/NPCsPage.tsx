// src/pages/npcs/NPCsPage.tsx
import React, { useState, useMemo } from 'react';
import Typography from '../../components/core/Typography';
import Button from '../../components/core/Button';
import Card from '../../components/core/Card';
import NPCDirectory from '../../components/features/npcs/NPCDirectory';
import { useFirebase } from '../../context/FirebaseContext';
import { useNPCData } from '../../hooks/useNPCData';
import { NPC } from '../../types/npc';
import { useNavigation } from '../../context/NavigationContext';
import { useTheme } from '../../context/ThemeContext';
import clsx from 'clsx';
import { Plus, Users, Loader2 } from 'lucide-react';

const NPCsPage: React.FC = () => {
  // Hooks
  const { user } = useFirebase();
  const { npcs, loading, error, refreshNPCs } = useNPCData();
  const { navigateToPage } = useNavigation();
  const { theme } = useTheme();
  const themePrefix = theme.name;

  // Calculate stats for display
  const stats = useMemo(() => ({
    total: npcs.length,
    alive: npcs.filter(npc => npc.status === 'alive').length,
    deceased: npcs.filter(npc => npc.status === 'deceased').length,
    missing: npcs.filter(npc => npc.status === 'missing').length
  }), [npcs]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <div className="flex items-center gap-4">
            <Loader2 className={clsx("w-6 h-6 animate-spin", `${themePrefix}-primary`)} />
            <Typography>Loading NPCs...</Typography>
          </div>
        </Card>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-8">
          <Typography color="error">
            Error Loading NPCs. Sign in to view content.
          </Typography>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <Typography variant="h1" className="mb-2">
            NPCs
          </Typography>
          <Typography color="secondary">
            Keep track of all the characters you've met in your adventures
          </Typography>
        </div>

        {/* Auth actions */}
        {user && (
          <div className="flex gap-2">
            <Button
              onClick={() => navigateToPage('/npcs/create')}
              startIcon={<Plus className="w-5 h-5" />}
            >
              Add NPC
            </Button>
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Users className={clsx("w-8 h-8 mr-4", `${themePrefix}-status-general`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.total}
              </Typography>
              <Typography color="secondary">
                Total NPCs
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Users className={clsx("w-8 h-8 mr-4", `${themePrefix}-npc-status-alive`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.alive}
              </Typography>
              <Typography color="secondary">
                Alive
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Users className={clsx("w-8 h-8 mr-4", `${themePrefix}-npc-status-missing`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.missing}
              </Typography>
              <Typography color="secondary">
                Missing
              </Typography>
            </div>
          </Card.Content>
        </Card>

        <Card>
          <Card.Content className="flex items-center justify-center p-6">
            <Users className={clsx("w-8 h-8 mr-4", `${themePrefix}-npc-status-deceased`)} />
            <div>
              <Typography variant="h2" className="mb-1">
                {stats.deceased}
              </Typography>
              <Typography color="secondary">
                Deceased
              </Typography>
            </div>
          </Card.Content>
        </Card>
      </div>

      {/* NPC Directory */}
      <NPCDirectory 
        npcs={npcs}
        onNPCUpdate={async (updatedNPC: NPC) => {
          await refreshNPCs(); // Refresh the NPC list after update
        }}
      />
    </div>
  );
};

export default NPCsPage;