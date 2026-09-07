import React, { useState } from "react";
import { SignInForm, JoinGroupDialog } from "features/user-management";
import Dialog from "core/components/Dialog";
import Button from "core/components/Button";
import Typography from "core/components/Typography";
import { SIGNED_OUT_EXAMPLE } from "./signed-out-example";

/** The three things the product does, said plainly. */
const PRODUCT_LINES = [
  "A chapter log the whole group can add to, in play order",
  "Quests with objectives, and rumors you can mark true or false",
  "Private session notes, and NPCs pulled out of them for you",
];

/**
 * What a stranger sees at `/`.
 *
 * Home is the one page that answers "what is this?", so it is the one page
 * allowed an example — everywhere else the feel comes from a single honest
 * sentence, because inventing quests with invented authors would undermine the
 * attribution the product's credibility rests on.
 *
 * Rendered instead of `PageShell` + `GatedContent`, not inside them: the `h1`
 * here is the product's headline, not a page title, and the two-column layout
 * is not the 560px panel the other twenty routes share.
 */
const SignedOutHome: React.FC = () => {
  const [showSignIn, setShowSignIn] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        {/* Left: what it is, in words. This column is the accessible copy of
            everything the example panel shows, which is why the panel itself
            can be hidden from assistive technology. */}
        <div>
          <Typography variant="h1" className="mb-6">
            Everything your table agreed happened, in one place
          </Typography>

          <Typography
            color="secondary"
            className="mb-8"
            data-testid="home-blurb"
          >
            Chapters, quests, NPCs, locations, rumors and private notes for one
            campaign — written by whoever is at the table, credited to the
            character they play. Invite-only: a DM sends a join link, and
            nothing is public.
          </Typography>

          <div className="flex flex-wrap gap-3 mb-10">
            <Button variant="primary" onClick={() => setShowSignIn(true)}>
              Sign in
            </Button>
            <Button variant="outline" onClick={() => setShowJoinGroup(true)}>
              I have an invite link
            </Button>
          </div>

          <ul className="space-y-2" data-testid="product-lines">
            {PRODUCT_LINES.map((line) => (
              <li key={line}>
                <Typography color="secondary">· {line}</Typography>
              </li>
            ))}
          </ul>
        </div>

        {/* Right: the example. */}
        <div>
          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <span className="px-2 py-1 rounded text-xs font-semibold uppercase tracking-widest chip">
              Example campaign
            </span>
            <Typography variant="body-sm" color="secondary">
              a picture, not a demo — nothing here is clickable
            </Typography>
          </div>

          {/* aria-hidden because every fact inside is already stated in the
              left column, and a screen-reader user should not have to walk a
              table of numbers that are not theirs. Nothing inside is
              focusable, so nothing can be reached by keyboard either. */}
          <div
            data-testid="example-panel"
            aria-hidden="true"
            className="rounded-lg p-6 card"
          >
            <Typography variant="h3" className="mb-1 typography-heading">
              {SIGNED_OUT_EXAMPLE.campaignTitle}
            </Typography>
            <Typography variant="body-sm" color="secondary" className="mb-6">
              {SIGNED_OUT_EXAMPLE.subtitle}
            </Typography>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px mb-6 rounded overflow-hidden bg-secondary">
              {SIGNED_OUT_EXAMPLE.stats.map((stat) => (
                <div key={stat.label} className="p-3 card">
                  <div className="text-2xl font-bold typography">
                    {stat.value}
                  </div>
                  <div className="text-xs uppercase tracking-wide typography-muted">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-xs uppercase tracking-widest typography-muted mb-2">
              Since you last played
            </div>
            <ul>
              {SIGNED_OUT_EXAMPLE.updates.map((update) => (
                <li
                  key={update.title}
                  className="flex items-baseline gap-3 py-2 border-b card-divider last:border-b-0"
                >
                  <span className="text-sm typography-muted shrink-0">
                    {update.date}
                  </span>
                  <span className="font-semibold typography flex-1">
                    {update.title}
                  </span>
                  <span className="text-xs typography-muted shrink-0">
                    {update.kind}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default SignedOutHome;
