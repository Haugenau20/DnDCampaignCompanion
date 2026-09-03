## What this changes

<!-- One or two sentences. -->

## Checks

- [ ] `npx tsc --noEmit` passes
- [ ] `npm test` passes, with no new failures against the recorded baseline
- [ ] `npm run build` passes — it is not implied by the two above; webpack ignores
      tsconfig `paths`, so `@/…` imports fail here and only here
- [ ] If this PR changes what the app collects, stores, sends to a third party, or
      retains: **`PRIVACY_LAST_UPDATED` in `src/core/constants/privacy.ts` is bumped**
      and `PRIVACY_CHANGELOG` says what changed
