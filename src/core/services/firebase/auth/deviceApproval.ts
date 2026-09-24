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
import { getFunctions, connectFunctionsEmulator, httpsCallable, Functions } from 'firebase/functions';
import {
  firebaseConfig,
  useEmulators,
  emulatorHost,
  emulatorPorts
} from '../config/firebaseConfig';

/** A throwaway sign-in that can approve another device's request. */
export interface DeviceApproval {
  /**
   * Approve `requestId` with the code the other device shows. Rejects with
   * the function's own message on a wrong code, and may be called again.
   */
  approve(requestId: string, code: string): Promise<void>;
  /** Sign the throwaway out and delete it. Safe to call more than once. */
  close(): Promise<void>;
}

/**
 * Sign in with a magic link on a throwaway Firebase instance, to approve
 * another device's sign-in request without signing *this* device in.
 *
 * Approving needs proof that the reader owns the address, and the only proof
 * on hand is the magic link -- which Firebase consumes by signing in. Doing
 * that on the app's own Firebase instance would sign this device in too, fire
 * the app's auth listeners, and replace whoever was signed in here already.
 *
 * So it happens on a second, named Firebase app in this same page and project,
 * whose sign-in is held in memory only: nothing reaches this browser's
 * storage, and the app's own session is never touched.
 *
 * The link can be used once, so the throwaway stays open until `close` -- a
 * mistyped code can be retried without a new link.
 *
 * @param email The address the link was sent to
 * @param link The magic link, as opened
 */
export async function openDeviceApproval(email: string, link: string): Promise<DeviceApproval> {
  // A unique name, so an earlier one that was never closed is no clash.
  const app: FirebaseApp = initializeApp(firebaseConfig, `device-approval-${Date.now()}`);
  let closed = false;
  let auth: Auth | undefined;
  let functions: Functions | undefined;

  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      if (auth) await signOut(auth);
    } finally {
      await deleteApp(app);
    }
  };

  try {
    auth = initializeAuth(app, { persistence: inMemoryPersistence });
    functions = getFunctions(app, 'europe-west1');
    if (useEmulators) {
      connectAuthEmulator(auth, `http://${emulatorHost}:${emulatorPorts.auth}`, { disableWarnings: true });
      connectFunctionsEmulator(functions, emulatorHost, parseInt(emulatorPorts.functions));
    }
    await signInWithEmailLink(auth, email, link);
  } catch (error) {
    await close();
    throw error;
  }

  return {
    approve: async (requestId, code) => {
      await httpsCallable(functions as Functions, 'approveDeviceSignIn')({ requestId, code });
    },
    close
  };
}
