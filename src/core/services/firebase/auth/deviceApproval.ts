// src/core/services/firebase/auth/deviceApproval.ts
import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  inMemoryPersistence,
  connectAuthEmulator,
  signInWithEmailLink,
  signOut,
  Auth
} from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import {
  firebaseConfig,
  useEmulators,
  emulatorHost,
  emulatorPorts
} from '../config/firebaseConfig';
import { attachAppCheck } from '../config/appCheck';

/**
 * Sign in with a magic link on a throwaway Firebase instance, approve another
 * device's sign-in request, and return the code that device must type.
 *
 * Approving needs proof that the reader owns the address, and the only proof
 * on hand is the magic link -- which Firebase consumes by signing in. Doing
 * that on the app's own Firebase instance would sign this device in too, fire
 * the app's auth listeners, and replace whoever was signed in here already.
 *
 * So it happens on a second, named Firebase app in this same page and project,
 * whose sign-in is held in memory only: nothing reaches this browser's
 * storage, the app's own session is never touched, and the throwaway is
 * signed out and deleted before this returns, whatever happened.
 *
 * @param email The address the link was sent to
 * @param link The magic link, as opened
 * @param requestId The request the link carries
 * @returns The code to type on the device that asked
 */
export async function approveDeviceSignIn(email: string, link: string, requestId: string): Promise<string> {
  // A unique name, so an earlier one still closing is no clash.
  const app: FirebaseApp = initializeApp(firebaseConfig, `device-approval-${Date.now()}`);
  let auth: Auth | undefined;

  try {
    // Before Auth: it attaches the app's App Check token to every request,
    // and production refuses a sign-in without one. The default app's App
    // Check does not cover this one.
    if (!useEmulators) attachAppCheck(app);
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
    const functions = getFunctions(app, 'europe-west1');
    if (useEmulators) {
      connectAuthEmulator(auth, `http://${emulatorHost}:${emulatorPorts.auth}`, { disableWarnings: true });
      connectFunctionsEmulator(functions, emulatorHost, parseInt(emulatorPorts.functions));
    }
    await signInWithEmailLink(auth, email, link);
    const approve = httpsCallable<{ requestId: string }, { code: string }>(functions, 'approveDeviceSignIn');
    return (await approve({ requestId })).data.code;
  } finally {
    try {
      if (auth) await signOut(auth);
    } finally {
      await deleteApp(app);
    }
  }
}
