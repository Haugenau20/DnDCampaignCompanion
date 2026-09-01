// src/features/user-management/profiles/components/AccountCard.tsx
import React from "react";
import { useAuth } from "../../auth/hooks/useAuth";
import Typography from "core/components/Typography";
import Card from "core/components/Card";

/**
 * Account-scoped section of the profile page: the signed-in user's email.
 *
 * This is a behaviour-preserving extraction of the email block that used to
 * sit inline in `UserProfile.tsx` -- the account-wide group list and "Join
 * another" control this card eventually hosts land in a later change.
 */
const AccountCard: React.FC = () => {
  const { user } = useAuth();

  return (
    <Card>
      <Card.Content className="space-y-1">
        <Typography id="account-heading" variant="h4">Account</Typography>
        <div className="space-y-1">
          <Typography variant="body-sm" color="secondary">Email</Typography>
          <Typography>{user?.email}</Typography>
        </div>
      </Card.Content>
    </Card>
  );
};

export default AccountCard;
