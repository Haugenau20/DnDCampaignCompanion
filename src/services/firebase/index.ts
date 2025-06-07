// src/services/firebase/index.ts
import { firebaseConfig } from './config/firebaseConfig';
import ServiceRegistry from './core/ServiceRegistry';
import AuthService from './auth/AuthService';
import UserService from './user/UserService';
import GroupService from './group/GroupService';
import InvitationService from './group/InvitationService';
import CampaignService from './campaign/CampaignService';
import DocumentService from './data/DocumentService';

/**
 * Initialize and register all Firebase services
 */
function initializeFirebaseServices() {
  const registry = ServiceRegistry.getInstance();
  
  // Initialize services in dependency order
  const userService = UserService.getInstance();
  registry.register('userService', userService);
  
  const groupService = GroupService.getInstance();
  registry.register('groupService', groupService);
  
  const authService = AuthService.getInstance();
  registry.register('authService', authService);
  
  const invitationService = InvitationService.getInstance();
  registry.register('invitationService', invitationService);
  
  const campaignService = CampaignService.getInstance();
  registry.register('campaignService', campaignService);
  
  const documentService = DocumentService.getInstance();
  registry.register('documentService', documentService);
  
  return {
    auth: authService,
    user: userService,
    group: groupService,
    invitation: invitationService,
    campaign: campaignService,
    document: documentService
  };
}

/**
 * Firebase services API
 */
const firebaseServices = initializeFirebaseServices();

export default firebaseServices;
export { firebaseConfig };

// Export individual services for direct access if needed
export const auth = firebaseServices.auth;
export const user = firebaseServices.user;
export const group = firebaseServices.group;
export const invitation = firebaseServices.invitation;
export const campaign = firebaseServices.campaign;
export const document = firebaseServices.document;