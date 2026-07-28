# Bug #1300 — Firebase App Check never initializes in production

## Title
`initializeAppCheck(getApp(), …)` throws `app/no-app` at startup because nothing has called
`initializeApp()` yet — App Check has been silently disabled in production since Phase 3e

## Status
✅ FIXED

## Category
ARCHITECTURE

## Discovered In
Not surfaced by a test. Reported from the **live site's browser console**:

```
Failed to initialize Firebase App Check: FirebaseError: Firebase: No Firebase App '[DEFAULT]'
has been created - call initializeApp() first (app/no-app).
    at Jn (api.ts:343:25)
    at index.tsx:40:24
```

## Affected File
`src/index.tsx` (the App Check block, lines 27–44 as filed)

## Description

`src/index.tsx` calls `initializeAppCheck(getApp(), appCheckConfig)` at module scope. `getApp()`
throws unless `initializeApp()` has already run. In this codebase `initializeApp()` is called in
exactly **one** place — `BaseFirebaseService`'s constructor
(`src/core/services/firebase/core/BaseFirebaseService.ts:42`) — which only runs via
`initializeFirebaseServices()`.

`index.tsx` never imports the Firebase barrel. It was relying on an **import side effect**:

- `index.tsx:6` imports `app/App`
- `App.tsx` imports `features/user-management`, whose `FirebaseContext.tsx` imports
  `core/services/firebase`
- and that barrel used to end with `const firebaseServices = initializeFirebaseServices();` at
  **module scope**

Because ES module imports are fully evaluated before the importing module's own body runs, Firebase
was always initialized by the time line 40 executed. Nothing in `index.tsx` expressed this
dependency; it worked by accident.

Commit `69d19c2` (Phase 3e) deliberately removed that side effect — memoizing initialization behind
`getFirebaseServices()` with lazy `Proxy` stand-ins — so that importing the barrel could no longer
eagerly initialize Firebase and crash jsdom. That was the correct change, and the file's own comment
states initialization "must never run at module scope." But it removed the free ride, and App Check
broke with it.

### Impact

App Check is **never initialized**. The `try`/`catch` on lines 42–44 swallows the error into a
`console.error`, so the app renders and functions normally — which is why this survived a merge to
production. If App Check enforcement is set to *Enforce* on Firestore or Cloud Functions, requests
would be rejected; in *Monitor* mode it is a silent loss of abuse protection.

## Why no check caught it — four independent layers

1. **`index.tsx` swallows the error.** A `console.error`, not a crash.
2. **`index.test.tsx` mocks `app/App`**, severing the exact import chain that did the initializing.
   The suite was blind to this by construction — before *and* after the regression — so it could
   never have caught it.
3. **`setupTests.ts:29-32` globally mocks `firebase/app`** with `getApp: jest.fn()`, which returns
   `undefined` unconditionally and never throws. Running the index suite against the *unfixed* code
   printed **"Firebase App Check initialized successfully"** — the exact opposite of production.
4. **`tsc --noEmit` and `npm run build` are structurally incapable** of seeing a runtime ordering
   bug. All three of the project's standard gates were green throughout.

## Reproduction

1. Load the deployed site (or any build served normally).
2. Open the browser console.
3. Observe `Failed to initialize Firebase App Check: FirebaseError: … (app/no-app)`.

## Expected vs Actual

**Expected**: App Check initializes at startup and attaches tokens to Firebase requests.

**Actual**: `getApp()` throws, the catch swallows it, App Check is never initialized, and the only
signal is a console error nobody sees.

## Fix

`index.tsx` now calls `getFirebaseServices()` immediately before `getApp()`, making the dependency
explicit instead of accidental. This restores exactly the ordering that held before Phase 3e —
services constructed, then App Check — and matches `getFirebaseServices()`'s own doc comment:
*"Prefer this over the exported constants when you want the initialization point to be explicit."*

This does **not** undo Phase 3e. Eager initialization now happens only in the composition root,
which is where side effects belong; importing the barrel from anywhere else remains side-effect
free, so the jsdom hazard that motivated the lazy change stays closed.

## Regression test

`src/__tests__/index.test.tsx` gained a `Firebase App Check` block with four tests. Making them
meaningful required a **local `firebase/app` mock that models the real contract** — `getApp()`
throws `app/no-app` until `initializeApp()` has run — because the global mock in `setupTests.ts`
cannot distinguish an initialized app from a missing one.

Proven against the reverted fix: **4 failed, 9 passed**, including the captured production error
string. With the fix: **13 passed**.

One trap worth recording: `index.tsx` is loaded inside `jest.isolateModules()`, which builds a fresh
module registry and re-runs every mock factory. Assertions must read module-scoped capture variables,
not the `jest.fn` instances a `require()` returns outside the isolated registry — those are different
objects, and asserting on them reports zero calls no matter what the code did. The first draft of
this test failed for exactly that reason and looked like a failing fix.

## Generalisable lesson

**A scan for references to a module never finds the code that depends on its side effects.**
Phase 3e's audits traced imports of the Firebase barrel exhaustively and correctly. `index.tsx` was
invisible to all of them, because it does not reference the barrel — it referenced something that
referenced it, and depended on what that import *did*. This is the same family as the `user-utils.ts`
trap recorded in `docs/testing/post-test-coverage-roadmap.md` (a scan for references *to* a moved
file never sees that file's *own* dependencies), one level further out.

When removing a module-scope side effect, the question is not "who imports this?" but **"what
observable state did importing this establish, and who reads that state without asking for it?"**

## Related
- Phase 3e finding 3 (`docs/testing/post-test-coverage-roadmap.md`) — the lazy-initialization change
  that introduced this, and the jsdom crash it correctly fixed.
