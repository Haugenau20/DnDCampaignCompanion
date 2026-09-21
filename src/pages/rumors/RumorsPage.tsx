// src/pages/rumors/RumorsPage.tsx
import React from "react";
import { RumorDirectory, useRumors } from "features/campaign-entities";
import { usePageGate, GatedContent } from "shared/components/gated";
import PageShell from "shared/components/page-shell/PageShell";

/**
 * Rumors index.
 *
 * `RumorDirectory` carries the progress bar, the category chips, the search
 * field and bulk-select. Rendering it over an empty array — which is what the
 * signed-out page used to do — put five controls on screen that could not act,
 * which reads as broken rather than as gated. `GatedContent` renders it only
 * in the `ready` state.
 *
 * It carries no *Add Rumor* action: `15-7` put a composer at the top of the
 * list, and a second way in that leaves for `/rumors/create` would be the
 * page contradicting the control directly below it.
 */
const RumorsPage: React.FC = () => {
  const { rumors, isLoading, error } = useRumors();

  const gate = usePageGate("rumors", {
    /*
      `loading` means **"there is nothing to show yet"**, not "a fetch is in
      flight". Every write in this app ends with a refresh, and that refresh
      sets the data hook's `loading` flag again -- so passing it raw made the
      gate re-enter `resolving` after *every* save, swap the whole page for the
      skeleton, and unmount what was on screen. Measured in Chrome: one
      skeleton flash per write, and an open row closing under the cursor.

      Once the page has something to show, a refetch happens behind it.
    */
    loading: isLoading && rumors.length === 0,
    error,
  });

  return (
    <PageShell
      title="Rumors"
      subtitle="Track and investigate rumors from across the realm"
    >
      <GatedContent gate={gate}>
        <RumorDirectory rumors={rumors} isLoading={false} />
      </GatedContent>
    </PageShell>
  );
};

export default RumorsPage;
