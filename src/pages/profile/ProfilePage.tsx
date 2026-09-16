// src/pages/profile/ProfilePage.tsx
import React from "react";
import {
  useGroups,
  AccountCard,
  GroupMembershipCard,
  CharactersCard,
  AppearanceCard,
  DangerZoneCard,
} from "features/user-management";
import BackToCampaign from "shared/components/BackToCampaign";
import PageShell from "shared/components/page-shell/PageShell";
import { usePageGate, GatedContent } from "shared/components/gated";

/**
 * The profile page at `/profile`.
 *
 * One column. There was a sticky section rail down the left; it was dropped
 * because five short cards on a page you can take in at a glance do not need
 * an index, and it cost more width than it saved scrolling.
 *
 * The three states this file used to spell out in JSX -- signed out, groups
 * still loading, signed in -- are `usePageGate`'s, and the paragraph that used
 * to defend them is now the gate's contract. Two things it argued for are
 * preserved rather than lost in the move:
 *
 * - **The URL stays linkable while signed out.** `GatedContent` renders the
 *   signed-in invitation in place and `PageShell` keeps the title above it, so
 *   a signed-out visitor still lands on something that says which page it is.
 * - **The account is not campaign-scoped.** The page's gate is `requires:
 *   "none"` -- an email address, a username, a theme preference and a
 *   delete-account button belong to the account, not to a campaign, so a
 *   member between campaigns must not be sent to a campaign picker to reach
 *   them. The group-scoped cards keep their own `activeGroup` check.
 *
 * The skeleton is the gate's rather than `LoadingState`'s, which also means it
 * now waits on `useAuth().loading` instead of `useGroups().loading` -- the
 * flag that stays true for the whole restore chain rather than the one that
 * flips false the moment `groups` is an array (bug #701).
 */
const ProfilePage: React.FC = () => {
  const { activeGroup } = useGroups();
  const gate = usePageGate("profile");

  return (
    <PageShell
      title="Your profile"
      maxWidth="max-w-3xl"
      breadcrumb={<BackToCampaign className="mb-4" />}
    >
      <GatedContent gate={gate}>
        <div className="space-y-4">
          <section id="account" aria-labelledby="account-heading">
            <AccountCard />
          </section>

          {activeGroup && (
            <>
              <section id="group" aria-labelledby="group-heading">
                <GroupMembershipCard />
              </section>
              <section id="characters" aria-labelledby="characters-heading">
                <CharactersCard />
              </section>
            </>
          )}

          <section id="appearance" aria-labelledby="appearance-heading">
            <AppearanceCard />
          </section>

          {/* Renders whether or not a group is active: deleting an account
              does not depend on belonging to one. */}
          <section id="danger" aria-labelledby="danger-heading">
            <DangerZoneCard />
          </section>
        </div>
      </GatedContent>
    </PageShell>
  );
};

export default ProfilePage;
