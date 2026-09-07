// src/shared/components/gated/GatedContent.tsx
import React, { useState } from "react";
import {
  useGroups,
  useCampaigns,
  SignInForm,
  JoinGroupDialog,
} from "features/user-management";
import Dialog from "core/components/Dialog";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import GatedPageState from "./GatedPageState";
import type { CampaignOption } from "./types";
import { useSelectableCampaigns } from "./useSelectableCampaigns";
import type { PageGate } from "./usePageGate";

/** Props for {@link GatedContent}. */
export interface GatedContentProps {
  /** The page's gate, from `usePageGate`. */
  gate: PageGate;
  /** What to render once the gate is `ready`. */
  children: React.ReactNode;
}

/**
 * A skeleton, not a message.
 *
 * State 1 exists precisely so that nothing is *claimed* while the answer is
 * unknown — every "please select a group" flash on a fresh page load came from
 * a page rendering its state-3 copy during restore. The blocks are hidden from
 * assistive technology and the status role carries the meaning instead.
 */
const Skeleton: React.FC = () => (
  <div role="status" aria-busy="true" data-testid="gated-skeleton">
    <span className="sr-only">Loading</span>
    <div className="space-y-4" aria-hidden="true">
      <div className="h-10 w-1/3 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
      <div className="h-24 rounded animate-pulse bg-secondary" />
    </div>
  </div>
);

/**
 * Renders whichever of the gated states the page is in, or its content.
 *
 * Owns the two dialogs, the cross-group campaign fetch and the switch, so a
 * page adopting the gate writes two lines and wires no dialog state of its own.
 */
const GatedContent: React.FC<GatedContentProps> = ({ gate, children }) => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [selectError, setSelectError] = useState<string | null>(null);

  const { groups, activeGroupId, setActiveGroup } = useGroups();
  const { setActiveCampaign } = useCampaigns();

  const isPicking = gate.state === "pick-campaign";
  const { options, loading: campaignsLoading } = useSelectableCampaigns(isPicking);

  /**
   * Switch to the chosen campaign, moving group first when it lives elsewhere.
   *
   * The order matters: `setActiveGroup` loads that group's campaigns and
   * activates one, so calling it second would overwrite the campaign we just
   * chose. Same-group picks skip it entirely.
   */
  const handleSelectCampaign = async (option: CampaignOption) => {
    setSelectError(null);
    try {
      if (option.groupId !== activeGroupId) {
        await setActiveGroup(option.groupId);
      }
      await setActiveCampaign(option.campaignId);
    } catch (error) {
      setSelectError(
        error instanceof Error ? error.message : "Could not open that campaign."
      );
    }
  };

  const panel =
    gate.state === "signed-out" || isPicking ? (
      <GatedPageState
        variant={gate.state === "signed-out" ? "signed-out" : "pick-campaign"}
        heading={gate.heading}
        blurb={gate.copy.blurb}
        onSignIn={() => setShowSignIn(true)}
        onJoinGroup={() => setShowJoinGroup(true)}
        campaigns={options}
        hasGroups={groups.length > 0}
        campaignsLoading={campaignsLoading}
        selectError={selectError}
        onSelectCampaign={handleSelectCampaign}
      />
    ) : null;

  return (
    <>
      {gate.state === "resolving" && <Skeleton />}

      {panel}

      {gate.state === "error" && (
        <div className="mx-auto w-full max-w-[560px] rounded-lg p-8 card">
          <Typography variant="h2" className="mb-2">
            Couldn't load {gate.copy.noun}.
          </Typography>
          <Typography color="error" className="mb-6">
            {gate.error}
          </Typography>
          {gate.onRetry && (
            <Button variant="primary" onClick={gate.onRetry}>
              Try again
            </Button>
          )}
        </div>
      )}

      {gate.state === "ready" && children}

      <Dialog
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        title="Sign In"
        maxWidth="max-w-md"
      >
        <SignInForm onSuccess={() => setShowSignIn(false)} />
      </Dialog>

      <JoinGroupDialog
        open={showJoinGroup}
        onClose={() => setShowJoinGroup(false)}
        onSuccess={() => setShowJoinGroup(false)}
      />
    </>
  );
};

export default GatedContent;
