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
import { founderLinkPath } from '../../groups/utils/founder-link';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where the page is. */
type Phase =
  | 'invalid'
  | 'needEmail'
  | 'working'
  | 'revealing'
  | 'code'
  | 'failed';

/**
 * A code split in two halves, "482 913", the way the boxes it is typed into
 * are grouped.
 * @param code The code
 */
const groupCode = (code: string): string => {
  const half = Math.ceil(code.length / 2);
  return `${code.slice(0, half)} ${code.slice(half)}`;
};

/**
 * `/auth/link` -- where a magic sign-in link lands.
 *
 * Finishes the sign-in, then does whatever the link was sent for: redeem an
 * invitation (the join page's email path), go back to a founder link (T127),
 * or go to `next` (the sign-in page's). Both travel in the link's own URL, so the link works on any device;
 * only the address is remembered locally, and when it is missing -- the link
 * was opened on another device -- the page asks for it.
 *
 * A brand-new account whose invitation then cannot be redeemed (the name was
 * taken meanwhile, the invitation was spent) is deleted again: an account in
 * no group can see nothing, and leaving it would count against the account
 * limit for nothing. The reader is sent back to the invitation to try again.
 *
 * A plain sign-in link that carries a `device` request, opened somewhere other
 * than the browser that asked for it -- usually a phone with the inbox, while
 * a laptop asked -- signs nobody in here. It approves the request and shows
 * the code to type on the device that asked (see `approveDeviceSignIn`). The
 * reader is not asked for anything: the request knows the address, and the
 * link itself is the proof.
 */
const EmailLinkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    isSignInLink,
    getPendingEmailSignIn,
    completeSignInLink,
    deleteFreshAccount,
    reloadUserContext,
    lookUpDeviceSignIn,
    approveDeviceSignIn
  } = useAuth();
  const { joinGroupWithToken } = useInvitations();

  const intent = useMemo(() => readSignInLinkIntent(searchParams), [searchParams]);
  // The link as it was opened. Navigating away changes `window.location`, and
  // the one-time code in it must be read exactly once.
  const [link] = useState(() => window.location.href);
  /*
    The link this browser is waiting on, if it is this one. A link carrying a
    device request was asked for by the browser holding that same request; any
    other browser approves it for that device instead, even one waiting on a
    link of its own. Letting any remembered address win tried to sign in here
    with the wrong address and never approved the device (AUTH-004).
  */
  const [pending] = useState(() => {
    const stored = getPendingEmailSignIn();
    return stored && (!intent.device || stored.device === intent.device) ? stored : null;
  });
  const [phase, setPhase] = useState<Phase>(() =>
    !isSignInLink(link)
      ? 'invalid'
      : pending
        ? 'working'
        : intent.device
          ? 'revealing'
          : 'needEmail'
  );
  const [email, setEmail] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Set when the remembered address was refused, so the page asks for it. */
  const [askAddress, setAskAddress] = useState(false);
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
        // The address is wrong, not the link, so the link still works: ask
        // for the right one rather than leaving only "Back to sign in".
        setAskAddress((err as { code?: string } | null)?.code === 'auth/invalid-email');
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

      // A founder link is spent by naming the group, which the link's page
      // asks for next. `next` cannot carry it: `/join` is never a `next`.
      if (intent.founder) {
        navigate(founderLinkPath(intent.founder), { replace: true });
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

  // Another device asked: approve it and show its code, exactly once -- the
  // link can be used only once.
  useEffect(() => {
    const device = intent.device;
    if (started.current || phase !== 'revealing' || !device) return;
    started.current = true;
    (async () => {
      try {
        const address = await lookUpDeviceSignIn(device);
        setCode(await approveDeviceSignIn(address, link, device));
        setPhase('code');
      } catch (err) {
        // An expired or already-used request, or a spent link.
        setError(describeSignInError(err));
        setPhase('failed');
      }
    })();
  }, [approveDeviceSignIn, intent.device, link, lookUpDeviceSignIn, phase]);

  const handleEmailSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(email.trim())) return;
    finish(email.trim(), false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <Typography variant="h1" className="font-heading text-2xl mb-6">
        {intent.invitation
          ? 'Joining your group'
          : phase === 'revealing' || phase === 'code'
            ? 'Your sign-in code'
            : 'Signing you in'}
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

      {phase === 'revealing' && (
        <div role="status" aria-busy="true" className="space-y-3">
          <Typography color="secondary">Getting your code…</Typography>
          <div className="h-2 rounded animate-pulse bg-secondary" aria-hidden="true" />
        </div>
      )}

      {phase === 'code' && code && (
        <div className="card rounded-lg px-6 py-6 space-y-4" data-testid="device-sign-in-code">
          <Typography color="secondary">
            Type this code on the device you are signing in on:
          </Typography>
          <Typography
            className="font-heading text-4xl tracking-[0.2em] text-center py-2 whitespace-nowrap"
            aria-label={`Code ${code.split('').join(' ')}`}
          >
            {groupCode(code)}
          </Typography>
          <Typography variant="body-sm" color="secondary">
            It works once, for a few minutes. Do not give it to anyone — nobody
            from this site will ever ask for it. Nothing was signed in here, so
            you can close this page once you are in.
          </Typography>
        </div>
      )}

      {(phase === 'needEmail' || (phase === 'failed' && askAddress)) && (
        <form onSubmit={handleEmailSubmit} className="card rounded-lg px-6 py-6 space-y-4">
          {phase === 'failed' ? (
            <>
              <div
                role="alert"
                className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
              >
                <Typography variant="body-sm">{error}</Typography>
              </div>
              <Typography color="secondary">
                Enter the email address the link was sent to.
              </Typography>
            </>
          ) : (
            <Typography color="secondary">
              This link was opened on a different device or browser from the one
              that asked for it. Confirm the email address it was sent to.
            </Typography>
          )}
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

      {phase === 'failed' && !askAddress && (
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
