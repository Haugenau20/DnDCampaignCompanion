import {initializeApp} from "firebase-admin/app";

initializeApp();

// Export all functions
export { extractEntities, getUsageStatus } from "./entityExtraction";
export { sendContactEmail } from "./contact";
export { sweepContactThrottleDaily } from "./contactThrottle";
export { deleteUser, removeUserFromGroup } from "./userManagement";
export {
  createCampaign,
  deleteCampaign,
  resumeCampaignDeletionsDaily,
} from "./campaignManagement";
export { sweepOrphanedImagesDaily } from "./imageMaintenance";
export {
  createGroup,
  deleteGroup,
  redeemInvitation,
  resumeGroupDeletionsDaily,
  setMemberRole,
} from "./groupManagement";
export { gateAccountCreation, recountAccountsDaily, reserveSignUp } from "./signUp";
export {
  approveDeviceSignIn,
  claimDeviceSignIn,
  lookUpDeviceSignIn,
  startDeviceSignIn,
} from "./deviceSignIn";
