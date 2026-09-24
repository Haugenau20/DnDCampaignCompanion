// src/core/services/firebase/config/appCheck.ts
import { FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

/**
 * Attach App Check to a Firebase app, with the site's reCAPTCHA v3 key.
 *
 * Every app instance that talks to production needs its own: App Check is
 * enforced on Authentication, so an app without it has every sign-in refused
 * (`auth/firebase-app-check-token-is-invalid`). That is why this is shared --
 * the default app and the throwaway one in `openDeviceApproval` must be set up
 * the same way.
 *
 * Callers skip it against the emulators (bug #1411).
 *
 * @param app The app to protect
 * @throws When `REACT_APP_RECAPTCHA_SITE_KEY` is not set
 */
export function attachAppCheck(app: FirebaseApp): void {
  const siteKey = process.env.REACT_APP_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    console.error('Missing REACT_APP_RECAPTCHA_SITE_KEY environment variable');
    throw new Error('Missing reCAPTCHA site key');
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true
  });
}
