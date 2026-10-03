# Third-pass diagnostic evidence

These are executed review diagnostics for the unchanged source baseline
`64fe195`, reviewed on parent commit `0ba2612`. They use synthetic data and
controlled IO. Passing characterization assertions demonstrate current behavior;
they are not acceptance tests asserting that the defects should remain.

## Inventory

| Area | Preserved inputs | Final outputs |
|---|---|---|
| Duplication | [probes/duplication](probes/duplication): AST/token census, actual-source differential probes, title-drift suite and Jest config | [outputs/duplication](outputs/duplication): census JSON, component results and source results |
| Architecture | [probes/architecture](probes/architecture): dependency graph, unused-module census, theme suite, CSS stub and Jest config | [outputs/architecture](outputs/architecture): frontend/Functions graph summaries, unused census and theme results |
| Accessibility | [probes/accessibility](probes/accessibility): component harness, synthetic collaborators, HTML, webpack builder and Chromium runner | [outputs/accessibility](outputs/accessibility): corrected build/browser logs, 14 observation groups and four screenshots |
| AI integration | [probes/ai](probes/ai): actual response probe, usage suite, conversion suite and Jest config | [outputs/ai](outputs/ai): response records, usage and conversion results |
| Operations | [probes/operations](probes/operations): closed-dependency source/CLI orchestration probe | [outputs/operations](outputs/operations): five-case JSON output |

There are **19 small diagnostic inputs and 18 outputs**, including four PNGs.
Generated browser bundles, dependency copies, Jest caches, failed intermediate
outputs and synthetic Functions fixture directories are not committed. The AI
response output includes a human completion marker after JSON records and is
therefore deliberately named `.txt`, not `.jsonl`.

## Setup and replay

Original execution root: `/workspace/DnDCampaignCompanion`. Root and Functions
dependencies were already installed; the retained production build supplies the
source maps for the unused-module census. Node 22.23.3 is at
`/tmp/code-review-runtime/node_modules/.bin/node`. Chromium 151.0.7922.173 is at
`/usr/bin/chromium`, with Playwright Core at
`/opt/codex/cua_node/lib/node_modules/playwright-core`. The browser builder uses
the installed repository webpack/Babel/style-loader/css-loader/postcss-loader,
Tailwind, autoprefixer and axe-core packages. No extra package installation was
needed for this pass.

Restore the preserved inputs to the original temporary paths before replaying:

```sh
python3 - <<'PY'
from pathlib import Path
import shutil
evidence = Path('/workspace/DnDCampaignCompanion/docs/reviews/2026-10-03/pass-3/evidence')
for area in ['duplication', 'architecture', 'accessibility', 'ai', 'operations']:
    target = Path('/tmp') / ('pass3-' + area)
    target.mkdir(parents=True, exist_ok=True)
    for source in (evidence / 'probes' / area).iterdir():
        shutil.copy2(source, target / source.name)
PY
```

Run from the repository root with Node 22 on PATH. Original commands:

```sh
node /tmp/pass3-duplication/scan.cjs
node /tmp/pass3-duplication/source-probes.cjs
node node_modules/jest/bin/jest.js --config=/tmp/pass3-duplication/jest.config.cjs --runInBand /tmp/pass3-duplication/title-drift.test.js
node /tmp/pass3-architecture/graph.cjs
node /tmp/pass3-architecture/graph.cjs functions
node /tmp/pass3-architecture/dead-code-census.cjs
node node_modules/jest/bin/jest.js --config=/tmp/pass3-architecture/jest.config.cjs --runInBand /tmp/pass3-architecture/theme-storage.test.cjs
node /tmp/pass3-ai/response-probe.cjs
node node_modules/jest/bin/jest.js --config=/tmp/pass3-ai/jest.config.cjs --runInBand /tmp/pass3-ai/usage-feedback.test.js
node node_modules/jest/bin/jest.js --config=/tmp/pass3-ai/jest.config.cjs --runInBand /tmp/pass3-ai/conversion-handoff.test.js
node /tmp/pass3-operations/operations-probe.cjs /workspace/DnDCampaignCompanion
node /tmp/pass3-accessibility/build.cjs
node /tmp/pass3-accessibility/browser.cjs
```

Some scripts support `REVIEW_REPO`; others intentionally retain exact reviewed
paths. For another checkout/environment adjust those paths and ensure the
framework/dependency versions match. Do not add an absolute `moduleDirectories`
override: it can resolve a nested Jest version's dependencies incorrectly.
Raw timings are environment observations, not performance guarantees.

## IO boundaries

React suites load actual components/providers/hooks while replacing collection,
navigation and persistence collaborators. Source probes transpile/extract the
reviewed implementations; the reports distinguish an executed method from a
source-traced UI consequence. The operations probe invokes exact installed CLI
methods using isolated synthetic files and controlled discovery dependencies.
It neither invokes an operator script nor starts/stops an emulator or process.
PowerShell findings have no runtime reproduction in this environment.

The browser serves a fixed four-asset whitelist on a temporary loopback HTTP
port, aborts nonlocal requests and closes its server/browser on completion or
failure. Its real components use synthetic search/campaign/create/navigation
seams. Shipping theme/global CSS is bundled via the normal loader path and a
CSSOM guard checks it before measurements. The four screenshots are the final
corrected run; earlier manual-CSS observations were discarded. The small axe
contrast sample is not a whole-app accessibility certification.

No production data, paid model call, real message or deployment occurs. The
authentication/account-lifecycle assignment remains stopped. Import-graph
structure and inert request identity do not constitute a resumed behavior
investigation. See [verification](../verification.md) for interpretation limits.
