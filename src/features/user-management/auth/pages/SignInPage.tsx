// src/features/user-management/auth/pages/SignInPage.tsx
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SignInForm from '../components/SignInForm';
import { safeNextPath, CAMPAIGN_HOME } from '../utils/next-path';

/**
 * `/signin` -- the sign-in form, as a page that can hold a destination.
 *
 * The destination is the whole reason this is a route. A dialog has nowhere to
 * put "you were heading to Locations", so a deep link followed while signed
 * out either lost where you were going or had to be remembered in state that
 * a reload throws away. `?next=` survives the reload.
 *
 * The form renders exactly as it does in the dialog today, container and all:
 * the split band, the single title and the removal of "Create Account" are
 * 14-4's, and doing them here would restyle a surface this PR only exists to
 * make reachable.
 */
const SignInPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  /**
   * Validated on the way out, not on the way in.
   *
   * Reading it here and navigating to it unchecked is the open redirect D45
   * names -- `safeNextPath` is the only thing standing between a crafted link
   * and a sign-in page on this origin that hands the session to another.
   */
  const handleSuccess = () => {
    navigate(safeNextPath(searchParams.get('next')) ?? CAMPAIGN_HOME, {
      replace: true,
    });
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <SignInForm onSuccess={handleSuccess} />
    </div>
  );
};

export default SignInPage;
