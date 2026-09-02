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
export { default as JoinGroupDialog } from './groups/components/JoinGroupDialog';
export { default as AdminPanel } from './admin/components/AdminPanel';
