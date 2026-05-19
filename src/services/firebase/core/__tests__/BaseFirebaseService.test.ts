// src/services/firebase/core/__tests__/BaseFirebaseService.test.ts

/**
 * Tests for BaseFirebaseService
 *
 * BaseFirebaseService is abstract.  We exercise it through a minimal
 * concrete subclass defined inside this file.
 *
 * All Firebase SDK modules are mocked so no real Firebase app is initialised.
 */

// ─── Firebase SDK mocks ──────────────────────────────────────────────────────

const mockAuth = { currentUser: null as any };
const mockDb = {};
const mockAnalytics = {};
const mockFunctions = {};
const mockApp = {};

jest.mock('firebase/app', () => ({
  initializeApp: jest.fn(() => mockApp),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => mockAuth),
  connectAuthEmulator: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => mockDb),
  connectFirestoreEmulator: jest.fn(),
}));

jest.mock('firebase/analytics', () => ({
  getAnalytics: jest.fn(() => mockAnalytics),
}));

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => mockFunctions),
  connectFunctionsEmulator: jest.fn(),
}));

// Mock the firebaseConfig module
jest.mock('../../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test-project' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

// ─── Test subclass & suite ────────────────────────────────────────────────────

describe('BaseFirebaseService', () => {
  let BaseFirebaseService: typeof import('../BaseFirebaseService').default;
  let ServiceRegistry: typeof import('../ServiceRegistry').default;

  beforeEach(() => {
    jest.resetModules();

    // Re-mock after resetModules
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => mockApp) }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => mockAuth),
      connectAuthEmulator: jest.fn(),
    }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => mockDb),
      connectFirestoreEmulator: jest.fn(),
    }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => mockAnalytics) }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => mockFunctions),
      connectFunctionsEmulator: jest.fn(),
    }));
    jest.doMock('../../config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test-project' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    ServiceRegistry = require('../ServiceRegistry').default;
    BaseFirebaseService = require('../BaseFirebaseService').default;
  });

  // ─── Construction ──────────────────────────────────────────────────────────

  describe('constructor', () => {
    test('should construct without throwing', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      expect(() => new Concrete()).not.toThrow();
    });

    test('should reuse already-registered Firebase app (no double-init)', () => {
      const { initializeApp } = require('firebase/app');
      class Concrete extends (BaseFirebaseService as any) {}
      new Concrete(); // First instantiation registers app
      new Concrete(); // Second should not call initializeApp again
      expect(initializeApp).toHaveBeenCalledTimes(1);
    });
  });

  // ─── setActiveGroup / getActiveGroupId ────────────────────────────────────

  describe('setActiveGroup / getActiveGroupId', () => {
    test('getActiveGroupId should return null initially', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      const svc = new Concrete();
      // Reset static state by setting to null explicitly
      svc.setActiveGroup(null);
      expect(svc.getActiveGroupId()).toBeNull();
    });

    test('should store and return the active group ID', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      const svc = new Concrete();
      svc.setActiveGroup('group-abc');
      expect(svc.getActiveGroupId()).toBe('group-abc');
    });

    test('should update the active group ID when called again', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      const svc = new Concrete();
      svc.setActiveGroup('group-1');
      svc.setActiveGroup('group-2');
      expect(svc.getActiveGroupId()).toBe('group-2');
    });

    test('should clear the active group ID when set to null', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      const svc = new Concrete();
      svc.setActiveGroup('group-xyz');
      svc.setActiveGroup(null);
      expect(svc.getActiveGroupId()).toBeNull();
    });
  });

  // ─── setActiveCampaign / getActiveCampaignId ─────────────────────────────

  describe('setActiveCampaign / getActiveCampaignId', () => {
    test('should store and return the active campaign ID', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      const svc = new Concrete();
      svc.setActiveCampaign('campaign-99');
      expect(svc.getActiveCampaignId()).toBe('campaign-99');
    });

    test('should clear the active campaign ID when set to null', () => {
      class Concrete extends (BaseFirebaseService as any) {}
      const svc = new Concrete();
      svc.setActiveCampaign('campaign-abc');
      svc.setActiveCampaign(null);
      expect(svc.getActiveCampaignId()).toBeNull();
    });
  });

  // ─── static state is shared (class-level) ─────────────────────────────────

  describe('static group/campaign state', () => {
    test('setActiveGroup on one instance is visible from another instance', () => {
      class ConcreteA extends (BaseFirebaseService as any) {}
      class ConcreteB extends (BaseFirebaseService as any) {}
      const a = new ConcreteA();
      const b = new ConcreteB();
      a.setActiveGroup('shared-group');
      expect(b.getActiveGroupId()).toBe('shared-group');
    });

    test('setActiveCampaign on one instance is visible from another instance', () => {
      class ConcreteA extends (BaseFirebaseService as any) {}
      class ConcreteB extends (BaseFirebaseService as any) {}
      const a = new ConcreteA();
      const b = new ConcreteB();
      a.setActiveCampaign('shared-campaign');
      expect(b.getActiveCampaignId()).toBe('shared-campaign');
    });
  });

  // ─── getCurrentUser ───────────────────────────────────────────────────────

  describe('getCurrentUser', () => {
    test('should return null when auth.currentUser is null', () => {
      mockAuth.currentUser = null;
      class Concrete extends (BaseFirebaseService as any) {
        public expose() { return this.getCurrentUser(); }
      }
      const svc = new Concrete();
      expect(svc.expose()).toBeNull();
    });

    test('should return the currentUser when set', () => {
      const fakeUser = { uid: 'user-123' };
      mockAuth.currentUser = fakeUser;
      class Concrete extends (BaseFirebaseService as any) {
        public expose() { return this.getCurrentUser(); }
      }
      const svc = new Concrete();
      expect(svc.expose()).toBe(fakeUser);
      // Cleanup
      mockAuth.currentUser = null;
    });
  });

  // ─── generateSecureToken ─────────────────────────────────────────────────

  describe('generateSecureToken', () => {
    test('should return a 32-character hex string', () => {
      class Concrete extends (BaseFirebaseService as any) {
        public expose(): string { return this.generateSecureToken(); }
      }
      const svc = new Concrete();
      const token = svc.expose();
      expect(typeof token).toBe('string');
      expect(token).toHaveLength(32); // 16 bytes × 2 hex chars each
      expect(/^[0-9a-f]{32}$/.test(token)).toBe(true);
    });

    test('should return different tokens on successive calls', () => {
      class Concrete extends (BaseFirebaseService as any) {
        public expose(): string { return this.generateSecureToken(); }
      }
      const svc = new Concrete();
      const t1 = svc.expose();
      const t2 = svc.expose();
      // Extremely unlikely to be equal with real crypto
      expect(t1).not.toBe(t2);
    });
  });

  // ─── emulator connection (when useEmulators=true) ─────────────────────────

  describe('emulator connections', () => {
    test('should connect to emulators when useEmulators is true', () => {
      jest.resetModules();
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => mockApp) }));
      jest.doMock('firebase/auth', () => ({
        getAuth: jest.fn(() => mockAuth),
        connectAuthEmulator: jest.fn(),
      }));
      jest.doMock('firebase/firestore', () => ({
        getFirestore: jest.fn(() => mockDb),
        connectFirestoreEmulator: jest.fn(),
      }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => mockAnalytics) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => mockFunctions),
        connectFunctionsEmulator: jest.fn(),
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test-project' },
        useEmulators: true, // <-- emulators enabled
        emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));

      const BFS = require('../BaseFirebaseService').default;
      class Concrete extends BFS {}
      new Concrete();

      const { connectAuthEmulator } = require('firebase/auth');
      const { connectFirestoreEmulator } = require('firebase/firestore');
      const { connectFunctionsEmulator } = require('firebase/functions');

      expect(connectAuthEmulator).toHaveBeenCalled();
      expect(connectFirestoreEmulator).toHaveBeenCalled();
      expect(connectFunctionsEmulator).toHaveBeenCalled();
    });

    test('should NOT connect to emulators when useEmulators is false', () => {
      jest.resetModules();
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => mockApp) }));
      jest.doMock('firebase/auth', () => ({
        getAuth: jest.fn(() => mockAuth),
        connectAuthEmulator: jest.fn(),
      }));
      jest.doMock('firebase/firestore', () => ({
        getFirestore: jest.fn(() => mockDb),
        connectFirestoreEmulator: jest.fn(),
      }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => mockAnalytics) }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => mockFunctions),
        connectFunctionsEmulator: jest.fn(),
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test-project' },
        useEmulators: false,
        emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));

      const BFS = require('../BaseFirebaseService').default;
      class Concrete extends BFS {}
      new Concrete();

      const { connectAuthEmulator } = require('firebase/auth');
      expect(connectAuthEmulator).not.toHaveBeenCalled();
    });
  });
});
