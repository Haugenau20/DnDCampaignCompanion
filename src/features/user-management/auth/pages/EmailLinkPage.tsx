// src/features/user-management/auth/pages/EmailLinkPage.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import { describeSignInError } from 'core/services/firebase/auth/signInErrors';
import type { DeviceApproval } from 'core/services/firebase/auth/deviceApproval';
import { useAuth } from '../hooks/useAuth';
import { useInvitations } from '../../groups/hooks/useInvitations';
import { readSignInLinkIntent } from '../utils/email-link';
import { safeNextPath, CAMPAIGN_HOME } from '../utils/next-path';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE = /^\d{4}$/;

/** Where the page is. */
type Phase =
  | 'invalid'
  | 'choose'
  | 'needEmail'
  | 'approve'
  | 'approved'
  | 'working'
  | 'failed';

/**
 * The error code a refusal carries, if any. A callable's `invalid-argument`
 * is a mistyped code, which may be retried; anything else ends the approval.
 * @param err Whatever the approval threw
 */
const errorCode = (err: unknown): string | undefined => {
  const code = (err as { code?: unknown })?.code;
  return typeof code === 'string' ? code : undefined;
};

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
 *
 * A plain sign-in link that carries a `device` request, opened somewhere other
 * than the browser that asked for it, first asks *which* device to sign in:
 * this one, or the one that asked -- usually a laptop that asked, and a phone
 * with the inbox. Approving the other one takes the code it shows, and signs
 * in only that one (see `openDeviceApproval`).
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
    startDeviceApproval
  } = useAuth();
  const { joinGroupWithToken } = useInvitations();

  const intent = useMemo(() => readSignInLinkIntent(searchParams), [searchParams]);
  // The link as it was opened. Navigating away changes `window.location`, and
  // the one-time code in it must be read exactly once.
  const [link] = useState(() => window.location.href);
  const [pending] = useState(() => getPendingEmailSignIn());
  const [phase, setPhase] = useState<Phase>(() =>
    !isSignInLink(link)
      ? 'invalid'
      : pending
        ? 'working'
        : intent.device
          ? 'choose'
          : 'needEmail'
  );
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);
  // The throwaway sign-in that approves. Kept open while the form is up: the
  // link can be used once, and a mistyped code should not cost it.
  const approval = useRef<DeviceApproval | null>(null);

  const closeApproval = useCallback(() => {
    const open = approval.current;
    approval.current = null;
    open?.close().catch((err) => console.error('Error closing the approval sign-in:', err));
  }, []);

  useEffect(() => closeApproval, [closeApproval]);

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

  const handleApproveSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const device = intent.device;
    if (!device || approving || !EMAIL.test(email.trim()) || !CODE.test(code)) return;
    setApproving(true);
    setError(null);

    let open = approval.current;
    if (!open) {
      try {
        open = await startDeviceApproval(email.trim(), link);
        approval.current = open;
      } catch (err) {
        // The link itself was refused -- another address, or already used.
        setError(describeSignInError(err));
        setPhase('failed');
        setApproving(false);
        return;
      }
    }

    try {
      await open.approve(device, code);
      closeApproval();
      setPhase('approved');
    } catch (err) {
      setError(describeSignInError(err));
      if (errorCode(err) === 'functions/invalid-argument') {
        setCode('');
      } else {
        closeApproval();
        setPhase('failed');
      }
    } finally {
      setApproving(false);
    }
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

      {phase === 'choose' && (
        <div className="card rounded-lg px-6 py-6 space-y-4">
          <Typography color="secondary">
            This link was asked for on another device. Which one do you want
            to sign in?
          </Typography>
          <Button className="w-full min-h-[2.75rem]" onClick={() => setPhase('approve')}>
            Sign in on the other device
          </Button>
          <Button
            variant="outline"
            className="w-full min-h-[2.75rem]"
            onClick={() => setPhase('needEmail')}
          >
            Sign in on this device
          </Button>
        </div>
      )}

      {phase === 'approve' && (
        <form onSubmit={handleApproveSubmit} className="card rounded-lg px-6 py-6 space-y-4">
          <Typography color="secondary">
            Enter the email address the link was sent to, and the code the
            other device is showing. This device stays signed out.
          </Typography>
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            // Fixed once the link has been used to prove it.
            disabled={approving || approval.current !== null}
          />
          <Input
            label="Code from the other device"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={4}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            required
            disabled={approving}
          />
          {error && (
            <div
              role="alert"
              className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
            >
              <Typography variant="body-sm">{error}</Typography>
            </div>
          )}
          <Button
            type="submit"
            disabled={approving || !EMAIL.test(email.trim()) || !CODE.test(code)}
            isLoading={approving}
            className="w-full min-h-[2.75rem]"
          >
            Approve the other device
          </Button>
          <button
            type="button"
            className="button-link underline text-sm"
            onClick={() => {
              closeApproval();
              setError(null);
              setPhase('choose');
            }}
            disabled={approving}
          >
            Back
          </button>
        </form>
      )}

      {phase === 'approved' && (
        <div role="status" className="card rounded-lg px-6 py-6 space-y-3">
          <Typography variant="h2" className="font-heading text-xl">
            Approved
          </Typography>
          <Typography color="secondary">
            Your other device is signing in now. Nothing was signed in here, so
            you can close this page.
          </Typography>
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
