// src/features/user-management/auth/pages/EmailLinkPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import { describeSignInError } from 'core/services/firebase/auth/signInErrors';
import { useAuth } from '../hooks/useAuth';
import { useInvitations } from '../../groups/hooks/useInvitations';
import { readSignInLinkIntent } from '../utils/email-link';
import { safeNextPath, CAMPAIGN_HOME } from '../utils/next-path';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where the page is. */
type Phase = 'invalid' | 'needEmail' | 'working' | 'failed';

/**
 * `/auth/link` -- where a magic sign-in link lands.
 *
 * Finishes the sign-in, then does whatever the link was sent for: redeem an
 * invitation (the join page's email path) or go to `next` (the sign-in
 * page's). Both travel in the link's own URL, so the link works on any device;
 * only the address is remembered locally, and when it is missing -- the link
 * was opened on another device -- the page asks for it.
 *
 * A brand-new account whose invitation then cannot be redeemed (the name was
 * taken meanwhile, the invitation was spent) is deleted again: an account in
 * no group can see nothing, and leaving it would count against the account
 * limit for nothing. The reader is sent back to the invitation to try again.
 */
const EmailLinkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isSignInLink,
    getPendingEmailSignIn,
    completeSignInLink,
    deleteFreshAccount,
    reloadUserContext
  } = useAuth();
  const { joinGroupWithToken } = useInvitations();

  const intent = useMemo(() => readSignInLinkIntent(searchParams), [searchParams]);
  // The link as it was opened. Navigating away changes `window.location`, and
  // the one-time code in it must be read exactly once.
  const [link] = useState(() => window.location.href);
  const [pending] = useState(() => getPendingEmailSignIn());
  const [phase, setPhase] = useState<Phase>(() =>
    !isSignInLink(link) ? 'invalid' : pending ? 'working' : 'needEmail'
  );
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const inviteLink = intent.invitation
    ? `/join?groupId=${encodeURIComponent(intent.invitation.groupId)}&token=${encodeURIComponent(intent.invitation.token)}`
    : null;

  const finish = useCallback(
    async (address: string, rememberMe: boolean) => {
      setPhase('working');
      setError(null);

      let isNewUser: boolean;
      try {
        ({ isNewUser } = await completeSignInLink(address, link, rememberMe));
      } catch (err) {
        setError(describeSignInError(err));
        setPhase('failed');
        return;
      }

      if (intent.invitation) {
        try {
          await joinGroupWithToken(intent.invitation.token, intent.invitation.username);
        } catch (err) {
          if (isNewUser) {
            try {
              await deleteFreshAccount();
            } catch (deleteError) {
              console.error('Error cleaning up an account whose invitation failed:', deleteError);
            }
          }
          setError(err instanceof Error ? err.message : 'Could not join the group');
          setPhase('failed');
          return;
        }
        await reloadUserContext();
        navigate(CAMPAIGN_HOME, { replace: true });
        return;
      }

      navigate(safeNextPath(intent.next) ?? CAMPAIGN_HOME, { replace: true });
    },
    [completeSignInLink, deleteFreshAccount, intent, joinGroupWithToken, link, navigate, reloadUserContext]
  );

  // Same browser as the one that asked: finish at once, exactly once.
  useEffect(() => {
    if (started.current || phase !== 'working' || !pending) return;
    started.current = true;
    finish(pending.email, pending.rememberMe);
  }, [finish, pending, phase]);

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) return;
    finish(email.trim(), false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Typography variant="h1" className="font-heading text-2xl mb-6">
        {intent.invitation ? 'Joining your group' : 'Signing you in'}
      </Typography>

      {phase === 'working' && (
        <div role="status" aria-busy="true" className="space-y-3">
          <Typography color="secondary">
            {intent.invitation ? 'Signing you in and joining the group…' : 'Signing you in…'}
          </Typography>
          <div className="h-2 rounded animate-pulse bg-secondary" aria-hidden="true" />
        </div>
      )}

      {phase === 'invalid' && (
        <div className="card rounded-lg px-6 py-6 space-y-3">
          <Typography variant="h2" className="font-heading text-xl">
            This is not a sign-in link
          </Typography>
          <Typography color="secondary">
            The link may have been cut short when it was copied. Ask for a new
            one from the sign-in page.
          </Typography>
          <Link to="/signin" className="button-link underline">
            Go to sign in
          </Link>
        </div>
      )}

      {phase === 'needEmail' && (
        <form onSubmit={handleEmailSubmit} className="card rounded-lg px-6 py-6 space-y-4">
          <Typography color="secondary">
            This link was opened on a different device or browser from the one
            that asked for it. Confirm the email address it was sent to.
          </Typography>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button
            type="submit"
            disabled={!EMAIL.test(email.trim())}
            className="w-full min-h-[2.75rem]"
          >
            Continue
          </Button>
        </form>
      )}

      {phase === 'failed' && (
        <div className="card rounded-lg px-6 py-6 space-y-4">
          <div
            role="alert"
            className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
          >
            <Typography variant="body-sm">{error}</Typography>
          </div>
          {inviteLink ? (
            <Link to={inviteLink} className="button-link underline">
              Back to the invitation
            </Link>
          ) : (
            <Link to="/signin" className="button-link underline">
              Back to sign in
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default EmailLinkPage;
