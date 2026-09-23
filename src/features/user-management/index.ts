// src/features/user-management/index.ts

/**
 * Public API for the user-management domain.
 *
 * Import from this barrel only — never reach into the domain's internals.
 * Inside the domain, import siblings directly: importing this file from within
 * user-management creates a circular import.
 */

// Context & providers
export {
  FirebaseProvider,
  AUTH_STATE_CHANGED_EVENT,
  useFirebaseContext as useFirebase
} from './auth/context/FirebaseContext';

// Hooks
export { useAuth } from './auth/hooks/useAuth';
export { useUser } from './profiles/hooks/useUser';
export { useGroups } from './groups/hooks/useGroups';
export { useJoinGroupCompletion } from './groups/hooks/useJoinGroupCompletion';
export { useInvitations } from './groups/hooks/useInvitations';
export { useCampaigns } from './groups/hooks/useCampaigns';
export { useAccountTheme } from './profiles/hooks/useAccountTheme';
export { useFirestore } from './shared/hooks/useFirestore';
export { useUsernameLookup } from './shared/hooks/useUsernameLookup';

// Components
export { default as SessionManager } from './auth/components/SessionManager';
export { default as SessionTimeoutWarning } from './auth/components/SessionTimeoutWarning';
export { default as PrivacyNotice } from './auth/components/PrivacyNotice';
export { default as SignInForm } from './auth/components/SignInForm';
export { default as AccountCard } from './profiles/components/AccountCard';
export { default as GroupMembershipCard } from './profiles/components/GroupMembershipCard';
export { default as CharactersCard } from './profiles/components/CharactersCard';
export { default as AppearanceCard } from './profiles/components/AppearanceCard';
export { default as DangerZoneCard } from './profiles/components/DangerZoneCard';

// Route components
//
// These replaced `AdminPanel` and `JoinGroupDialog`, both deleted in 14-5
// along with every trigger that opened them. There is deliberately no shim:
// no `openAdminDialog` that redirects, no wrapper rendering a page inside a
// dialog. This project has already learned that an alias outlives the
// migration it was meant to enable (colour schema section 10), and the same
// applies to a surface.
export { default as AdminLayout } from './admin/pages/AdminLayout';
export { default as AdminPeoplePage } from './admin/pages/AdminPeoplePage';
export { default as AdminCampaignsPage } from './admin/pages/AdminCampaignsPage';
export { default as AdminGroupPage } from './admin/pages/AdminGroupPage';
export { default as SignInPage } from './auth/pages/SignInPage';
export { default as EmailLinkPage } from './auth/pages/EmailLinkPage';
export { default as JoinPage } from './groups/pages/JoinPage';

// The validated `next` destination, shared by every guard that redirects to
// sign-in. An unvalidated one is an open redirect (D45).
export { safeNextPath, signInPathFor, CAMPAIGN_HOME } from './auth/utils/next-path';
