// src/context/firebase/index.ts
export { FirebaseProvider, AUTH_STATE_CHANGED_EVENT } from './FirebaseContext';
export { useAuth } from './hooks/useAuth';
export { useUser } from './hooks/useUser';
export { useGroups } from './hooks/useGroups';
export { useCampaigns } from './hooks/useCampaigns';
export { useInvitations } from './hooks/useInvitations';
export { useFirestore } from './hooks/useFirestore';

// Export legacy hook for backward compatibility - can be removed later
export { useFirebaseContext as useFirebase } from './FirebaseContext';