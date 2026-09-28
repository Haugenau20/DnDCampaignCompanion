// functions/jest.config.js
//
// Tests for the Cloud Functions and for `firestore.rules.prod`. Both run
// against the Firestore and Auth EMULATORS -- start them first, with
// `.\scripts\start-dev.ps1 -Action start` from the repo root. Or let
// `npm --prefix firebase run test:functions` start and stop them around the
// run, with the repo's pinned CLI.
//
// Every suite works under its own `demo-` project id. The emulator keeps each
// project's data apart, and a `demo-` id can never name a real project, so
// these suites cannot touch the dev data the app is using.
//
// Not part of the root `npm test`. CI runs it as the `functions` job in
// .github/workflows/test.yml, through `npm --prefix firebase run test:functions`.
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/test"],
  testMatch: ["**/*.test.ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: {
        module: "commonjs",
        moduleResolution: "node",
        esModuleInterop: true,
        strict: true,
        target: "es2020",
        types: ["jest", "node"],
      },
    }],
  },
  globalSetup: "<rootDir>/test/globalSetup.ts",
  // One emulator, shared: run the suites one after another.
  maxWorkers: 1,
  testTimeout: 30000,
};
