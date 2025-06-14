// src/test-utils/firebase-test-helpers.ts

import { generateSampleData } from '../utils/__dev__/dndSampleDataGenerator';

// Test configuration for Firebase emulators
export const TEST_CONFIG = {
  useEmulators: true,
  projectId: 'test-project',
  auth: {
    host: 'localhost',
    port: 9099
  },
  firestore: {
    host: 'localhost', 
    port: 8080
  }
};

// Mock test user data
export const TEST_USERS = {
  testUser1: {
    uid: 'test-user-1',
    email: 'test1@example.com',
    displayName: 'Test User 1'
  },
  testUser2: {
    uid: 'test-user-2', 
    email: 'test2@example.com',
    displayName: 'Test User 2'
  }
};

// Helper to populate emulator with your existing sample data
export const setupTestData = async () => {
  console.log('Setting up test data using existing generators...');
  try {
    await generateSampleData();
    console.log('Test data setup completed');
  } catch (error) {
    console.error('Failed to setup test data:', error);
    throw error;
  }
};

// Helper to clean up test data after tests
export const cleanupTestData = async () => {
  // We can implement cleanup logic if needed
  // For now, emulator data is ephemeral between test runs
  console.log('Test cleanup completed');
};

// Enhanced mock Firebase context for unit tests
export const createMockFirebaseContext = (overrides = {}) => ({
  auth: {
    currentUser: TEST_USERS.testUser1,
    signOut: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    ...overrides.auth
  },
  firestore: {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    setDoc: jest.fn(),
    updateDoc: jest.fn(),
    deleteDoc: jest.fn(),
    ...overrides.firestore
  },
  isEmulator: true,
  ...overrides
});