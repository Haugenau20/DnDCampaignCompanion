// functions/jest.config.js
//
// Tests for the Cloud Functions and for `firestore.rules.prod`. Both run
// against the Firestore and Auth EMULATORS -- start them first, with
// `.\scripts\start-dev.ps1 -Action start` from the repo root.
//
// Every suite works under its own `demo-` project id. The emulator keeps each
// project's data apart, and a `demo-` id can never name a real project, so
// these suites cannot touch the dev data the app is using.
//
// Not part of the root `npm test`, and not run in CI: CI has no emulator.
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
