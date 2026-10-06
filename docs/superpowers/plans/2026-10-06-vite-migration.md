# Move from Create React App to Vite (T059) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and serve the app with Vite instead of `react-scripts`, so a plain `npm install` resolves
and CI drops `--legacy-peer-deps`. Fix the dev script `start-dev.ps1` on the way.

**Architecture:** Vite 7 with `@vitejs/plugin-react` and `vite-tsconfig-paths` replaces `react-scripts`
for `npm start` and `npm run build`. The source keeps CRA's `process.env.REACT_APP_*` names: `vite.config.ts`
replaces each at build time, so no app file, `.env` file or GitHub secret is renamed. Jest is unchanged.
It already runs on `ts-jest`, not on CRA. The two places that knew about webpack (`app/lazyPage.ts`'s
missing-chunk detection and `App.tsx`'s `webpackPrefetch` comments) are ported. So is `check-bundle-size.js`.

**Tech Stack:** Vite 7.3, `@vitejs/plugin-react` 5.2, `vite-tsconfig-paths` 6.1, Jest 29 + ts-jest (unchanged),
ESLint 8 + `eslint-config-react-app` 7 (now explicit), Windows PowerShell 5.1 for the dev script.

**Spec:** `TODO.md` → T059, plus the maintainer's decisions of 2026-10-06 (below). There is no separate design doc.

## Decisions already taken (2026-10-06)

- **Keep `REACT_APP_*` names.** Vite substitutes them. Renaming to `VITE_*` / `import.meta.env` would touch
  ~8 source files, their tests, both workflows' secrets, and the `.env` files, and ts-jest cannot parse `import.meta`.
- **Stay on Jest.** Vitest is its own migration of 284 suites, with no tie to this one.
- **Vite 7, not 8.** Measured 2026-10-06 against the current lockfile:
  `vite@^7.3.7` + `@vitejs/plugin-react@^5.2.0` + `vite-tsconfig-paths@^6.1.1` resolve **without**
  `--legacy-peer-deps`. Vite 8's `@vitejs/plugin-react@6` does not: through an optional peer
  (`@rolldown/plugin-babel` → `@babel/plugin-transform-runtime@8.0.0-rc.4`), npm picks a Babel 8
  prerelease and fails `ERESOLVE`. It only resolves with an `overrides` entry. Vite 7 → 8 is a later, separate bump.
- **Fold the `start-dev.ps1` fixes in** (Task 1), as their own commit.

## Global Constraints

- `npm install` and `npm ci` must succeed **without** `--legacy-peer-deps` (T059's point).
- Dev server: `http://localhost:3000`, listening on IPv4 `127.0.0.1` (the scripts' health checks use `127.0.0.1:3000`; see CLAUDE.md "Environment gotchas").
- Build output stays in `build/` (`firebase/firebase.json` `"public": "build"`, and both Hosting workflows `cp -r build/*`).
- `npm run build` must still fail on a type error: `react-scripts build` type-checked `src/`, and CI has no other `tsc` step.
- No hardcoded colours, double quotes in TS, JSDoc on functions (CLAUDE.md Code Style).
- **Never modify a test to make it pass.** `lazyPage.test.tsx`'s fixture changes in Task 3 because the bundler's
  contract changes (webpack's `ChunkLoadError` stops existing). The requirement it pins stays the same.
- Commit per task; end each commit with the session's attribution lines. Never push to `main`; one PR from `chore/t059-vite`.
- Do not stop the maintainer's dev server or emulators. Task 1's harness runs only when ports 3000/4000/4400/4500/5001/8080/9099/9150/9199 are free.

## Review Focus

1. **A `process.env.*` left in the shipped JS.** The browser has no `process`, so one unreplaced name throws
   `process is not defined` and blanks the site. Expected: zero occurrences in `build/assets/*.js` (Task 2, Step 9).
2. **Production builds against the wrong Firebase project.** `REACT_APP_*` comes from CI's environment, not
   `.env.production`. Expected: the PR preview build's JS contains the `REACT_APP_PROJECT_ID` secret's value,
   and `REACT_APP_USE_EMULATORS` is `"false"` (Task 2, Step 9, plus a look at the preview site after pushing).
3. **A tab opened before a deploy.** Its route chunks are gone, and Hosting answers with `index.html`.
   Expected: one reload, then the error boundary if it is still missing (Task 3 tests, and Task 6's browser check
   on a build with a chunk deleted).
4. **The barrels pulled back into the entry bundle.** If Rollup does not honour `"sideEffects": ["*.css"]` for
   `src/`, every page lands in the entry. Expected: the entry measures within ~10% of CRA's 264.23 kB (Task 4, Step 4).
5. **A failed emulator export read as success.** Expected: `stop` refuses to stop, and `export` exits 1 (Task 1 harness).

---

## File Structure

| File | Change | Responsibility |
|---|---|---|
| `scripts/start-dev.ps1` | Modify | Java ≥ 21 check; function output that does not swallow the return value; an emulator exit noticed and explained |
| `package.json`, `package-lock.json` | Modify | Swap `react-scripts` for Vite; make the transitive ESLint/Babel deps explicit |
| `vite.config.ts` | Create | Plugins, `REACT_APP_*` substitution, dev-server port/host, `build/` output |
| `index.html` | Move from `public/index.html` | Vite's entry HTML: `%PUBLIC_URL%` gone, module script added |
| `src/app/lazyPage.ts` + `src/app/__tests__/lazyPage.test.tsx` | Modify | Recognise the browser's missing-module errors; `prefetchPages()` replaces `webpackPrefetch` |
| `src/app/App.tsx` | Modify | Drop the magic comments; call `prefetchPages()` in production |
| `scripts/check-bundle-size.js` | Modify | Measure what `build/index.html` loads (entry + modulepreloads); new ceiling |
| `.github/workflows/test.yml`, `firebase-hosting-merge.yml`, `firebase-hosting-pull-request.yml` | Modify | `npm ci` without the flag; no `CI: false` |
| `CLAUDE.md`, `AGENTS.md`, `src/assets/images.d.ts`, `src/core/attribution/attribution.ts` | Modify | Replace what they say about CRA and webpack |
| `TODO.md` | Modify | Delete T059 and T108 (moot without react-scripts); update T065 (Java 21) |

---

### Task 1: `start-dev.ps1`: show the real reason a start or export fails

Found on 2026-10-06. `.\scripts\start-dev.ps1` said "Firebase emulators failed to start within 45 seconds"
because the global Firebase CLI (15.32.1) refuses Java 17 (`firebase-tools no longer supports Java version
before 21`). The minimized window showing that closed at once. The investigation found two more defects:

- **`Invoke-EmulatorExport` returns everything `firebase` prints, plus the boolean.** PowerShell treats a
  multi-element array as true, so **a failed export reads as success and `stop` shuts the emulators down**.
  That is the data loss T100/OPS-001 was meant to prevent. Reproduced 2026-10-06 with a stub that prints two
  lines and exits 1: `if (...)` took the success branch.
- **`$succeeded = Start-DevelopmentEnvironment` captures `npm`'s output.** The compile log is never shown,
  and `@(lines..., $false) -eq $false` filters to `@($false)`, which is falsy, so a failed start exits 0.

**Files:**
- Modify: `scripts/start-dev.ps1`
- Test: `<scratchpad>/start-dev-harness.ps1` (not committed; no Pester in the repo)

**Interfaces:**
- Produces: `Get-JavaMajorVersion` → `[int]` (0 = none); `$MinJavaVersion = 21`; `$EmulatorLog` (path to the
  emulators' startup log, `firebase/emulator-start.log`, ignored by `*.log`).

- [ ] **Step 1: Write the harness (the failing test)**

Create `<scratchpad>/stubs/firebase.cmd`:

```bat
@echo off
rem Stands in for the Firebase CLI: prints like it does, fails like it can.
echo i  emulators: Exporting data to: ./emulator-data
echo Error: stub export failure
exit /b 1
```

Create `<scratchpad>/stubs-start/firebase.cmd` (for the early-exit case) and `<scratchpad>/stubs-start/java.cmd`:

```bat
@echo off
echo Error: stub emulator failure
exit /b 1
```

```bat
@echo off
echo openjdk version "21.0.4" 2024-07-16 1>&2
```

Create `<scratchpad>/start-dev-harness.ps1`:

```powershell
param([string]$Script = "D:\GitHub\DnDCampaignCompanion\scripts\start-dev.ps1")
$ErrorActionPreference = "Stop"
$repo = "D:\GitHub\DnDCampaignCompanion"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$ports = 3000,4000,4400,4500,5001,8080,9099,9150,9199
if (Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue | Where-Object { $ports -contains $_.LocalPort }) {
    throw "Something listens on this project's ports - the maintainer's services? Not running."
}
$failures = 0
function Check($name, $ok) { if ($ok) { "PASS $name" } else { "FAIL $name"; $script:failures++ } }

# 1. A failed export: `export` and `stop` must both refuse (exit 1), and stop must stop nothing.
$listener = Start-Process python -ArgumentList "-m","http.server","4000","--bind","127.0.0.1" -PassThru -WindowStyle Hidden
Start-Sleep 2
$env:Path = "$here\stubs;$env:Path"
Push-Location $repo
$out = powershell -NoProfile -File $Script -Action export *>&1 | Out-String
Check "export exits 1 on a failed export" ($LASTEXITCODE -eq 1)
Check "export says it failed" ($out -match "Failed to export data")
$out = powershell -NoProfile -File $Script -Action stop *>&1 | Out-String
Check "stop exits 1 on a failed export" ($LASTEXITCODE -eq 1)
Check "stop stopped nothing" (-not $listener.HasExited)
Pop-Location
Stop-Process -Id $listener.Id -Force
$env:Path = ($env:Path -split ";" | Where-Object { $_ -ne "$here\stubs" }) -join ";"

# 2. Java older than 21: refuse before compiling or starting anything.
$javaMajor = (cmd /c "java -version 2>&1" | Out-String) -match 'version "(\d+)'
if ([int]$Matches[1] -lt 21) {
    Push-Location $repo
    $out = powershell -NoProfile -File $Script -Action start *>&1 | Out-String
    Pop-Location
    Check "old Java: exits 1" ($LASTEXITCODE -eq 1)
    Check "old Java: names the version" ($out -match "need Java 21")
    Check "old Java: compiled nothing" ($out -notmatch "Compiling Cloud Functions")
} else { "SKIP old-Java case: this machine has Java $($Matches[1])" }

# 3. Emulators that exit during startup: say so within seconds, with their output.
$env:Path = "$here\stubs-start;$env:Path"
Push-Location $repo
$timer = [Diagnostics.Stopwatch]::StartNew()
$out = powershell -NoProfile -File $Script -Action start *>&1 | Out-String
Pop-Location
Check "early exit: exits 1" ($LASTEXITCODE -eq 1)
Check "early exit: shows the compile output" ($out -match "tsc")
Check "early exit: quotes the emulators' error" ($out -match "stub emulator failure")
Check "early exit: well under the 45 s timeout" ($timer.Elapsed.TotalSeconds -lt 30)

"$failures failure(s)"; exit $failures
```

- [ ] **Step 2: Run it against the current script to confirm it fails**

Run: `powershell -NoProfile -File <scratchpad>/start-dev-harness.ps1`
Expected: FAIL on "export exits 1", "stop exits 1", "stop stopped nothing", the three old-Java checks, and the
early-exit checks (the last one waits out the 45 s).

- [ ] **Step 3: Fix the function output (export and compile)**

In `Invoke-EmulatorExport`, replace the `firebase emulators:export` line with:

```powershell
        # Out-Host: the CLI's output is shown, not returned. Returned, it joins
        # the boolean in an array that `if` always reads as true, so a failed
        # export looked like success and `stop` went ahead.
        firebase emulators:export "./emulator-data" --force --config firebase.emulators.json | Out-Host
```

In `Start-DevelopmentEnvironment`, replace `npm --prefix firebase/functions run build` with:

```powershell
    # Out-Host for the same reason as the export: shown, not returned.
    npm --prefix firebase/functions run build | Out-Host
```

- [ ] **Step 4: Add the Java check**

After `$ErrorActionPreference = "Stop"`, add:

```powershell
# firebase-tools 15 refuses to start the emulators on anything older.
$MinJavaVersion = 21

# The emulators' output while they start, so a start that fails can say why:
# the window they run in closes as soon as they exit.
$EmulatorLog = Join-Path $PSScriptRoot "..\firebase\emulator-start.log"

<#
.SYNOPSIS
  The installed Java's major version, or 0 when there is none.
.NOTES
  `java -version` prints to stderr. Run through cmd, the stream is merged
  before PowerShell sees it, so 5.1 never wraps it in an error record.
#>
function Get-JavaMajorVersion {
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) { return 0 }
    $text = cmd /c "java -version 2>&1" | Out-String
    if ($text -match 'version "1\.(\d+)') { return [int]$Matches[1] }  # "1.8.0" is Java 8
    if ($text -match 'version "(\d+)') { return [int]$Matches[1] }
    return 0
}
```

At the top of `Start-DevelopmentEnvironment`, before the data-directory check, add:

```powershell
    $java = Get-JavaMajorVersion
    if ($java -lt $MinJavaVersion) {
        $found = if ($java -eq 0) { "no Java" } else { "Java $java" }
        Write-Host "   The Firebase emulators need Java $MinJavaVersion or later; found $found." -ForegroundColor Red
        Write-Host "   Install it (winget install EclipseAdoptium.Temurin.21.JDK), put it first on PATH, and open a new terminal." -ForegroundColor Yellow
        return $false
    }
```

- [ ] **Step 5: Notice an emulator exit during startup**

Replace the whole `Push-Location "firebase" … finally { Pop-Location }` block that starts the emulators with:

```powershell
    $import = if ($hasData) { " --import ./emulator-data" } else { "" }
    if ($hasData) {
        Write-Host "   Importing existing emulator data..." -ForegroundColor Gray
    } else {
        Write-Host "   Starting fresh emulators..." -ForegroundColor Gray
    }
    # cmd merges the CLI's stderr; Tee-Object shows it in the window and keeps
    # it in $EmulatorLog. Encoded, so the nested quotes survive Start-Process.
    $command = "Set-Location '$(Resolve-Path firebase)'; " +
        "cmd /c `"firebase emulators:start --config firebase.emulators.json$import 2>&1`" | " +
        "Tee-Object -FilePath '$EmulatorLog'"
    $encoded = [Convert]::ToBase64String([Text.Encoding]::Unicode.GetBytes($command))
    $emulators = Start-Process -FilePath "powershell" -ArgumentList @("-EncodedCommand", $encoded) -WindowStyle Minimized -PassThru
```

Replace the wait loop and the result check after it with:

```powershell
    Write-Host "   Waiting for Firebase emulators..." -ForegroundColor Gray
    $timeout = 45
    $count = 0
    while (-not (Test-EmulatorsRunning) -and -not $emulators.HasExited -and $count -lt $timeout) {
        Start-Sleep -Seconds 1
        $count++
        if ($count % 5 -eq 0) {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
    Write-Host ""

    if (Test-EmulatorsRunning) {
        Write-Host "   Firebase emulators started!" -ForegroundColor Green
    } else {
        if ($emulators.HasExited) {
            Write-Host "   The Firebase emulators exited while starting. Their last output:" -ForegroundColor Red
        } else {
            Write-Host "   Firebase emulators failed to start within $timeout seconds. Their output so far:" -ForegroundColor Red
        }
        Get-Content $EmulatorLog -Tail 15 -ErrorAction SilentlyContinue |
            ForEach-Object { Write-Host "     $_" -ForegroundColor Gray }
        Write-Host "   Full log: $EmulatorLog" -ForegroundColor Yellow
        return $false
    }
```

- [ ] **Step 6: Run the harness to confirm it passes**

Run: `powershell -NoProfile -File <scratchpad>/start-dev-harness.ps1`
Expected: every check PASS, `0 failure(s)`.

- [ ] **Step 7: Control (the harness detects the bug)**

Run: `git show HEAD:scripts/start-dev.ps1 > <scratchpad>/start-dev.old.ps1`, then
`powershell -NoProfile -File <scratchpad>/start-dev-harness.ps1 -Script <scratchpad>/start-dev.old.ps1`
Expected: the Step 2 failures again. If any check passes against the old script, it is not testing anything. Fix the check.

- [ ] **Step 8: Update CLAUDE.md for the Java requirement**

In CLAUDE.md "Running the Project", after the `start-dev.ps1 -Action start` bullet, add:

```markdown
- **The emulators need Java 21+** (firebase-tools 15). `start` checks it first and says what it found; an
  emulator that exits while starting has its last output printed, and the full log is
  `firebase/emulator-start.log`.
```

- [ ] **Step 9: Commit**

```bash
git add scripts/start-dev.ps1 CLAUDE.md
git commit -m "fix(dev): start-dev.ps1 reads a failed export as failure, and says why a start fails (T059)"
```

---

### Task 2: Vite replaces `react-scripts`

**Files:**
- Create: `vite.config.ts`
- Move: `public/index.html` → `index.html`
- Modify: `package.json` (scripts, dependencies, `eslintConfig` unchanged), `package-lock.json`

**Interfaces:**
- Produces: `npm start` (Vite dev server on `127.0.0.1:3000`), `npm run build` (`tsc --noEmit && vite build` → `build/`),
  `npm run preview` (serves `build/` on `127.0.0.1:4173`). `build/index.html` loads the entry via
  `<script type="module" src="/assets/index-<hash>.js">` and preloads shared chunks via `<link rel="modulepreload" href="/assets/…">`.
  Task 4 relies on that shape.

- [ ] **Step 1: Confirm the starting point fails**

Run: `npm install --dry-run`
Expected: `ERESOLVE` naming `react-scripts` (T059's symptom).

- [ ] **Step 2: Swap the dependencies**

```bash
npm uninstall react-scripts @babel/plugin-proposal-private-property-in-object --legacy-peer-deps
npm install --save-dev vite@^7.3.7 @vitejs/plugin-react@^5.2.0 vite-tsconfig-paths@^6.1.1 eslint@^8.57.1 eslint-config-react-app@^7.0.1 @babel/preset-env@^7.26.7 babel-jest@^29.7.0
```

Why each explicit one: `eslint` and `eslint-config-react-app` (the `eslintConfig` extends `react-app`),
`@babel/preset-env` (jest's transform for the ESM-only markdown packages, `jest.config.ts`) and `babel-jest`
were all hoisted from `react-scripts`. The hoisted `babel-jest` was CRA's 27.5.1, and `jest.config.ts`
resolves `babel-jest` from the root, so 29.7.0 is the version jest 29 expects. The private-property plugin
only silenced a CRA build warning.

- [ ] **Step 3: Verify the T059 symptom is gone**

Run: `rm -rf node_modules && npm ci`
Expected: succeeds with no flag. `npm ls react-scripts` → `(empty)`.

- [ ] **Step 4: Create `vite.config.ts`**

```ts
// vite.config.ts
import fs from "fs";
import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

/**
 * Every `process.env.REACT_APP_*` name under `dir`. The source keeps CRA's
 * names (T059), and each is replaced at build time. A name left unreplaced
 * would reach the browser as `process.env.X` and throw `process is not
 * defined`, so the names come from the source, not from the .env files:
 * a name no .env file sets (REACT_APP_VERSION, say) becomes `undefined`.
 */
function reactAppNames(dir: string): Set<string> {
  const names = new Set<string>();
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      reactAppNames(full).forEach((name) => names.add(name));
    } else if (/\.tsx?$/.test(entry.name)) {
      for (const match of fs.readFileSync(full, "utf8").matchAll(/process\.env\.(REACT_APP_\w+)/g)) {
        names.add(match[1]);
      }
    }
  }
  return names;
}

export default defineConfig(({ mode }) => {
  // The environment (CI's secrets) wins over .env files, as it did under CRA.
  const env = loadEnv(mode, process.cwd(), "REACT_APP_");
  const names = new Set([...Object.keys(env), ...reactAppNames(path.join(process.cwd(), "src"))]);
  const define = Object.fromEntries(
    [...names].map((name) => [
      `process.env.${name}`,
      env[name] === undefined ? "undefined" : JSON.stringify(env[name]),
    ])
  );

  return {
    // tsconfigPaths: the bare `baseUrl` imports (`core/types/common`) and `@/`.
    plugins: [react(), tsconfigPaths()],
    define,
    server: {
      // IPv4 on purpose: start-dev.ps1's health check asks 127.0.0.1:3000.
      host: "127.0.0.1",
      port: 3000,
      strictPort: true,
      open: true,
    },
    preview: { host: "127.0.0.1", port: 4173, strictPort: true },
    // `build/`: firebase.json serves it and the Hosting workflows copy it.
    // Source maps shipped under CRA too, and check-bundle-size's hint reads them.
    build: { outDir: "build", sourcemap: true },
  };
});
```

`process.env.NODE_ENV` is left to Vite, which replaces it itself (`"development"` in the dev server,
`"production"` in a build).

- [ ] **Step 5: Move `index.html`**

```bash
git mv public/index.html index.html
```

Then in `index.html`: replace `href="%PUBLIC_URL%/manifest.json"` with `href="/manifest.json"`. Directly before
`</body>`, after `<div id="root"></div>`, add:

```html
    <script type="module" src="/src/index.tsx"></script>
```

`public/manifest.json` stays where it is. Vite copies `public/` into `build/` as CRA did.

- [ ] **Step 6: Update `package.json` scripts**

```json
    "start": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
```

Delete the `"eject"` script. Keep `browserslist`: autoprefixer (via `postcss.config.js`) still reads it.

The `tsc --noEmit` is not optional. `react-scripts build` type-checked `src/`, and CI has no other type-check
step, so without it a type error would deploy.

- [ ] **Step 7: Type gate and lint**

Run: `npx tsc --noEmit && npm run lint && npm run lint:tests`
Expected: all clean, same as `main`. If ESLint now complains about a missing parser or config, a hoisted package
is still missing. Add it explicitly as in Step 2. Do not loosen the config.

- [ ] **Step 8: Full jest suite**

Run: `npm run test:ci`
Expected: 0 failed. The totals must match a baseline measured on `main` **before** this branch
(`git stash; npm run test:ci; git stash pop`, or on a clean checkout). Do not carry a figure forward (CLAUDE.md Testing).

- [ ] **Step 9: Build, and check the substitution**

Run: `npm run build`
Then:

```bash
grep -c "process\.env" build/assets/*.js | grep -v ":0$" || echo "no process.env left"
grep -l "dnd-campaign-companion" build/assets/*.js | head -1
grep -c "sessionTester" build/assets/*.js | grep -v ":0$" || echo "dev-only tester not in the build"
```

Expected: `no process.env left`, at least one file holding the project id, and `dev-only tester not in the build`
(`index.tsx` imports it only when `NODE_ENV === "development"`).

Type-gate control: add `const x: number = "a";` to `src/app/App.tsx`, then run `npm run build`.
Expected: it fails at `tsc`. Revert the line.

- [ ] **Step 10: Commit**

```bash
git add vite.config.ts index.html public package.json package-lock.json
git commit -m "build: Vite replaces react-scripts; npm install resolves without --legacy-peer-deps (T059)"
```

---

### Task 3: Missing chunks and prefetch, ported from webpack

**Files:**
- Modify: `src/app/lazyPage.ts`
- Modify: `src/app/__tests__/lazyPage.test.tsx`
- Modify: `src/app/App.tsx:29-75` (comments and `import()` calls), plus the effect that calls `prefetchPages`

**Interfaces:**
- Consumes: nothing from earlier tasks (runs under jest, which Vite does not touch)
- Produces: `export function prefetchPages(): void` in `app/lazyPage.ts`. `lazyPage(load, name)` keeps its signature.

- [ ] **Step 1: Write the failing tests**

In `lazyPage.test.tsx`, replace the `chunkLoadError` fixture with what the browsers and Vite reject a missing chunk with:

```tsx
/**
 * What a browser rejects a missing route chunk with, once a deploy has removed
 * it and Hosting answers its URL with index.html. Each engine words it
 * differently; Vite's preload helper words a missing stylesheet its own way.
 */
const MISSING_CHUNK_ERRORS: Array<[string, () => Error]> = [
  ["Chromium", () => new TypeError("Failed to fetch dynamically imported module: https://example.test/assets/QuestsPage-abc123.js")],
  ["Firefox", () => new TypeError("error loading dynamically imported module: https://example.test/assets/QuestsPage-abc123.js")],
  ["Safari", () => new TypeError("Importing a module script failed.")],
  ["Vite, for a stylesheet", () => new Error("Unable to preload CSS for /assets/QuestsPage-abc123.css")],
];

/** The Chromium wording, for the tests that are not about wording. */
function chunkLoadError(): Error {
  return MISSING_CHUNK_ERRORS[0][1]();
}
```

Replace the test "a missing chunk reloads the page and marks the session" with:

```tsx
  test.each(MISSING_CHUNK_ERRORS)("a missing chunk (%s) reloads the page and marks the session", async (_engine, makeError) => {
    const Page = lazyPage(failing(makeError()), "default");

    renderLazy(Page);

    await screen.findByTestId("fallback");
    await Promise.resolve();
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem(FLAG)).toBe("1");
    // The page is being replaced; nothing is surfaced in the meantime.
    expect(screen.queryByTestId("boundary")).not.toBeInTheDocument();
  });
```

In "a chunk still missing after the reload reaches the error boundary", change the expected text from
`"Loading chunk 123 failed."` to `"Failed to fetch dynamically imported module"`.

Add, after the existing `describe("lazyPage", …)`:

```tsx
describe("prefetchPages", () => {
  let idle: (() => void) | undefined;

  beforeEach(() => {
    idle = undefined;
    (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback = (cb) => {
      idle = cb;
      return 1;
    };
  });

  afterEach(() => {
    delete (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback;
  });

  test("loads every page once the browser is idle, and not before", async () => {
    await jest.isolateModulesAsync(async () => {
      const { lazyPage: isolatedLazyPage, prefetchPages } = await import("app/lazyPage");
      const quests = jest.fn(() => Promise.resolve({ default: () => null }));
      const notes = jest.fn(() => Promise.resolve({ default: () => null }));
      isolatedLazyPage(quests, "default");
      isolatedLazyPage(notes, "default");

      prefetchPages();
      expect(quests).not.toHaveBeenCalled();

      idle?.();
      expect(quests).toHaveBeenCalledTimes(1);
      expect(notes).toHaveBeenCalledTimes(1);
    });
  });

  test("a failed prefetch is swallowed and never reloads", async () => {
    await jest.isolateModulesAsync(async () => {
      const { lazyPage: isolatedLazyPage, prefetchPages } = await import("app/lazyPage");
      const missing = jest.fn(() => Promise.reject(chunkLoadError()));
      isolatedLazyPage(missing, "default");

      prefetchPages();
      idle?.();
      await Promise.resolve();
      await Promise.resolve();

      expect(missing).toHaveBeenCalledTimes(1);
      expect(reload).not.toHaveBeenCalled();
      expect(window.sessionStorage.getItem(FLAG)).toBeNull();
    });
  });
});
```

The suite's outer `beforeEach`/`afterEach` (location stub, `console.error` spy) already apply to this block.

- [ ] **Step 2: Run the tests to confirm they fail**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="app/__tests__/lazyPage"`
Expected: FAIL. The four `test.each` cases go to the boundary instead of reloading (the detector still wants
`name === "ChunkLoadError"`), and `prefetchPages` is not exported.

- [ ] **Step 3: Implement**

In `src/app/lazyPage.ts`, replace `isChunkLoadError` and its comment with:

```ts
/**
 * What a missing route chunk is rejected with. A deploy removes the old
 * chunks, Hosting answers their URLs with `index.html`, and the browser will
 * not run HTML as a module. Each engine words that differently (Chromium,
 * Firefox, Safari, in that order), and Vite's preload helper words a missing
 * stylesheet its own way.
 */
const MISSING_CHUNK = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /Unable to preload CSS/i,
];

/** Whether `error` says a route chunk could not be loaded. */
function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && MISSING_CHUNK.some((pattern) => pattern.test(error.message));
}

/** Every page's loader, so `prefetchPages` can warm them all. */
const loaders: Array<() => Promise<unknown>> = [];

/**
 * Loads every route's chunk once the browser is idle, so a later visit finds
 * it cached (T030). webpack did this from `webpackPrefetch` comments; Vite
 * has none. A failed prefetch is ignored: the visit itself loads the chunk
 * again, and `lazyPage` handles that failure.
 */
export function prefetchPages(): void {
  const run = () => loaders.forEach((load) => load().catch(() => undefined));
  if ("requestIdleCallback" in window) window.requestIdleCallback(run);
  else setTimeout(run, 2000); // Safari before 18.2 has no requestIdleCallback.
}
```

In `lazyPage`'s JSDoc, change "which webpack reports as a `ChunkLoadError`" to "which the browser refuses to run
as a module". Make the first line of `lazyPage`'s body:

```ts
  loaders.push(load);
```

- [ ] **Step 4: Run the tests to confirm they pass**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="app/__tests__/lazyPage"`
Expected: PASS, all cases.

- [ ] **Step 5: Wire up `App.tsx`**

Remove every `/* webpackPrefetch: true */ ` from the `import()` calls, for example:

```tsx
const StoryPage = lazyPage(() => import('pages/story'), 'StoryPage');
```

Replace the comment above them ("Everything else loads on first visit (T030). `webpackPrefetch` then fetches…")
with:

```tsx
// Everything else loads on first visit (T030). `prefetchPages` then fetches
// each chunk at idle once the app is up, so a later visit finds it cached.
```

Import it next to `lazyPage` (`import { lazyPage, prefetchPages } from 'app/lazyPage';`) and, in the `App`
component's body, add:

```tsx
  // Production only: in jest and the dev server it would import every page
  // for nothing.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') prefetchPages();
  }, []);
```

Add `useEffect` to `App.tsx`'s React import if it is not already there. App's own quotes are single; match the file.

- [ ] **Step 6: Run the app tests and the lint**

Run: `npx jest --testTimeout=5000 --maxWorkers=1 --testPathPattern="src/app/"` and `npm run lint && npm run lint:tests`
Expected: PASS and clean. If `lint:tests` reports fewer problems in `lazyPage.test.tsx`, lower the baseline
(`npm run lint:tests -- --update`) and read its diff. It must only go down.

- [ ] **Step 7: Commit**

```bash
git add src/app/lazyPage.ts src/app/__tests__/lazyPage.test.tsx src/app/App.tsx scripts/test-lint-baseline.json
git commit -m "fix(app): a missing chunk after a deploy reloads under Vite too; pages prefetch at idle (T059)"
```

---

### Task 4: The bundle check measures Vite's entry

**Files:**
- Modify: `scripts/check-bundle-size.js`

**Interfaces:**
- Consumes: `build/index.html` from Task 2 (`<script type="module" … src="/assets/…js">` and `<link rel="modulepreload" … href="/assets/…js">`)

- [ ] **Step 1: Confirm it fails on a Vite build**

Run: `npm run build && npm run check:bundle`
Expected: exit 2, `No build at …build\static\js`.

- [ ] **Step 2: Rewrite the measurement**

Replace everything from `// \`BUILD_PATH\` as …` through the end of the file with:

```js
const buildDir = path.resolve(__dirname, "..", "build");

/** Gzipped size in kB (level 9, base 10). */
function gzipKb(file) {
  return zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length / 1000;
}

const htmlFile = path.join(buildDir, "index.html");
if (!fs.existsSync(htmlFile)) {
  console.error(`No build at ${buildDir}. Run \`npm run build\` first.`);
  process.exit(2);
}

// The entry is everything index.html makes a visit download before anything
// renders: its module script, and every chunk it modulepreloads. Rollup splits
// code shared with the route chunks out of the entry file, so that file alone
// undercounts.
const html = fs.readFileSync(htmlFile, "utf8");
const entryFiles = [
  ...html.matchAll(/<script\b[^>]*\bsrc="\/([^"]+\.js)"/g),
  ...html.matchAll(/<link\b[^>]*\brel="modulepreload"[^>]*\bhref="\/([^"]+\.js)"/g),
].map((match) => match[1]);
if (!entryFiles.some((file) => html.includes(`src="/${file}"`))) {
  console.error(`No module script in ${htmlFile}; is this a Vite build?`);
  process.exit(2);
}

const mainKb = entryFiles.reduce((sum, file) => sum + gzipKb(path.join(buildDir, file)), 0);
const assetsDir = path.join(buildDir, "assets");
const chunks = fs
  .readdirSync(assetsDir)
  .filter((name) => name.endsWith(".js") && !entryFiles.includes(`assets/${name}`))
  .map((name) => ({ name, kb: gzipKb(path.join(assetsDir, name)) }))
  .sort((a, b) => b.kb - a.kb);

console.log(`entry     ${mainKb.toFixed(2)} kB gzip in ${entryFiles.length} file(s) (ceiling ${MAIN_CEILING_KB} kB)`);
console.log(`chunks    ${chunks.length}, largest ${chunks.slice(0, 3).map((c) => `${c.name} ${c.kb.toFixed(2)} kB`).join(", ")}`);

if (mainKb > MAIN_CEILING_KB) {
  console.error(
    `\nThe entry is ${(mainKb - MAIN_CEILING_KB).toFixed(2)} kB over its ceiling.\n` +
      "Something that only a page needs is probably being imported from an eager module.\n" +
      "Compare `npx source-map-explorer build/assets/index-*.js` against main, or raise\n" +
      "MAIN_CEILING_KB in scripts/check-bundle-size.js and say why in the PR."
  );
  process.exit(1);
}
```

Update the header comment. "Only `main.*.js` has a ceiling" becomes "Only the entry (what `build/index.html`
loads) has a ceiling", and "fetched at idle besides (`webpackPrefetch` in `app/App.tsx`)" becomes
"(`prefetchPages` in `app/lazyPage.ts`)". Delete the paragraph claiming the number matches `react-scripts build`'s log.

- [ ] **Step 3: Measure**

Run: `npm run check:bundle`
Expected: prints the entry size and passes or fails against the old 275 kB ceiling. Record the number.

- [ ] **Step 4: Compare against CRA (Review Focus 4)**

CRA's `main.js` measured 264.23 kB. If the entry now exceeds ~290 kB, check first whether the feature barrels
were pulled in. Run `npx source-map-explorer build/assets/index-*.js` and look for page modules (`pages/…`, admin pages).
If they are there, Rollup is not applying `"sideEffects": ["*.css"]` to `src/`. Add to `vite.config.ts`'s `build`:

```ts
    rollupOptions: {
      // package.json's "sideEffects": ["*.css"], spelled out for src/ (T030).
      treeshake: { moduleSideEffects: (id) => id.includes("node_modules") || id.endsWith(".css") },
    },
```

Rebuild and re-measure. Note in the PR which case applied.

- [ ] **Step 5: Set the ceiling**

Set `MAIN_CEILING_KB` to the measured entry rounded up with ~4% headroom. Rewrite its JSDoc as
`/** Measured <N> kB on 2026-10-06, the first Vite build (CRA's main.js was 264.23 kB); ~4% headroom. */`.

- [ ] **Step 6: Control**

Temporarily set `MAIN_CEILING_KB = 1` and run `npm run check:bundle`. Expected: exit 1 with the over-ceiling
message. Restore the value.

- [ ] **Step 7: Commit**

```bash
git add scripts/check-bundle-size.js vite.config.ts
git commit -m "build: the bundle check measures what index.html loads (T059)"
```

---

### Task 5: CI, docs and backlog

**Files:**
- Modify: `.github/workflows/test.yml`, `.github/workflows/firebase-hosting-merge.yml`, `.github/workflows/firebase-hosting-pull-request.yml`
- Modify: `CLAUDE.md`, `AGENTS.md`, `src/assets/images.d.ts`, `src/core/attribution/attribution.ts`, `TODO.md`

- [ ] **Step 1: Workflows**

`test.yml`, both install steps: `run: npm ci --legacy-peer-deps` → `run: npm ci`. Delete the comment
"# --legacy-peer-deps: CRA's peer ranges no longer resolve (T059); the Hosting workflows' build installs the same way."
In the `bundle` job's Build step, delete the three-line `CI: false` comment and the `env:` block holding only `CI: false`.

Both Hosting workflows: `npm ci --legacy-peer-deps` → `npm ci`, and delete " --legacy-peer-deps: T059." from the
comment above it. In the Build step, delete `CI: false` and the two comment lines about it. Change
"# react-scripts reads REACT_APP_* from the environment as from a .env." to
"# vite.config.ts reads REACT_APP_* from the environment, ahead of any .env file."

Check: `grep -rn "legacy-peer\|react-scripts\|CI: false" .github/` → nothing.

- [ ] **Step 2: CLAUDE.md**

- "There is no Docker anywhere…": `(\`npm ci --legacy-peer-deps\`, then \`npm run build\` with \`CI: false\` — see T059 and T107)` →
  `(\`npm ci\`, then \`npm run build\` — see T107)`.
- Replace the section "If the dev server reports errors that `tsc` and `npm run build` do not" with:

  ```markdown
  ### If the dev server reports errors that `tsc` and `npm run build` do not
  Vite pre-bundles dependencies into `node_modules/.vite`. After a dependency change or a branch switch
  under a running dev server, a stale pre-bundle can report errors no gate sees: stop it, then
  `rm -rf node_modules/.vite` (or `npx vite --force`) and start again. The dev server does not type-check;
  `npx tsc --noEmit` does, and `npm run build` runs it first.
  ```

- Gate 3: replace its text with: "**`npm run build` — required.** It runs `tsc --noEmit`, then `vite build`, and it is
  the only gate that bundles. A module that only works under jest's resolver, or a `process.env` name that Vite does not
  replace, fails here."
- Gate 4: "`main.js` must stay under the ceiling" → "the entry (what `build/index.html` loads) must stay under the ceiling".
- `sideEffects` paragraph: "webpack may drop" → "Rollup (`vite build`) may drop". "silently dropped by webpack, in the dev
  server and the build alike, while jest still runs it" → "silently dropped from the build, while the dev server (which does
  not tree-shake) and jest still run it". If Task 4 Step 4 needed the `moduleSideEffects` option, name it here.
- Resolver table: title → "**Three resolvers agree on `@/` and `baseUrl`; `ts-node` does not:**". Replace the webpack row
  with `| Vite (\`npm start\`, \`npm run build\`, via \`vite-tsconfig-paths\`) | ✅ | ✅ |`. Keep the `ts-node` row and its paragraph.
  In gate 3's old text, the advice "Use bare `baseUrl` imports… `@/` is safe only in `__tests__/`" goes. Bare imports
  remain the convention because `ts-node` and the existing code use them.
- "Environment gotchas", first bullet: "the dev server listens on IPv4 only" →
  "the dev server listens on IPv4 only (`server.host` in `vite.config.ts`)".

- [ ] **Step 3: AGENTS.md**

Same facts, in its own sections. Lines 114-115 (webpack caches) get the Vite paragraph from Step 2. Line 142
"since `react-scripts build` type-checks all of `src/`" → "since `npm run build` runs it first". Line 144 and the table
row at 158 as in Step 2.

- [ ] **Step 4: Source comments**

- `src/assets/images.d.ts`: "its built URL (webpack's `asset/resource`, hashed file name)" → "its built URL (a hashed file
  under `assets/`)". Drop the sentence about `react-app-env.d.ts` and `react-scripts`' read-only `NODE_ENV`, and keep
  "In jest the import is `src/__mocks__/fileMock.ts`."
- `src/core/attribution/attribution.ts:3`: read the comment. It says bare imports are needed because react-scripts' webpack
  ignores `paths`. Change it to say bare imports are the repo's convention (`ts-node` honours neither form).

- [ ] **Step 5: TODO.md**

- Delete T059's priority row and its `### T059` entry.
- Delete T108's priority row and entry. `CI=true` warnings-as-errors was react-scripts' behaviour, and Vite has none.
- T065: replace the opening "the maintainer's global Firebase CLI is still 13.x" facts with what was measured on
  2026-10-06. The global CLI is **15.32.1**, past the pin, and with Java 17 the emulators refuse to start: firebase-tools 15
  needs **Java 21** (15.22.4 too). What is left: install JDK 21, then `npm i -g firebase-tools@15.22.4` and one
  start/stop round trip.
- `grep -n "T059\|T108" TODO.md CLAUDE.md AGENTS.md .github -r` → nothing (memory rule: no "fixed by" notes).

- [ ] **Step 6: All gates**

Run, in order and with nothing else competing for CPU: `npx tsc --noEmit`, `npm run lint`, `npm run lint:tests`,
`npm run test:ci`, `npm run build`, `npm run check:bundle`.
Expected: all green, test totals equal to the baseline measured in Task 2 Step 8.

- [ ] **Step 7: Commit**

```bash
git add .github CLAUDE.md AGENTS.md src/assets/images.d.ts src/core/attribution/attribution.ts TODO.md
git commit -m "chore: CI installs without --legacy-peer-deps; docs and backlog describe Vite (T059)"
```

---

### Task 6: Browser checks (needs the maintainer's emulators: Java 21)

jsdom cannot see any of this, so this task is what proves the move. Per the browser-checks setup, it runs against the
maintainer's dev server in the main checkout, on this branch. Ask the maintainer to switch the checkout and run
`.\scripts\start-dev.ps1 -Action restart`. This branch's script will refuse with a clear message if Java is still 17.

- [ ] **Step 1: Dev server**

At `http://localhost:3000`: the console shows `🔧 Firebase Configuration: Using emulators: true` and no
`process is not defined`. Sign in as `player8@example.com` via the "Open the emulator's link" button (its presence proves
`NODE_ENV === "development"` and `REACT_APP_USE_EMULATORS` reached the client). Open Story, Quests, NPCs, Locations,
Notes, Profile and Admin. Each renders. The sign-in page's `.webp` portrait loads (a bare `assets/…` import resolved by
`vite-tsconfig-paths`). Edit a component: Fast Refresh updates it without a full reload.

- [ ] **Step 2: Built site, against the emulators**

```bash
npx vite build --mode development --outDir build-dev && npx vite preview --outDir build-dev
```

(`--mode development` reads `.env.development`, so it is the emulators and not production; `NODE_ENV` is still
`production`, so `prefetchPages` runs.) At `http://127.0.0.1:4173`, signed in: the network panel shows route chunks
fetched at idle after the first page. Then the Review Focus 3 check: load `/`, delete
`build-dev/assets/QuestsPage-*.js` (whatever the quests chunk is called), and click Quests. Expected: one reload, then
the error boundary, not a reload loop. Delete `build-dev/` afterwards (it is not in `.gitignore`).

- [ ] **Step 3: Script round trip**

`.\scripts\start-dev.ps1 -Action stop`: it exports (the CLI's output is visible now), stops, and leaves
`firebase/emulator-data` updated. Then `-Action start` brings both back.

- [ ] **Step 4: Push and open the PR**

Push `chore/t059-vite` and open the PR. In the body: the measured entry size against CRA's 264.23 kB, whether the
`moduleSideEffects` option was needed, the Vite-7-not-8 reason, and that Vite's dev server no longer shows type errors
in the browser (CRA's did); `tsc` in `npm run build` is the gate. Do not watch CI (CLAUDE.md). Once the preview deploy
is up, the maintainer can open it and see the production Firebase project in the console log's config (Review Focus 2).
Sign-in there is T110's problem, not this PR's.
