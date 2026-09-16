// src/features/user-management/profiles/components/AccountCard.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import { buttonClasses } from "core/components/Button";

/**
 * Account-scoped section of the profile page: the settings that apply to
 * the signed-in user everywhere, in every group they belong to.
 *
 * Shows the sign-in email and every group the user is a member of, and links
 * to `/join` for another.
 *
 * "Join another" used to open a dialog here, and the landing behaviour it
 * shared with the header's entrance moved to `useJoinGroupCompletion` so the
 * two could not diverge. Both entrances are now the same route, so they cannot
 * diverge at all -- `/join` owns the completion.
 */
const AccountCard: React.FC = () => {
  const { user } = useAuth();
  const { groups } = useGroups();

  const groupNames = groups.map((group) => group.name).join(", ");

  return (
    <Card>
      <Card.Content className="space-y-4">
        <div className="space-y-1">
          <Typography id="account-heading" variant="h4">Account</Typography>
        </div>

        <div className="grid grid-cols-[170px_1fr_auto] items-center gap-x-3 gap-y-3">
          <Typography variant="body-sm" color="secondary">Email</Typography>
          <Typography>{user?.email}</Typography>
          <Typography variant="body-sm" color="muted">used to sign in</Typography>

          <Typography variant="body-sm" color="secondary">Groups you&apos;re in</Typography>
          <Typography>{groupNames}</Typography>
          <Link
            to="/join"
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            Join another
          </Link>
        </div>
      </Card.Content>

    </Card>
  );
};

export default AccountCard;
