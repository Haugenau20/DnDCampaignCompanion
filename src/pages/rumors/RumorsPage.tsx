// src/pages/rumors/RumorsPage.tsx
import React from "react";
import Button from "core/components/Button";
import { RumorDirectory, useRumors } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";
import { useNavigation } from "shared/hooks/useNavigation";
import { Plus } from "lucide-react";

/**
 * Rumors index.
 *
 * `RumorDirectory` carries the progress bar, the category chips, the search
 * field and bulk-select. Rendering it over an empty array — which is what the
 * signed-out page used to do — put five controls on screen that could not act,
 * which reads as broken rather than as gated. `GatedContent` renders it only
 * in the `ready` state.
 */
const RumorsPage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { rumors, isLoading, error } = useRumors();

  const gate = usePageGate("rumors", { loading: isLoading, error });

  return (
    <PageShell
      title="Rumors"
      subtitle="Track and investigate rumors from across the realm"
      actions={
        gate.canAct && (
          <Button
            onClick={() => navigateToPage("/rumors/create")}
            startIcon={<Plus className="w-5 h-5" />}
          >
            Add Rumor
          </Button>
        )
      }
    >
      <GatedContent gate={gate}>
        <RumorDirectory rumors={rumors} isLoading={false} />
      </GatedContent>
    </PageShell>
  );
};

export default RumorsPage;
