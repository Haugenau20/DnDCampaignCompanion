// functions/test/emulator.ts
//
// Shared plumbing for suites that run against the emulators.

import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v2/https";

export const EMULATOR_HOSTS = {
  Firestore: process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080",
  Auth: process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099",
};

/**
 * Points the Admin SDK at the emulators under `projectId`, and initializes it
 * the way `src/index.ts` does in production.
 *
 * Call at the top of a suite, before anything reads `admin.firestore()`. Jest
 * gives each suite its own module registry, so each gets a fresh default app.
 *
 * @param {string} projectId A `demo-` id unique to the suite
 * @return {admin.firestore.Firestore} The emulator-backed Firestore
 */
export function useEmulatorProject(projectId: string): admin.firestore.Firestore {
  if (!projectId.startsWith("demo-")) {
    throw new Error(`Test project ids must start with "demo-": ${projectId}`);
  }
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOSTS.Firestore;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = EMULATOR_HOSTS.Auth;
  process.env.GCLOUD_PROJECT = projectId;
  if (admin.apps.length === 0) {
    admin.initializeApp({projectId});
  }
  return admin.firestore();
}

/**
 * Empties the project's Firestore and Auth data, and nobody else's.
 *
 * @param {string} projectId The suite's project id
 */
export async function clearProject(projectId: string): Promise<void> {
  await Promise.all([
    fetch(
      `http://${EMULATOR_HOSTS.Firestore}/emulator/v1/projects/${projectId}` +
        "/databases/(default)/documents",
      {method: "DELETE"}
    ),
    fetch(
      `http://${EMULATOR_HOSTS.Auth}/emulator/v1/projects/${projectId}/accounts`,
      {method: "DELETE"}
    ),
  ]);
}

/**
 * Invokes a v2 callable's handler directly, as the caller `uid` -- or
 * anonymously when `uid` is omitted.
 *
 * @param {object} fn The exported callable
 * @param {unknown} data The request payload
 * @param {string} uid The caller, if signed in
 * @param {string} email The caller's email claim
 * @return {Promise<unknown>} What the handler returned
 */
export async function call(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fn: {run: (request: any) => unknown},
  data: unknown,
  uid?: string,
  email?: string
): Promise<unknown> {
  return fn.run({
    data,
    auth: uid ? {uid, token: {uid, email}} : undefined,
    rawRequest: {},
    acceptsStreaming: false,
  });
}

/**
 * Asserts that a call is refused with a particular `HttpsError` code.
 *
 * @param {Promise<unknown>} promise The call
 * @param {string} code The expected code, e.g. "permission-denied"
 * @return {Promise<HttpsError>} The error, for further assertions
 */
export async function expectHttpsError(
  promise: Promise<unknown>,
  code: string
): Promise<HttpsError> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(HttpsError);
  expect((caught as HttpsError).code).toBe(code);
  return caught as HttpsError;
}
