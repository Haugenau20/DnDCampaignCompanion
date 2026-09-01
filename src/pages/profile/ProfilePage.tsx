// src/pages/profile/ProfilePage.tsx
import React, { useMemo, useState } from "react";
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
  UserProfile,
  SignInForm,
} from "features/user-management";
import LoadingState from "pages/layouts/common/components/LoadingState";
import ProfileSectionRail, { ProfileSection } from "./ProfileSectionRail";

/**
 * The profile page at `/profile`.
 *
 * For this commit the right-hand column mounts the existing `UserProfile`
 * component unchanged — the point of this page is to make the route itself
 * reachable and linkable before the eight-section monolith is split into
 * per-section cards. That split happens in a later change; this page does
 * not touch `UserProfile` at all.
 *
 * Three states, driven by auth and group loading rather than a redirect —
 * the URL must stay linkable even when signed out:
 * - Signed out: the shell plus a single card inviting sign-in.
 * - Signed in, groups still loading: the shell plus a skeleton.
 * - Signed in: the section rail alongside `UserProfile`. Group-scoped rail
 *   entries (the group's own name, Characters) only appear once a group is
 *   active; "Leaving and deleting" (account deletion) does not depend on one.
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

  const sections = useMemo<ProfileSection[]>(() => {
    const entries: ProfileSection[] = [{ id: "account", label: "Account" }];

    if (activeGroup) {
      entries.push({ id: "group", label: activeGroup.name });
      entries.push({ id: "characters", label: "Characters" });
    }

    entries.push({ id: "appearance", label: "Appearance" });
    entries.push({ id: "danger", label: "Leaving and deleting", tone: "error" });

    return entries;
  }, [activeGroup]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      <button
        type="button"
        onClick={() => navigateToPage("/")}
        className="button button-link flex items-center gap-2 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
      </button>

      <div className="space-y-3">
        <Typography variant="h1">Your profile</Typography>
        <Typography color="secondary">
          Changes save as you make them. Nothing here needs a save button.
        </Typography>
      </div>

      {!user ? (
        <Card>
          <Card.Content className="text-center py-8 space-y-4 max-w-md mx-auto">
            <Typography variant="h3">
              You need to be signed in to see your profile
            </Typography>
            <Button onClick={() => setShowSignIn(true)}>Sign in</Button>
          </Card.Content>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[212px_1fr] gap-7">
          <ProfileSectionRail sections={sections} />
          {loading ? (
            <div data-testid="profile-loading-state">
              <LoadingState type="skeleton" count={4} height="h-24" />
            </div>
          ) : (
            <div className="space-y-4">
              <UserProfile />
            </div>
          )}
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
