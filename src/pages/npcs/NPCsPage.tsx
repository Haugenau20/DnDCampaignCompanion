// src/pages/npcs/NPCsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { NPCDirectory, useNPCData } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/context/NavigationContext";
import { Plus } from "lucide-react";

/**
 * NPCs index.
 *
 * The `contextError` memo that used to live here — and, identically, in
 * `NPCContext` — is gone: the page renders whatever `usePageGate` says the
 * state is, and the words come from `gated-page-copy`. The retry handler is
 * wired through so the shared error panel's "Try again" button re-fetches
 * this page's own data instead of only the generic gate.
 */
const NPCsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { npcs, loading, error, refreshNPCs } = useNPCData();

  const gate = usePageGate("npcs", {
    loading,
    error,
    onRetry: () => {
      void refreshNPCs();
    },
  });

  const handleNPCChanged = async () => {
    await refreshNPCs();
  };

  return (
    <PageShell
      title="NPCs"
      subtitle="Keep track of all the characters you've met in your adventures"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/npcs/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Add NPC
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <NPCDirectory
          npcs={npcs}
          onNPCUpdate={handleNPCChanged}
          onNPCDelete={handleNPCChanged}
        />
      </GatedContent>
    </PageShell>
  );
};

export default NPCsPage;
