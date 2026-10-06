## What this changes

<!-- One or two sentences. If this PR is stacked on another, say which, and that it merges after it. -->

## Checks

CI runs all of these on every PR and before the deploy; run them locally first.

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` is fully green — any red is a regression
- [ ] `npm run lint` passes with zero warnings, and `npm run lint:tests` keeps every test file at
      or below its baseline
- [ ] `npm run build` passes — it is the only gate that bundles, and Vite does not type-check
- [ ] `npm run check:bundle` passes after the build; if the ceiling was raised, this PR says what
      grew and why it belongs in the entry bundle
- [ ] If `firebase/` changed: the `firebase/functions` suite passes against the emulators
- [ ] If this PR changes what the app collects, stores, sends to a third party, or
      retains: **`PRIVACY_LAST_UPDATED` in `src/core/constants/privacy.ts` is bumped**
      and `PRIVACY_CHANGELOG` says what changed
