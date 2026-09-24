// src/core/services/firebase/auth/AuthService.ts
import { 
    User,
    UserCredential,
    GoogleAuthProvider,
    sendSignInLinkToEmail,
    isSignInWithEmailLink,
    signInWithEmailLink,
    signInWithPopup,
    signInWithCustomToken,
    linkWithPopup,
    getAdditionalUserInfo,
    deleteUser,
    signOut as firebaseSignOut,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
  } from 'firebase/auth';
  import { doc, updateDoc, getDoc } from 'firebase/firestore';
  import { httpsCallable } from 'firebase/functions';
  import BaseFirebaseService from '../core/BaseFirebaseService';
  import ServiceRegistry from '../core/ServiceRegistry';
  import type UserService from '../user/UserService';
  import { SESSION_DURATION, REMEMBER_ME_DURATION, INACTIVITY_TIMEOUT } from '../config/firebaseConfig';

  /** Where `sendSignInLink` remembers the address it sent a link to. */
  export const PENDING_EMAIL_SIGN_IN_KEY = 'pendingEmailSignIn';

  /** A sign-in link this browser has sent and not yet used. */
  export interface PendingEmailSignIn {
    email: string;
    rememberMe: boolean;
  }

  /**
   * A request to sign this device in from another one, as `startDeviceSignIn`
   * opened it. `secret` never leaves this device; `code` is shown to the
   * reader, who types it on the device that approves.
   */
  export interface DeviceSignInRequest {
    requestId: string;
    secret: string;
    code: string;
    /** Epoch millis after which the request can no longer be used. */
    expiresAt: number;
  }

  /** What polling a request reports. */
  export type DeviceSignInClaim =
    | { status: 'pending' }
    | { status: 'expired' }
    | { status: 'approved'; token: string };

  /** A way into an account, as the account settings name it. */
  export type SignInMethod = 'email' | 'google';

  /** What a completed sign-in reports. */
  export interface SignInResult {
    user: User;
    /** True when this sign-in created the account. */
    isNewUser: boolean;
  }

  /**
   * Session-only unless the user asked to be kept signed in.
   * @param rememberMe Whether the session should outlive the browser
   */
  const persistenceFor = (rememberMe: boolean) =>
    rememberMe ? browserLocalPersistence : browserSessionPersistence;

  /**
   * A Google provider that always shows the account picker, pre-selecting
   * `loginHint` when there is one.
   * @param loginHint The Google address to suggest
   */
  const googleProvider = (loginHint?: string): GoogleAuthProvider => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters(
      loginHint ? { prompt: 'select_account', login_hint: loginHint } : { prompt: 'select_account' }
    );
    return provider;
  };
  
  /**
   * AuthService handles all authentication-related operations
   */
  class AuthService extends BaseFirebaseService {
    private static instance: AuthService;
    private userService: UserService;
  
    private constructor() {
      super();
      this.userService = ServiceRegistry.getInstance().get('userService');
    }
  
    /**
     * Get singleton instance of AuthService
     */
    public static getInstance(): AuthService {
      if (!AuthService.instance) {
        AuthService.instance = new AuthService();
      }
      return AuthService.instance;
    }
  
    /**
     * Get the auth instance
     */
    public getAuth() {
      return this.auth;
    }

    /**
     * Get the current authenticated user's ID
     * @returns User ID or null if not authenticated
     */
    public getCurrentUserId(): string | null {
        return this.getCurrentUser()?.uid || null;
    }
    
    /**
     * Get the current authenticated user
     * @returns User object or null if not authenticated
     */
    public getUser(): User | null {
        return this.getCurrentUser();
    }

    /**
     * Renew the current session with updated timing
     * @param rememberMe Whether to use extended session duration
     */
    public async renewSession(rememberMe: boolean = false): Promise<void> {
        try {
        const user = this.getCurrentUser();
        if (!user) {
            throw new Error('No authenticated user');
        }
        
        // Create a new session with updated timing
        const sessionInfo = {
            createdAt: new Date().getTime(),
            expiresAt: new Date().getTime() + (rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION),
            lastActivityAt: new Date().getTime(),
            rememberMe: rememberMe
        };
        localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
        
        // Update Firebase Auth persistence if different from current setting
        const persistenceType = rememberMe 
            ? browserLocalPersistence 
            : browserSessionPersistence;
        
        // Try to set persistence - may fail if user's session isn't fresh enough
        try {
            await setPersistence(this.auth, persistenceType);
        } catch (err) {
            console.log('Could not change persistence level - continuing with current level');
        }
        } catch (err) {
        console.error('Failed to renew session:', err);
        throw err;
        }
    }
  
    /**
     * Updates the last activity timestamp for the current session
     * Used for the sliding window session timeout
     */
    public updateLastActivity(): void {
      const sessionInfoStr = localStorage.getItem('sessionInfo');
      if (sessionInfoStr) {
        try {
          const sessionInfo = JSON.parse(sessionInfoStr);
          sessionInfo.lastActivityAt = new Date().getTime();
          localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));
        } catch (e) {
          console.error('Error updating last activity:', e);
        }
      }
    }
  
    /**
     * Checks if the current session has expired based on inactivity
     * @returns true if the session has expired, false otherwise
     */
    public checkSessionExpired(): boolean {
      const sessionInfoStr = localStorage.getItem('sessionInfo');
      if (!sessionInfoStr) return false; // No session info, let Firebase handle it
      
      try {
        const sessionInfo = JSON.parse(sessionInfoStr);
        const now = new Date().getTime();
        
        // Check absolute expiry (30 days for rememberMe, 24 hours for session)
        if (now > sessionInfo.expiresAt) {
          return true;
        }
        
        // Check inactivity timeout (24 hours of inactivity)
        if (now - sessionInfo.lastActivityAt > INACTIVITY_TIMEOUT) {
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Error checking session expiry:', e);
        return false;
      }
    }
  

    /**
     * Email a magic sign-in link to `email`.
     *
     * Passwordless: the link is the credential. `continueUrl` is where the
     * link lands -- the `/auth/link` page, carrying whatever that page needs to
     * finish the job (a `next` destination, or an invitation to redeem).
     * Firebase appends its own parameters to it.
     *
     * The address and the "keep me signed in" choice are remembered in this
     * browser, so opening the link here does not ask for the address again.
     * Opened on another device, the page has to ask -- Firebase requires the
     * address to match the one the link was sent to.
     *
     * @param email Where to send the link
     * @param continueUrl Absolute URL the link opens
     * @param rememberMe Whether the session should outlive the browser
     */
    public async sendSignInLink(email: string, continueUrl: string, rememberMe: boolean = false): Promise<void> {
      await sendSignInLinkToEmail(this.auth, email, { url: continueUrl, handleCodeInApp: true });
      const pending: PendingEmailSignIn = { email, rememberMe };
      localStorage.setItem(PENDING_EMAIL_SIGN_IN_KEY, JSON.stringify(pending));
    }

    /**
     * The sign-in link this browser is waiting on, if any.
     * @returns The address and session choice `sendSignInLink` stored
     */
    public getPendingEmailSignIn(): PendingEmailSignIn | null {
      try {
        const stored = localStorage.getItem(PENDING_EMAIL_SIGN_IN_KEY);
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return typeof parsed?.email === 'string'
          ? { email: parsed.email, rememberMe: parsed.rememberMe === true }
          : null;
      } catch {
        return null;
      }
    }

    /**
     * Whether `url` is a Firebase sign-in link.
     * @param url Usually `window.location.href`
     */
    public isSignInLink(url: string): boolean {
      return isSignInWithEmailLink(this.auth, url);
    }

    /**
     * Finish signing in from a magic link.
     *
     * For an address with no account, this is also where the account is
     * created -- and where the `gateAccountCreation` blocking function refuses
     * it unless an invitation reserved the address first.
     *
     * @param email The address the link was sent to
     * @param url The link, as opened
     * @param rememberMe Whether the session should outlive the browser
     * @returns The user, and whether the account was created just now
     */
    public async completeSignInLink(email: string, url: string, rememberMe: boolean = false): Promise<SignInResult> {
      await setPersistence(this.auth, persistenceFor(rememberMe));
      const credential = await signInWithEmailLink(this.auth, email, url);
      localStorage.removeItem(PENDING_EMAIL_SIGN_IN_KEY);
      return this.finishSignIn(credential, rememberMe);
    }

    /**
     * Open a request to sign this device in from another one -- the device the
     * magic link will be opened on. Its id goes into the link.
     * @param email The address the link is about to be sent to
     */
    public async startDeviceSignIn(email: string): Promise<DeviceSignInRequest> {
      const start = httpsCallable<{ email: string }, DeviceSignInRequest>(this.functions, 'startDeviceSignIn');
      return (await start({ email })).data;
    }

    /**
     * Ask whether another device has approved the request yet, and collect the
     * sign-in token when it has. The token is handed over once only.
     * @param request The request `startDeviceSignIn` opened
     */
    public async claimDeviceSignIn(request: Pick<DeviceSignInRequest, 'requestId' | 'secret'>): Promise<DeviceSignInClaim> {
      const claim = httpsCallable<{ requestId: string; secret: string }, DeviceSignInClaim>(this.functions, 'claimDeviceSignIn');
      return (await claim({ requestId: request.requestId, secret: request.secret })).data;
    }

    /**
     * The address another device's request was opened for, so approving it
     * need not ask for it again. Only for approving: signing *this* device in
     * must still ask, as Firebase's guard against someone else's link.
     * @param requestId The request id the link carries
     */
    public async lookUpDeviceSignIn(requestId: string): Promise<string> {
      const lookUp = httpsCallable<{ requestId: string }, { email: string }>(this.functions, 'lookUpDeviceSignIn');
      return (await lookUp({ requestId })).data.email;
    }

    /**
     * Sign in with the token an approved request handed over. The account
     * exists already -- the approval came from it -- so nothing is created.
     * @param token From `claimDeviceSignIn`
     * @param rememberMe Whether the session should outlive the browser
     */
    public async signInWithDeviceToken(token: string, rememberMe: boolean = false): Promise<SignInResult> {
      await setPersistence(this.auth, persistenceFor(rememberMe));
      const credential = await signInWithCustomToken(this.auth, token);
      localStorage.removeItem(PENDING_EMAIL_SIGN_IN_KEY);
      return this.finishSignIn(credential, rememberMe);
    }

    /**
     * Sign in with a Google account, in a popup.
     *
     * Like a magic link, this creates the account when there is none, so it is
     * subject to the same gate. `loginHint` pre-selects the address an
     * invitation was reserved for; the picker is shown regardless, so somebody
     * with several Google accounts sees which one they are using.
     *
     * @param rememberMe Whether the session should outlive the browser
     * @param loginHint The Google address to suggest
     * @returns The user, and whether the account was created just now
     */
    public async signInWithGoogle(rememberMe: boolean = false, loginHint?: string): Promise<SignInResult> {
      await setPersistence(this.auth, persistenceFor(rememberMe));
      const credential = await signInWithPopup(this.auth, googleProvider(loginHint));
      return this.finishSignIn(credential, rememberMe);
    }

    /**
     * Add Google as a way into the signed-in account.
     *
     * The deliberate way to merge: somebody who signs in by magic link attaches
     * their Google account, and from then on either opens the same account.
     * Creates nothing, so the sign-up gate does not apply.
     */
    public async linkGoogle(): Promise<User> {
      const user = this.getCurrentUser();
      if (!user) {
        throw new Error('No authenticated user');
      }
      const credential = await linkWithPopup(user, googleProvider(user.email ?? undefined));
      return credential.user;
    }

    /**
     * The ways the signed-in account can sign in, in a stable order.
     *
     * An account made by magic link reports the `password` provider -- email
     * link sign-in is a mode of it -- so that provider is shown as the email.
     */
    public getSignInMethods(): SignInMethod[] {
      const providers = new Set((this.getCurrentUser()?.providerData ?? []).map((p) => p.providerId));
      const methods: SignInMethod[] = [];
      if (providers.has('password')) methods.push('email');
      if (providers.has('google.com')) methods.push('google');
      return methods;
    }

    /**
     * Delete the signed-in account. Only for an account created moments ago
     * whose invitation then could not be redeemed: an account in no group can
     * never see anything, so it is removed rather than left behind. Deleting an
     * established account goes through the `deleteUser` function instead.
     */
    public async deleteFreshAccount(): Promise<void> {
      const user = this.getCurrentUser();
      if (user) {
        await deleteUser(user);
      }
    }

    /**
     * What every successful sign-in does next, whichever way it came.
     *
     * A brand-new account has no profile yet -- `redeemInvitation` writes it --
     * so only an existing one gets its last-login date and active group. The
     * profile is read first for that reason: updating a document that does not
     * exist throws, and used to fail the sign-in with it.
     */
    private async finishSignIn(credential: UserCredential, rememberMe: boolean): Promise<SignInResult> {
      const isNewUser = getAdditionalUserInfo(credential)?.isNewUser === true;

      // Store the session creation time and settings in local storage
      const sessionInfo = {
        createdAt: new Date().getTime(),
        expiresAt: new Date().getTime() + (rememberMe ? REMEMBER_ME_DURATION : SESSION_DURATION),
        lastActivityAt: new Date().getTime(),
        rememberMe: rememberMe
      };
      localStorage.setItem('sessionInfo', JSON.stringify(sessionInfo));

      const userDoc = doc(this.db, 'users', credential.user.uid);
      const userDocSnapshot = await getDoc(userDoc);
      if (userDocSnapshot.exists()) {
        // Update last login date in global user profile
        await updateDoc(userDoc, {
          lastLogin: new Date()
        });

        const userData = userDocSnapshot.data();

        // Set active group from user preferences
        if (userData.activeGroupId) {
          this.setActiveGroup(userData.activeGroupId);

          // If user has a group profile, get active campaign ID
          const groupUserDoc = await this.userService.getGroupUserProfile(userData.activeGroupId, credential.user.uid);
          if (groupUserDoc && groupUserDoc.activeCampaignId) {
            this.setActiveCampaign(groupUserDoc.activeCampaignId);
          }
        }
      }

      return { user: credential.user, isNewUser };
    }
    
    /**
     * Sign out and clear session data
     */
    public async signOut(): Promise<void> {
      // Clear the session info from local storage
      localStorage.removeItem('sessionInfo');
      
      // Clear group/campaign context
      this.setActiveGroup(null);
      this.setActiveCampaign(null);
      
      // Sign out from Firebase Auth
      await firebaseSignOut(this.auth);
    }
  }
  
  export default AuthService;