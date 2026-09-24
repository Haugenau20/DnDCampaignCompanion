import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useDeviceSignInWait } from '../hooks/useDeviceSignInWait';
import type { DeviceSignInRequest } from 'core/services/firebase/auth/AuthService';
import Typography from 'core/components/Typography';
import Input from 'core/components/Input';
import Button from 'core/components/Button';
import { Mail } from 'lucide-react';
import clsx from 'clsx';
import {
  describeSignInError,
  isPopupDismissed
} from 'core/services/firebase/auth/signInErrors';
import { signInLinkUrl } from '../utils/email-link';
import DevEmailLinkShortcut from './DevEmailLinkShortcut';

interface SignInFormProps {
  /**
   * Called once a sign-in has completed on this page: Google, or another
   * device approving this one.
   */
  onSuccess?: () => void;
  /**
   * Where a magic link should take the reader once it has signed them in.
   * Already validated by the page (`safeNextPath`).
   */
  next?: string | null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * The sign-in form. Passwordless: a magic link by email, or Google.
 *
 * No `Card` and no header of its own. `SignInPage` titles it once; wrapping it
 * in a titled card inside a titled dialog is what produced the two "Sign In"
 * headings that made the case for this phase in the first place.
 *
 * No "Create Account" button either. Accounts come from invitations -- the
 * `gateAccountCreation` blocking function refuses any other -- so the honest
 * thing is a sentence saying so and a link to `/join`. Asking for a link for
 * an address with no account still sends one, because Firebase does not say
 * whether an address has an account; the refusal comes when the link is
 * opened, and that page explains it.
 *
 * Every link also opens a request for *this* device to be signed in from the
 * one the link is opened on -- usually a phone, where the inbox is. The
 * "Check your inbox" screen shows the code to type there, and signs this
 * device in by itself once it is approved. If the request cannot be opened,
 * the link is sent without it: signing in on the device that opens the link
 * must never depend on it.
 */
const SignInForm: React.FC<SignInFormProps> = ({ onSuccess, next }) => {
  const [email, setEmail] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'link' | 'google' | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [deviceRequest, setDeviceRequest] = useState<DeviceSignInRequest | null>(null);
  const [signingInHere, setSigningInHere] = useState(false);

  const { sendSignInLink, signInWithGoogle, startDeviceSignIn, signInWithDeviceToken } = useAuth();

  const deviceWait = useDeviceSignInWait(deviceRequest, async (token) => {
    setSigningInHere(true);
    setError(null);
    try {
      await signInWithDeviceToken(token, rememberMe);
      onSuccess?.();
    } catch (err) {
      setError(describeSignInError(err));
      setSigningInHere(false);
    }
  });

  const emailValid = EMAIL.test(email.trim());
  const busy = pending !== null;

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailValid || busy) return;
    setError(null);
    setPending('link');

    try {
      const address = email.trim();
      let request: DeviceSignInRequest | null = null;
      try {
        request = await startDeviceSignIn(address);
      } catch (err) {
        console.error('Could not open a request to sign in from another device:', err);
      }
      await sendSignInLink(
        address,
        signInLinkUrl(window.location.origin, { next, device: request?.requestId }),
        rememberMe
      );
      setDeviceRequest(request);
      setSentTo(address);
    } catch (err) {
      setError(describeSignInError(err));
    } finally {
      setPending(null);
    }
  };

  const handleGoogle = async () => {
    if (busy) return;
    setError(null);
    setPending('google');

    try {
      await signInWithGoogle(rememberMe);
      onSuccess?.();
    } catch (err) {
      if (!isPopupDismissed(err)) {
        setError(
          describeSignInError(
            err,
            'There is no account for this Google address. Accounts are created from an invitation link — ask someone in your group for one.'
          )
        );
      }
    } finally {
      setPending(null);
    }
  };

  if (sentTo) {
    return (
      <div className="w-full space-y-4" data-testid="sign-in-link-sent">
        <div
          role="status"
          className="rounded-md border px-3 py-3 feedback-banner feedback-banner-success"
        >
          <Typography className="font-medium">Check your inbox</Typography>
          <Typography variant="body-sm">
            We sent a sign-in link to <strong>{sentTo}</strong>. Open it on
            this device and you are in — no password needed.
          </Typography>
        </div>
        {deviceRequest && (
          <div className="card rounded-lg px-4 py-4 space-y-2" data-testid="device-sign-in">
            {deviceWait === 'expired' ? (
              <Typography variant="body-sm" color="secondary">
                The code for signing in from another device has expired. Opening
                the link on this device still works, or send a new one.
              </Typography>
            ) : (
              <>
                <Typography variant="body-sm">
                  Opening the email on another device, like your phone? Choose{' '}
                  <strong>Sign in on the other device</strong> there and enter
                  this code:
                </Typography>
                <Typography
                  className="font-heading text-3xl tracking-[0.4em] text-center py-1"
                  aria-label={`Code ${deviceRequest.code.split('').join(' ')}`}
                >
                  {deviceRequest.code}
                </Typography>
                <Typography variant="body-sm" color="secondary" role="status">
                  {signingInHere ? 'Approved — signing you in…' : 'This page signs you in by itself once you have.'}
                </Typography>
              </>
            )}
          </div>
        )}
        {error && (
          <div
            role="alert"
            className="rounded-md border px-3 py-2 feedback-banner feedback-banner-error"
          >
            <Typography variant="body-sm">{error}</Typography>
          </div>
        )}
        <Typography variant="body-sm" color="secondary">
          Nothing there after a minute? Check your spam folder, or{' '}
          <button
            type="button"
            className="button-link underline"
            onClick={() => {
              setSentTo(null);
              setDeviceRequest(null);
              setError(null);
            }}
          >
            use a different email
          </button>
          .
        </Typography>
        <DevEmailLinkShortcut email={sentTo} />
      </div>
    );
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSendLink} className="space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={busy}
        />

        <div className="flex items-center">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className={clsx(
              "h-4 w-4 rounded focus:ring-offset-1",
              `input`,
              `focus:primary card-border`
            )}
            disabled={busy}
          />
          <label
            htmlFor="rememberMe"
            className={clsx(
              "ml-2 block text-sm",
              `typography`
            )}
          >
            Keep me signed in for 30 days
          </label>
        </div>

        {/* Washed ground, hue at the boundary, body ink for the text. Putting
            the hue's own ink on its own wash is the pairing the colour schema
            forbids. */}
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
          disabled={busy || !emailValid}
          className="w-full min-h-[2.75rem]"
          startIcon={<Mail />}
          isLoading={pending === 'link'}
        >
          {pending === 'link' ? 'Sending link...' : 'Email me a sign-in link'}
        </Button>
      </form>

      <div className="my-4 flex items-center gap-3" aria-hidden="true">
        <div className="flex-1 border-t card-divider" />
        <Typography variant="body-sm" color="muted">or</Typography>
        <div className="flex-1 border-t card-divider" />
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={handleGoogle}
        disabled={busy}
        isLoading={pending === 'google'}
        className="w-full min-h-[2.75rem]"
      >
        Continue with Google
      </Button>

      <div className="mt-6 pt-6 border-t card-divider">
        <Typography className="font-medium mb-1">New to this group?</Typography>
        <Typography variant="body-sm" color="secondary">
          Accounts are created from an invitation. Open the link an admin sent
          you, or{' '}
          <Link to="/join" className="button-link underline">
            paste its token
          </Link>
          .
        </Typography>
      </div>
    </div>
  );
};

export default SignInForm;
