// src/services/firebase/config/__tests__/firebaseConfig.test.ts

/**
 * Tests for firebaseConfig.ts
 *
 * Strategy: isolate the module between tests so that env-var-driven
 * branches can be exercised independently via jest.resetModules().
 */

describe('firebaseConfig', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    // Clone env so we can mutate without polluting other tests
    process.env = { ...ORIGINAL_ENV };
  });

  afterAll(() => {
    process.env = ORIGINAL_ENV;
  });

  // ─── firebaseConfig object ────────────────────────────────────────────────

  describe('firebaseConfig', () => {
    test('should export a firebaseConfig object with required keys', () => {
      const { firebaseConfig } = require('../firebaseConfig');
      expect(firebaseConfig).toHaveProperty('apiKey');
      expect(firebaseConfig).toHaveProperty('authDomain');
      expect(firebaseConfig).toHaveProperty('projectId');
      expect(firebaseConfig).toHaveProperty('storageBucket');
      expect(firebaseConfig).toHaveProperty('messagingSenderId');
      expect(firebaseConfig).toHaveProperty('appId');
      expect(firebaseConfig).toHaveProperty('measurementId');
    });

    test('should use environment variable REACT_APP_API_KEY when set', () => {
      process.env.REACT_APP_API_KEY = 'env-api-key';
      const { firebaseConfig } = require('../firebaseConfig');
      expect(firebaseConfig.apiKey).toBe('env-api-key');
    });

    test('should fall back to default apiKey when REACT_APP_API_KEY is not set', () => {
      delete process.env.REACT_APP_API_KEY;
      const { firebaseConfig } = require('../firebaseConfig');
      // Default value is hard-coded in the source file
      expect(typeof firebaseConfig.apiKey).toBe('string');
      expect(firebaseConfig.apiKey.length).toBeGreaterThan(0);
    });

    test('should use environment variable REACT_APP_PROJECT_ID when set', () => {
      process.env.REACT_APP_PROJECT_ID = 'my-test-project';
      const { firebaseConfig } = require('../firebaseConfig');
      expect(firebaseConfig.projectId).toBe('my-test-project');
    });

    test('should use environment variable REACT_APP_AUTH_DOMAIN when set', () => {
      process.env.REACT_APP_AUTH_DOMAIN = 'test.firebaseapp.com';
      const { firebaseConfig } = require('../firebaseConfig');
      expect(firebaseConfig.authDomain).toBe('test.firebaseapp.com');
    });
  });

  // ─── useEmulators ─────────────────────────────────────────────────────────

  describe('useEmulators', () => {
    test('should be false when REACT_APP_USE_EMULATORS is not "true"', () => {
      delete process.env.REACT_APP_USE_EMULATORS;
      const { useEmulators } = require('../firebaseConfig');
      expect(useEmulators).toBe(false);
    });

    test('should be true when REACT_APP_USE_EMULATORS is "true"', () => {
      process.env.REACT_APP_USE_EMULATORS = 'true';
      const { useEmulators } = require('../firebaseConfig');
      expect(useEmulators).toBe(true);
    });

    test('should be false when REACT_APP_USE_EMULATORS is "false"', () => {
      process.env.REACT_APP_USE_EMULATORS = 'false';
      const { useEmulators } = require('../firebaseConfig');
      expect(useEmulators).toBe(false);
    });

    test('should be false when REACT_APP_USE_EMULATORS is "TRUE" (case-sensitive)', () => {
      process.env.REACT_APP_USE_EMULATORS = 'TRUE';
      const { useEmulators } = require('../firebaseConfig');
      // The check is strict string equality with "true"
      expect(useEmulators).toBe(false);
    });
  });

  // ─── emulatorHost ─────────────────────────────────────────────────────────

  describe('emulatorHost', () => {
    test('should default to "localhost" when REACT_APP_EMULATOR_HOST is not set', () => {
      delete process.env.REACT_APP_EMULATOR_HOST;
      const { emulatorHost } = require('../firebaseConfig');
      expect(emulatorHost).toBe('localhost');
    });

    test('should use REACT_APP_EMULATOR_HOST when set', () => {
      process.env.REACT_APP_EMULATOR_HOST = '192.168.1.50';
      const { emulatorHost } = require('../firebaseConfig');
      expect(emulatorHost).toBe('192.168.1.50');
    });
  });

  // ─── emulatorPorts ────────────────────────────────────────────────────────

  describe('emulatorPorts', () => {
    test('should export emulatorPorts with auth, firestore, functions, storage keys', () => {
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts).toHaveProperty('auth');
      expect(emulatorPorts).toHaveProperty('firestore');
      expect(emulatorPorts).toHaveProperty('functions');
      expect(emulatorPorts).toHaveProperty('storage');
    });

    test('should use default port "9099" for auth when env var is not set', () => {
      delete process.env.REACT_APP_AUTH_EMULATOR_PORT;
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts.auth).toBe('9099');
    });

    test('should use REACT_APP_AUTH_EMULATOR_PORT when set', () => {
      process.env.REACT_APP_AUTH_EMULATOR_PORT = '9100';
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts.auth).toBe('9100');
    });

    test('should use default port "8080" for firestore when env var is not set', () => {
      delete process.env.REACT_APP_FIRESTORE_EMULATOR_PORT;
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts.firestore).toBe('8080');
    });

    test('should use REACT_APP_FIRESTORE_EMULATOR_PORT when set', () => {
      process.env.REACT_APP_FIRESTORE_EMULATOR_PORT = '8081';
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts.firestore).toBe('8081');
    });

    test('should use default port "5001" for functions when env var is not set', () => {
      delete process.env.REACT_APP_FUNCTIONS_EMULATOR_PORT;
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts.functions).toBe('5001');
    });

    test('should use default port "9199" for storage when env var is not set', () => {
      delete process.env.REACT_APP_STORAGE_EMULATOR_PORT;
      const { emulatorPorts } = require('../firebaseConfig');
      expect(emulatorPorts.storage).toBe('9199');
    });
  });

  // ─── Development logging block ───────────────────────────────────────────

  describe('development logging block', () => {
    test('should not throw when NODE_ENV is development and useEmulators is false', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      process.env.NODE_ENV = 'development';
      delete process.env.REACT_APP_USE_EMULATORS;
      expect(() => require('../firebaseConfig')).not.toThrow();
      consoleSpy.mockRestore();
    });

    test('should log emulator details when NODE_ENV is development and useEmulators is true', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      process.env.NODE_ENV = 'development';
      process.env.REACT_APP_USE_EMULATORS = 'true';
      require('../firebaseConfig');
      // The log was called at least once for the Firebase Configuration header
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ─── Re-exported time constants ───────────────────────────────────────────

  describe('re-exported time constants', () => {
    test('should re-export SESSION_DURATION as a positive number', () => {
      const { SESSION_DURATION } = require('../firebaseConfig');
      expect(typeof SESSION_DURATION).toBe('number');
      expect(SESSION_DURATION).toBeGreaterThan(0);
    });

    test('should re-export REMEMBER_ME_DURATION greater than SESSION_DURATION', () => {
      const { SESSION_DURATION, REMEMBER_ME_DURATION } = require('../firebaseConfig');
      expect(REMEMBER_ME_DURATION).toBeGreaterThan(SESSION_DURATION);
    });

    test('should re-export INACTIVITY_TIMEOUT as a positive number', () => {
      const { INACTIVITY_TIMEOUT } = require('../firebaseConfig');
      expect(typeof INACTIVITY_TIMEOUT).toBe('number');
      expect(INACTIVITY_TIMEOUT).toBeGreaterThan(0);
    });
  });
});
