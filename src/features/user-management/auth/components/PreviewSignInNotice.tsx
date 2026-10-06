// src/features/user-management/auth/components/PreviewSignInNotice.tsx
import React from 'react';
import Typography from 'core/components/Typography';

/**
 * Said in place of a sign-in or join form on a pull request's preview site (T110).
 *
 * The refusal is deliberate: a preview runs unmerged code against production
 * data, so it stays signed out (see `isPreviewBuild`). Without this, a reviewer
 * met a form that failed on submit and reasonably took it for a bug.
 */
const PreviewSignInNotice: React.FC = () => (
  <div className="card rounded-lg px-6 py-8" data-testid="preview-signin-notice">
    <Typography variant="h2" className="font-heading text-xl mb-2">
      Preview build: sign-in is off
    </Typography>
    <Typography color="secondary">
      This is a preview of a change that has not been merged yet. It runs
      against the live campaign data, so signing in is turned off here on
      purpose. Check signed-in screens on the dev server instead.
    </Typography>
  </div>
);

export default PreviewSignInNotice;
