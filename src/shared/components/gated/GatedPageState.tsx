// src/shared/components/gated/GatedPageState.tsx
import React from "react";
import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import { GATED_FOOTNOTE } from "./gated-page-copy";
import type { CampaignOption } from "./types";

export type { CampaignOption } from "./types";

/** Props for {@link GatedPageState}. */
export interface GatedPageStateProps {
  variant: "signed-out" | "pick-campaign";
  /** Already resolved for read/write mode by `usePageGate`. */
  heading: string;
  blurb: string;
  onSignIn: () => void;
  onJoinGroup: () => void;
  /** Campaigns to offer. `pick-campaign` only. */
  campaigns?: CampaignOption[];
  /** Whether the user belongs to any group at all. `pick-campaign` only. */
  hasGroups?: boolean;
  /** Whether the campaign list is still being fetched. */
  campaignsLoading?: boolean;
  /** A failed switch, rendered above the list without clearing it. */
  selectError?: string | null;
  onSelectCampaign?: (option: CampaignOption) => void;
}

/** Small-caps eyebrow above the heading. */
const Eyebrow: React.FC<{ icon?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  children,
}) => (
  <div className="flex items-center gap-2 mb-4">
    {icon}
    <span className="text-xs font-semibold uppercase tracking-widest typography-muted">
      {children}
    </span>
  </div>
);

/**
 * The panel a page shows when it cannot show its content yet.
 *
 * One component, one layout, on all 21 gated routes — only the heading and one
 * sentence change. It replaces per-page cards that variously said "No Group
 * Selected", "Please select a group to view NPCs" and "No Active Group or
 * Campaign", three of which were shown to signed-out visitors who had no
 * switcher on screen to act on them.
 *
 * Presentational by design: no data hooks, no services. `GatedContent` owns the
 * fetching, the dialogs and the switch.
 */
const GatedPageState: React.FC<GatedPageStateProps> = ({
  variant,
  heading,
  blurb,
  onSignIn,
  onJoinGroup,
  campaigns = [],
  hasGroups = false,
  campaignsLoading = false,
  selectError = null,
  onSelectCampaign,
}) => {
  const isSignedOut = variant === "signed-out";

  // Which of the three pick-campaign situations we are in. Kept as one value
  // so the heading, the line and the actions cannot disagree with each other.
  const pickSituation = !hasGroups
    ? "no-groups"
    : campaigns.length === 0
    ? "no-campaigns"
    : "choose";

  const pickHeading =
    pickSituation === "no-groups"
      ? "Join a group"
      : pickSituation === "no-campaigns"
      ? "No campaigns yet"
      : "Which campaign?";

  const pickLine =
    pickSituation === "no-groups"
      ? "The Companion is invite-only. Ask your DM for a join link."
      : pickSituation === "no-campaigns"
      ? "A group admin creates the first campaign; once there is one, it appears here."
      : `You're in ${campaigns.length === 1 ? "one campaign" : `${campaigns.length} campaigns`}. ` +
        "Pick one and this page fills in — you can change it any time from the " +
        "campaign name in the header.";

  return (
    <div className="mx-auto w-full max-w-[560px] rounded-lg p-8 card">
      {isSignedOut ? (
        <Eyebrow icon={<Lock className="w-4 h-4 typography-muted" aria-hidden="true" />}>
          Private
        </Eyebrow>
      ) : (
        <Eyebrow>Signed in · no campaign chosen</Eyebrow>
      )}

      <Typography variant="h2" className="mb-4 typography-heading">
        {isSignedOut ? heading : pickHeading}
      </Typography>

      <Typography color="secondary" className="mb-6">
        {isSignedOut ? blurb : pickLine}
      </Typography>

      {isSignedOut ? (
        <>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary" onClick={onSignIn}>
              Sign in
            </Button>
            <Button variant="outline" onClick={onJoinGroup}>
              I have an invite link
            </Button>
          </div>

          <hr className="my-6 divider" />

          <Typography variant="body-sm" color="secondary">
            {GATED_FOOTNOTE}{" "}
            <Link to="/" className="font-semibold primary">
              What it does
            </Link>
          </Typography>
        </>
      ) : (
        <>
          {selectError && (
            <Typography color="error" className="mb-4">
              {selectError}
            </Typography>
          )}

          {pickSituation === "choose" && (
            <ul className="space-y-2">
              {campaigns.map((option) => (
                <li key={`${option.groupId}:${option.campaignId}`}>
                  <button
                    type="button"
                    onClick={() => onSelectCampaign?.(option)}
                    className="w-full flex items-baseline gap-2 rounded-md px-4 py-3 text-left selectable-item card-border"
                  >
                    <span className="font-semibold">{option.campaignName}</span>
                    <span className="text-sm typography-secondary">
                      · {option.groupName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {pickSituation === "choose" && campaignsLoading && (
            <Typography variant="body-sm" color="secondary" className="mt-3">
              Still looking for more campaigns…
            </Typography>
          )}

          {pickSituation === "no-groups" && (
            <Button variant="primary" onClick={onJoinGroup}>
              I have an invite link
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default GatedPageState;
