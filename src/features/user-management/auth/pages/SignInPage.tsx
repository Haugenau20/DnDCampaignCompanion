// src/features/user-management/auth/pages/SignInPage.tsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Typography from 'core/components/Typography';
import SignInForm from '../components/SignInForm';
import { safeNextPath, CAMPAIGN_HOME } from '../utils/next-path';
import { nextLabel } from '../utils/next-label';

/**
 * `/signin` -- the sign-in form, as a page that can hold a destination.
 *
 * The destination is the whole reason this is a route. A dialog has nowhere to
 * put "you were heading to Locations", so a deep link followed while signed out
 * either lost where you were going or had to be remembered in state a reload
 * throws away. `?next=` survives the reload.
 *
 * Split page: the band carries the framing, the page surface carries the form,
 * and the form is titled **once** -- here, not by a card inside it.
 */
const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * Validated on the way out, not on the way in.
   *
   * Reading it and navigating to it unchecked is the open redirect D45 names --
   * `safeNextPath` is the only thing between a crafted link and a sign-in page
   * on this origin that hands the session to another.
   */
  const destination = safeNextPath(searchParams.get('next'));
  const label = nextLabel(destination);

  const handleSuccess = () => {
    navigate(destination ?? CAMPAIGN_HOME, { replace: true });
  };

  return (
    // Cancels `main`'s padding so the two halves meet the chrome, exactly as
    // the admin band does.
    <div className="-mx-4 -mt-4 -mb-4 min-h-[calc(100vh-4rem)] grid grid-cols-1 md:grid-cols-2">
      {/* At phone width this is a compressed header above the form, not a
          column beside it. */}
      <aside className="hero-band px-6 py-10 md:py-16 md:px-12 flex flex-col justify-between gap-10">
        <Typography variant="body-sm" className="font-heading text-lg">
          D&amp;D Campaign Companion
        </Typography>

        <div className="max-w-md">
          <Typography
            variant="body-sm"
            className="hero-eyebrow text-[11px] font-semibold uppercase tracking-wider"
          >
            Private campaign
          </Typography>
          <Typography variant="h1" className="mt-3 text-3xl md:text-4xl">
            Sign in to see where your party has been.
          </Typography>
          <Typography className="hero-muted mt-4">
            Locations, rumours, quests and notes, written by the people at the
            table and kept between sessions.
          </Typography>
        </div>

        {/* Only when there is a destination worth naming. A path is not a
            name, so an unrecognised one prints nothing at all. */}
        {label ? (
          <Typography variant="body-sm" className="hero-muted max-w-md">
            You were heading to{' '}
            <span className="font-heading">{label}</span>. We'll take you back
            there.
          </Typography>
        ) : (
          <span aria-hidden="true" />
        )}
      </aside>

      <main className="px-6 py-10 md:py-16 md:px-12 flex items-center justify-center">
        <div className="w-full max-w-sm">
          {/* The one title on this page. */}
          <Typography variant="h2" className="font-heading text-2xl mb-6">
            Sign in
          </Typography>
          <SignInForm onSuccess={handleSuccess} next={destination} />
        </div>
      </main>
    </div>
  );
};

export default SignInPage;
