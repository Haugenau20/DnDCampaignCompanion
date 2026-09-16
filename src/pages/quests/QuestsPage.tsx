// src/pages/quests/QuestsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { QuestDirectory, useQuests } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/hooks/useNavigation";
import { Plus } from "lucide-react";

/**
 * Quests index.
 *
 * The five gated states (resolving/signed-out/pick-campaign/error/ready) used
 * to be five separate early-return branches copied across every entity index
 * page, each with its own wording. `usePageGate` derives the state once and
 * `GatedContent` renders it, so this page describes only itself: its name,
 * its one-line subtitle, its create action and its list.
 */
const QuestsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { quests, loading, error } = useQuests();

  const gate = usePageGate("quests", { loading, error });

  return (
    <PageShell
      title="Campaign Quests"
      subtitle="Track your party's epic adventures and missions"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/quests/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Create Quest
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <QuestDirectory quests={quests} isLoading={false} />
      </GatedContent>
    </PageShell>
  );
};

export default QuestsPage;
