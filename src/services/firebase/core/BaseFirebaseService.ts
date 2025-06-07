// src/services/firebase/core/BaseFirebaseService.ts
import { initializeApp, FirebaseApp } from "firebase/app";
import { 
  getAuth, Auth, connectAuthEmulator 
} from "firebase/auth";
import { 
  getFirestore, Firestore, connectFirestoreEmulator 
} from "firebase/firestore";
import { getAnalytics, Analytics } from "firebase/analytics";
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
  
  // Shared group and campaign context
  private static activeGroupId: string | null = null;
  private static activeCampaignId: string | null = null;

  constructor() {
    this.registry = ServiceRegistry.getInstance();
    
    // Initialize Firebase app if not already done
    if (!this.registry.has("app")) {
      const app = initializeApp(firebaseConfig);
      this.registry.register("app", app);
      
      // Initialize other Firebase services
      const auth = getAuth(app);
      const db = getFirestore(app);
      const analytics = getAnalytics(app);
      const functions = getFunctions(app, 'europe-west1');
      
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
      }
      
      this.registry.register("auth", auth);
      this.registry.register("db", db);
      this.registry.register("analytics", analytics);
      this.registry.register("functions", functions);
    }
    
    // Get Firebase services from registry
    this.app = this.registry.get("app");
    this.auth = this.registry.get("auth");
    this.db = this.registry.get("db");
    this.analytics = this.registry.get("analytics");
    this.functions = this.registry.get("functions");
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