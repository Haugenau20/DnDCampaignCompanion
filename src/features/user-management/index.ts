// src/features/user-management/index.ts
export { FirebaseProvider, AUTH_STATE_CHANGED_EVENT, useFirebaseContext as useFirebase } from './auth/context/FirebaseContext';
export { useAuth } from './auth/hooks/useAuth';
export { useUser } from './profiles/hooks/useUser';
export { useGroups } from './groups/hooks/useGroups';
export { useInvitations } from './groups/hooks/useInvitations';
export { useCampaigns } from './groups/hooks/useCampaigns';
export { useFirestore } from './shared/hooks/useFirestore';
export { useUsernameLookup } from './shared/hooks/useUsernameLookup';
