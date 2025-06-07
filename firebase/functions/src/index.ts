import * as admin from "firebase-admin";

admin.initializeApp();

// Export all functions
export { extractEntities, getUsageStatus } from "./entityExtraction";
export { sendContactEmail } from "./contact";
export { deleteUser, removeUserFromGroup } from "./userManagement";