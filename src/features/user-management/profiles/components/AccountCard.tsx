// src/features/user-management/profiles/components/AccountCard.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/hooks/useAuth";
import { useGroups } from "../../groups/hooks/useGroups";
import Typography from "core/components/Typography";
import Card from "core/components/Card";
import Button, { buttonClasses } from "core/components/Button";
import {
  describeSignInError,
  isPopupDismissed
} from "core/services/firebase/auth/signInErrors";
import type { SignInMethod } from "core/services/firebase/auth/AuthService";

/** How each sign-in method is named on the card. */
const METHOD_LABELS: Record<SignInMethod, string> = {
  email: "Email link",
  google: "Google",
};

/**
 * Account-scoped section of the profile page: the settings that apply to
 * the signed-in user everywhere, in every group they belong to.
 *
 * Shows the sign-in email, the ways into the account, and every group the
 * user is a member of, and links to `/join` for another.
 *
 * **Connect Google is how accounts merge.** Firebase keeps one account per
 * email, but a Google account under a *different* address would otherwise be
 * a second, empty account -- which the invite-only gate refuses to create
 * anyway. Linking it here attaches it to this account instead.
 *
 * "Join another" used to open a dialog here, and the landing behaviour it
 * shared with the header's entrance moved to `useJoinGroupCompletion` so the
 * two could not diverge. Both entrances are now the same route, so they cannot
 * diverge at all -- `/join` owns the completion.
 *
 * The rows stack below `sm`. A fixed 170px label column clipped "Join another"
 * off the card at 320px (T002).
 */
const AccountCard: React.FC = () => {
  const { user, getSignInMethods, linkGoogle } = useAuth();
  const { groups } = useGroups();
  const [methods, setMethods] = useState<SignInMethod[]>(() => getSignInMethods());
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);

  const groupNames = groups.map((group) => group.name).join(", ");

  const handleConnectGoogle = async () => {
    setLinking(true);
    setLinkError(null);
    try {
      await linkGoogle();
      setMethods(getSignInMethods());
    } catch (err) {
      if (!isPopupDismissed(err)) {
        setLinkError(describeSignInError(err));
      }
    } finally {
      setLinking(false);
    }
  };

  const row = "grid grid-cols-1 sm:grid-cols-[170px_minmax(0,1fr)_auto] sm:items-center gap-x-3 gap-y-1";

  return (
    <Card>
      <Card.Content className="space-y-4">
        <div className="space-y-1">
          <Typography id="account-heading" variant="h4">Account</Typography>
        </div>

        <div className="space-y-4 sm:space-y-3">
          <div className={row}>
            <Typography variant="body-sm" color="secondary">Email</Typography>
            <Typography className="break-all">{user?.email}</Typography>
            <Typography variant="body-sm" color="muted">used to sign in</Typography>
          </div>

          <div className={row}>
            <Typography variant="body-sm" color="secondary">Sign in with</Typography>
            <Typography data-testid="sign-in-methods">
              {methods.map((method) => METHOD_LABELS[method]).join(" · ")}
            </Typography>
            {methods.includes("google") ? (
              <span aria-hidden="true" />
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleConnectGoogle}
                isLoading={linking}
                disabled={linking}
                className="justify-self-start"
              >
                Connect Google
              </Button>
            )}
          </div>

          {linkError && (
            <div
              role="alert"
              className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
            >
              <Typography variant="body-sm">{linkError}</Typography>
            </div>
          )}

          <div className={row}>
            <Typography variant="body-sm" color="secondary">Groups you&apos;re in</Typography>
            <Typography>{groupNames}</Typography>
            <Link
              to="/join"
              className={buttonClasses({ variant: "ghost", size: "sm", className: "justify-self-start" })}
            >
              Join another
            </Link>
          </div>
        </div>
      </Card.Content>

    </Card>
  );
};

export default AccountCard;
