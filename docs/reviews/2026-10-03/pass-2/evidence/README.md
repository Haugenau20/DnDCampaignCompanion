# Second-pass diagnostic evidence

These are frozen diagnostic sources and outputs for review, not application
fixes or permanent regression tests. React diagnostics intentionally assert the
observed defective behavior. Acceptance tests for repairs must assert the
desired behavior instead. The sensitivity probe runs an existing suite once
unchanged and once with a source transformation in memory only.

All inputs are synthetic. No external AI, production Firebase, real user data,
mail or deployment is involved. Test doubles replace the IO boundaries. See
[../verification.md](../verification.md) for interpretation limits and
[../summary.md](../summary.md) for priority and grouping.

## Environment and replay

Executed checkout: `/workspace/DnDCampaignCompanion`, Node `22.23.3` via
`/tmp/code-review-runtime/node_modules/.bin/node`, installed repository
dependencies, Chromium `/usr/bin/chromium` version `151.0.7922.173`, and
Playwright Core `/opt/codex/cua_node/lib/node_modules/playwright-core`.
The scripts retain these paths to preserve the executed harness. In another
checkout, replace the checkout prefix and the browser/Playwright paths with
local equivalents. This pass installed no dependency or browser package.

From this `pass-2` directory, copy each probe directory into its original
temporary directory:

```bash
mkdir -p /tmp/pass2-functional /tmp/pass2-performance /tmp/pass2-react /tmp/pass2-tests
cp evidence/probes/functional/* /tmp/pass2-functional/
cp evidence/probes/performance/* /tmp/pass2-performance/
cp evidence/probes/react/* /tmp/pass2-react/
cp evidence/probes/test-quality/* /tmp/pass2-tests/
```

Run the following from the repository root, using Node 22 on `PATH`:

```bash
node node_modules/jest/bin/jest.js --config /tmp/pass2-functional/jest.config.cjs --runInBand
NODE_ENV=test node node_modules/jest/bin/jest.js --config /tmp/pass2-performance/jest.config.cjs --runInBand
node node_modules/jest/bin/jest.js --config /tmp/pass2-react/jest.config.cjs --runInBand --watch=false
PASS2_FIELD_PATCH=0 node node_modules/jest/bin/jest.js --config /tmp/pass2-tests/jest.config.cjs --runInBand --runTestsByPath src/features/campaign-entities/quests/context/__tests__/QuestContext.objectives.test.tsx
PASS2_FIELD_PATCH=1 node node_modules/jest/bin/jest.js --config /tmp/pass2-tests/jest.config.cjs --runInBand --runTestsByPath src/features/campaign-entities/quests/context/__tests__/QuestContext.objectives.test.tsx
node /tmp/pass2-performance/bench.cjs
node /tmp/pass2-performance/browser-bench.cjs
```

The `PASS2_FIELD_PATCH=1` run is expected to fail four existing assertions. It
changes the outgoing objective patch from `{ ...quest, objectives }` to
`{ objectives }` in memory; it does not edit repository source. Backend rules
and update behavior are not exercised by that mocked suite.

The browser script aborts all page network requests and evaluates actual pure
functions on a blank page. In this managed environment, its Chromium process
required socket-enabled execution. It does not run a signed-in app or contact
Firebase. The sweep probe replaces Admin SDK, scheduler and bucket with counted
fakes. No emulator server was needed for these second-pass checks.

## Outputs

- [functional.txt](outputs/functional.txt): six suites/seven diagnostics.
- [performance-react.txt](outputs/performance-react.txt): two suites/five checks;
  includes preserved passing route budgets and new quick-add/save counts.
- [react-state.txt](outputs/react-state.txt): one suite/five state diagnostics.
- [react-search.txt](outputs/react-search.txt): one suite/three search diagnostics.
- [control-results.txt](outputs/control-results.txt): ten existing tests pass.
- [patch-results.txt](outputs/patch-results.txt): six pass and four intentional
  assertion failures after a field-only patch.
- [bench-results-node22.jsonl](outputs/bench-results-node22.jsonl): counted
  location work, saga/search CPU and mocked maintenance IO.
- [browser-results.jsonl](outputs/browser-results.jsonl): Chromium CPU timings.

The original Node benchmark output header says "uninstrumented". **Location
timings retained ID getter counters and are instrumented.** The corrected
script metadata and this note clarify that limitation; numeric results are
unchanged. Saga/search timing passes do not install those getter counters.
Use Chromium's plain-field measurements for the reported location CPU cost.
Absolute timings depend on the host; deterministic counts are the more portable
evidence. React run outputs include expected synthetic error logs and standard
router warnings, not new baseline failures.
