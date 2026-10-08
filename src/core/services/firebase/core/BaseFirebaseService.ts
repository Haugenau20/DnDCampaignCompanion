// src/core/services/firebase/core/BaseFirebaseService.ts
import { initializeApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, Auth, connectAuthEmulator 
} from "firebase/auth";
import {
  Firestore, connectFirestoreEmulator,
  doc, getDoc, DocumentData
} from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
import {
  getStorage, FirebaseStorage, connectStorageEmulator
} from "firebase/storage";
import { 
  getFunctions, Functions, connectFunctionsEmulator 
} from "firebase/functions";
import { 
  firebaseConfig, 
  useEmulators, 
  emulatorHost, 
  emulatorPorts 
} from "../config/firebaseConfig";
import ServiceRegistry from "./ServiceRegistry";
import { clearCacheOnSignOut, isRememberedSession, openFirestore } from "./firestoreCache";
import { SESSION_INFO_KEY } from "../auth/sessionTimeout";

/**
 * Whether this browser holds a remembered session, reading `localStorage`
 * defensively: a browser that refuses storage gets no persistent cache.
 */
const rememberedSession = (): boolean => {
  try {
    return isRememberedSession(localStorage.getItem(SESSION_INFO_KEY), Date.now());
  } catch {
    return false;
  }
};

/**
 * BaseFirebaseService provides core Firebase functionality and shared resources
 * for all derived service classes.
 */
abstract class BaseFirebaseService {
  protected registry: ServiceRegistry;
  protected app: FirebaseApp;
  protected auth: Auth;
  protected db: Firestore;
  protected analytics: Analytics;
  protected functions: Functions;
  protected storage: FirebaseStorage;
  
  // Shared group and campaign context
  private static activeGroupId: string | null = null;
  private static activeCampaignId: string | null = null;

  /**
   * How long a cached group profile may stand in for a read when stamping
   * attribution. A profile changed on another device is picked up after this.
   */
  public static readonly GROUP_PROFILE_TTL_MS = 5 * 60 * 1000;

  // Group profiles (`groups/{g}/users/{uid}`) by `g/uid`, shared by every
  // service: the last one read, and any read still in flight (T032).
  private static groupProfiles = new Map<string, { profile: DocumentData | null; readAt: number }>();
  private static groupProfileReads = new Map<string, Promise<DocumentData | null>>();

  constructor() {
    this.registry = ServiceRegistry.getInstance();
    
    // Initialize Firebase app if not already done
    if (!this.registry.has("app")) {
      const app = initializeApp(firebaseConfig);
      this.registry.register("app", app);
      
      // Initialize other Firebase services
      const auth = getAuth(app);
      // A persistent cache only for a remembered session (T130).
      const persistCache = rememberedSession();
      const db = openFirestore(app, persistCache);
      const analytics = getAnalytics(app);
      const functions = getFunctions(app, 'europe-west1');
      // From the default app: it is the one App Check is attached to
      // (src/index.tsx), and production Storage enforces App Check.
      const storage = getStorage(app);
      
      // Connect to emulators in development environment
      if (useEmulators) {
        console.log("Using Firebase Emulators");
        
        // Connect Auth to emulator
        connectAuthEmulator(
          auth, 
          `http://${emulatorHost}:${emulatorPorts.auth}`,
          { disableWarnings: true }
        );
        
        // Connect Firestore to emulator
        connectFirestoreEmulator(
          db, 
          emulatorHost, 
          parseInt(emulatorPorts.firestore)
        );
        
        // Connect Functions to emulator
        connectFunctionsEmulator(
          functions, 
          emulatorHost, 
          parseInt(emulatorPorts.functions)
        );

        // Connect Storage to emulator
        connectStorageEmulator(
          storage,
          emulatorHost,
          parseInt(emulatorPorts.storage)
        );
      }

      if (persistCache) {
        clearCacheOnSignOut(auth, db, () => window.location.reload());
      }
      
      this.registry.register("auth", auth);
      this.registry.register("db", db);
      this.registry.register("analytics", analytics);
      this.registry.register("functions", functions);
      this.registry.register("storage", storage);
    }
    
    // Get Firebase services from registry
    this.app = this.registry.get("app");
    this.auth = this.registry.get("auth");
    this.db = this.registry.get("db");
    this.analytics = this.registry.get("analytics");
    this.functions = this.registry.get("functions");
    this.storage = this.registry.get("storage");
  }
  
  /**
   * Get the current authenticated user
   */
  protected getCurrentUser() {
    return this.auth.currentUser;
  }
  
  /**
   * Set active group context
   * @param groupId ID of the group to set as active
   */
  public setActiveGroup(groupId: string | null): void {
    BaseFirebaseService.activeGroupId = groupId;
  }
  
  /**
   * Set active campaign context
   * @param campaignId ID of the campaign to set as active
   */
  public setActiveCampaign(campaignId: string | null): void {
    BaseFirebaseService.activeCampaignId = campaignId;
  }
  
  /**
   * Get the active group ID
   */
  public getActiveGroupId(): string | null {
    return BaseFirebaseService.activeGroupId;
  }
  
  /**
   * Get the active campaign ID
   */
  public getActiveCampaignId(): string | null {
    return BaseFirebaseService.activeCampaignId;
  }
  
  /**
   * Read a user's profile in a group from Firestore, and remember it.
   *
   * Always a real read -- callers that act on the profile's state (which
   * campaign is active, the user's characters) must not be served a cached
   * copy. Two identical reads in flight at once share one request, which is
   * what sign-in's concurrent restore paths used to issue (PERF-02).
   *
   * @param groupId ID of the group
   * @param userId ID of the user
   * @returns The profile's data, or null if the user has none in the group
   */
  protected readGroupProfile(groupId: string, userId: string): Promise<DocumentData | null> {
    const key = `${groupId}/${userId}`;
    const inFlight = BaseFirebaseService.groupProfileReads.get(key);
    if (inFlight) {
      return inFlight;
    }

    const read: Promise<DocumentData | null> = getDoc(doc(this.db, 'groups', groupId, 'users', userId))
      .then(snapshot => {
        const profile = snapshot.exists() ? snapshot.data() : null;
        // Only if nothing forgot this key while the read was out: a write
        // that landed during the read may be missing from what it returns.
        if (BaseFirebaseService.groupProfileReads.get(key) === read) {
          BaseFirebaseService.groupProfiles.set(key, { profile, readAt: Date.now() });
        }
        return profile;
      })
      .finally(() => {
        if (BaseFirebaseService.groupProfileReads.get(key) === read) {
          BaseFirebaseService.groupProfileReads.delete(key);
        }
      });
    BaseFirebaseService.groupProfileReads.set(key, read);
    return read;
  }

  /**
   * A user's profile in a group, from the cache when it was read within
   * `GROUP_PROFILE_TTL_MS`, otherwise read. For attribution only: a username
   * and active character a few minutes stale are acceptable there, and this
   * is what saves a read on every write (PERF-06, PERF-09).
   *
   * @param groupId ID of the group
   * @param userId ID of the user
   * @returns The profile's data, or null if the user has none in the group
   */
  protected cachedGroupProfile(groupId: string, userId: string): Promise<DocumentData | null> {
    const cached = BaseFirebaseService.groupProfiles.get(`${groupId}/${userId}`);
    if (cached && Date.now() - cached.readAt < BaseFirebaseService.GROUP_PROFILE_TTL_MS) {
      return Promise.resolve(cached.profile);
    }
    return this.readGroupProfile(groupId, userId);
  }

  /**
   * Drop a cached group profile after writing it, or every cached profile
   * (sign-out) when called with no arguments.
   *
   * @param groupId ID of the group
   * @param userId ID of the user
   */
  public forgetGroupProfile(groupId?: string, userId?: string): void {
    if (groupId === undefined || userId === undefined) {
      BaseFirebaseService.groupProfiles.clear();
      BaseFirebaseService.groupProfileReads.clear();
      return;
    }
    const key = `${groupId}/${userId}`;
    BaseFirebaseService.groupProfiles.delete(key);
    BaseFirebaseService.groupProfileReads.delete(key);
  }

  /**
   * Generate a secure random token
   */
  protected generateSecureToken(): string {
    // Generate a random 16-byte token and convert to hex
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

export default BaseFirebaseService;