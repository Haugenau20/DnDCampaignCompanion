// functions/src/index.ts
import * as admin from "firebase-admin";
import { sendContactEmail } from "./contact";
import * as userManagement from './userManagement';

// Initialize Firebase Admin SDK once
admin.initializeApp();

// Export contact function
export { sendContactEmail };

// Export user management functions
export const deleteUser = userManagement.deleteUser;
export const removeUserFromGroup = userManagement.removeUserFromGroup;