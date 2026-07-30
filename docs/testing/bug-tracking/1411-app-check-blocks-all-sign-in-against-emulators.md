# Bug #1411 — App Check makes every local sign-in fail against the emulators

## Title
App Check is initialized unconditionally, including when the app is pointed at the emulators. Its
debug token is not registered in the Firebase console, the token exchange returns 403, and because
Auth attaches an App Check token to its requests, **every local sign-in fails before the credentials
are checked.**

## Status
🟡 FIX WRITTEN, NOT COMMITTED — ⚠️ **blocked on authorisation to update two of #1300's regression
tests.** See "What blocks the fix".

## Category
INTEGRATION

## Discovered In
Driving the running dev server in Chrome, 2026-07-29. Reported independently by the repository owner
in the same session: *"the development site has issues with login in chrome. the production site
works in chrome though."*

## Affected File
`src/index.tsx:25-56`

## Description

Verified from the browser console against the running app:

```
Sign in error: FirebaseError: AppCheck: Fetch server returned an HTTP error status.
HTTP status: 403. (appCheck/fetch-status-error)
    at exchangeToken … at AuthImpl._getAppCheckToken … at AuthService.signIn
```

The credentials were never in doubt — the auth emulator holds all 8 sample accounts with
`password=password123`, confirmed by querying it directly. The request fails in
`_getAppCheckToken`, *before* the sign-in request is sent.

**App Check has no emulator.** It attests against the real Google backend even when Auth, Firestore
and Functions are all pointed at localhost. In development `src/index.tsx:17` sets
`window.FIREBASE_APPCHECK_DEBUG_TOKEN = true`, so the SDK generates a debug token and logs:

> App Check debug token: `<uuid>`. You will need to add it to your app's App Check settings in the
> Firebase console for it to work.

Nobody has added it. So the exchange 403s, and Auth — which attaches an App Check token to every
request — fails with it.

**Production is unaffected**, because there `ReCaptchaV3Provider` attests properly with a registered
site key. Exactly matching the owner's report.

### This is a dormant neighbour woken by fixing #1300

`git log -S "getFirebaseServices();" -- src/index.tsx` returns a single commit: **`9800f83`, the
[#1300](./1300-app-check-never-initialized-lazy-firebase-init.md) fix.** Before it, `getApp()` threw
`app/no-app` here and the surrounding `catch` swallowed it, so **App Check never initialized at all —
in any environment.** Local sign-in worked by accident. Making App Check work in production is
precisely what broke it locally.

Same shape as [#018 → #852](./852-chapter-progress-overwritten-not-merged.md): fixing a bug activates
a dormant neighbour.

## Reproduction

1. `.\scripts\start-dev.ps1 -Action start`, open `http://localhost:3000` in Chrome.
2. Sign in with any sample account (e.g. `dm@example.com` / `password123`).
3. "Invalid email or password" — and the console shows `appCheck/fetch-status-error`, HTTP 403.

## Expected vs Actual

**Expected**: local development against the emulators does not depend on a cloud attestation service.
**Actual**: no one can sign in locally at all.

## Fix (written, not committed)

Skip App Check when `useEmulators` is true; `getFirebaseServices()` is still called so #1300's
guarantee that Firebase is initialized before anything calls `getApp()` is preserved. The emulators
do not verify App Check tokens, so nothing is lost locally, and production behaviour is unchanged.

**Verified in the browser**: after the change, sign-in succeeds and the app loads real campaign data.

### ⚠️ What blocks the fix

`src/setupTests.ts:6` sets `REACT_APP_USE_EMULATORS = 'true'` for **every** jest run, so under test
`useEmulators` is always true and App Check is now skipped. Two of #1300's regression tests fail:

- `calls initializeAppCheck — getApp() did not throw app/no-app`
- `passes the reCAPTCHA site key and auto-refresh to initializeAppCheck`

Those tests exist specifically to stop App Check silently not initializing in production, which is
what #1300 was. They assert the **unconditional** contract; this fix makes it conditional. There is
no version of this fix that unblocks local sign-in while still calling `initializeAppCheck`
unconditionally — the contract genuinely changes.

**Editing them requires the owner's explicit authorisation** (this project's standing rule), so the
fix is held uncommitted. The proposed update keeps #1300's guarantee intact by asserting the
conditional contract in both directions: App Check initializes when `useEmulators` is false, and is
skipped when it is true.

### Alternatives considered

- **Register the debug token in the Firebase console.** No code change, but it is per developer, per
  browser profile, and manual — and the token is re-logged every session.
- **Pin a fixed debug token via env var and register that once.** Still needs console setup, and
  leaves App Check pointlessly running against a local stack.
