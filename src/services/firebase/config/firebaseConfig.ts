// src/services/firebase/config/firebaseConfig.ts

/**
 * Firebase configuration object with environment-aware settings
 */
// Get configuration from environment variables if available, otherwise use hardcoded values
const config = {
  apiKey: process.env.REACT_APP_API_KEY || "AIzaSyAxoVz2ELzTQ4qTFsLfpI_WmvPGxB13St8",
  authDomain: process.env.REACT_APP_AUTH_DOMAIN || "dnd-campaign-companion.firebaseapp.com",
  projectId: process.env.REACT_APP_PROJECT_ID || "dnd-campaign-companion",
  storageBucket: process.env.REACT_APP_STORAGE_BUCKET || "dnd-campaign-companion.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID || "878883683429",
  appId: process.env.REACT_APP_APP_ID || "1:878883683429:web:d710fa55ae118ec32d1a8c",
  measurementId: process.env.REACT_APP_MEASUREMENT_ID || "G-TX89XGGZE0"
};

export const firebaseConfig = config;

/**
 * Emulator configuration
 */
// Check if emulators should be used (development environment)
export const useEmulators = process.env.REACT_APP_USE_EMULATORS === "true";

// Emulator connection information
export const emulatorHost = process.env.REACT_APP_EMULATOR_HOST || "localhost";
export const emulatorPorts = {
  auth: process.env.REACT_APP_AUTH_EMULATOR_PORT || "9099",
  firestore: process.env.REACT_APP_FIRESTORE_EMULATOR_PORT || "8080",
  functions: process.env.REACT_APP_FUNCTIONS_EMULATOR_PORT || "5001",
  storage: process.env.REACT_APP_STORAGE_EMULATOR_PORT || "9199",
};

/**
 * Time constants used for session management
 * (Re-exported here for convenience)
 */
export {
  SESSION_DURATION,
  REMEMBER_ME_DURATION,
  INACTIVITY_TIMEOUT
} from "../../../constants/time";