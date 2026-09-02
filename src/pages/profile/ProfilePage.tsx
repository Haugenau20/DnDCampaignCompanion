// src/pages/profile/ProfilePage.tsx
import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import Button from "core/components/Button";
import Dialog from "core/components/Dialog";
import { useNavigation } from "shared/hooks/useNavigation";
import {
  useAuth,
  useGroups,
  useCampaigns,
  AccountCard,
  GroupMembershipCard,
  CharactersCard,
  AppearanceCard,
  DangerZoneCard,
  SignInForm,
} from "features/user-management";
import LoadingState from "pages/layouts/common/components/LoadingState";

/**
 * The profile page at `/profile`.
 *
 * One column. There was a sticky section rail down the left; it was dropped
 * because five short cards on a page you can take in at a glance do not need
 * an index, and it cost more width than it saved scrolling.
 *
 * Three states, driven by auth and group loading rather than a redirect --
 * the URL must stay linkable even when signed out:
 * - Signed out: the shell plus a single card inviting sign-in.
 * - Signed in, groups still loading: the shell plus a skeleton.
 * - Signed in: the cards. Group-scoped cards (the group's own name,
 *   Characters) only render once a group is active; the danger zone renders
 *   regardless, since account deletion does not depend on one.
 */
const ProfilePage: React.FC = () => {
  const { navigateToPage } = useNavigation();
  const { activeCampaign } = useCampaigns();
  const { user } = useAuth();
  const { activeGroup, loading } = useGroups();
  const [showSignIn, setShowSignIn] = useState(false);

  const backLabel = activeCampaign?.name
    ? `Back to ${activeCampaign.name}`
    : "Back to the campaign";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <button
        type="button"
        onClick={() => navigateToPage("/")}
        className="button button-link flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>

      <Typography variant="h1">Your profile</Typography>

      {!user ? (
        <Card>
          <Card.Content className="text-center py-8 space-y-4 max-w-md mx-auto">
            <Typography variant="h3">
              You need to be signed in to see your profile
            </Typography>
            <Button onClick={() => setShowSignIn(true)}>Sign in</Button>
          </Card.Content>
        </Card>
      ) : loading ? (
        <div data-testid="profile-loading-state">
          <LoadingState type="skeleton" count={4} height="h-24" />
        </div>
      ) : (
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

          <section id="danger" aria-labelledby="danger-heading">
            <DangerZoneCard />
          </section>
        </div>
      )}

      <Dialog
        open={showSignIn}
        onClose={() => setShowSignIn(false)}
        title="Sign In"
        maxWidth="max-w-md"
      >
        <SignInForm onSuccess={() => setShowSignIn(false)} />
      </Dialog>
    </div>
  );
};

export default ProfilePage;
