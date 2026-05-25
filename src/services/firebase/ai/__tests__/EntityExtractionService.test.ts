// src/services/firebase/ai/__tests__/EntityExtractionService.test.ts

/**
 * Tests for EntityExtractionService
 *
 * Firebase Functions are mocked.  We verify:
 * - UsageLimitExceededError constructor/properties
 * - getInstance singleton
 * - getCurrentUsage / clearUsageCache
 * - extractEntities: success path, unauthenticated, usage-limit error, other errors
 * - fetchUsageStatus: success, unauthenticated, usage-limit error, other errors
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockHttpsCallable = jest.fn();

jest.mock('firebase/functions', () => ({
  getFunctions: jest.fn(() => ({})),
  connectFunctionsEmulator: jest.fn(),
  httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
}));

jest.mock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({ currentUser: { uid: 'user-ai' } })),
  connectAuthEmulator: jest.fn(),
}));
jest.mock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(() => ({})),
  connectFirestoreEmulator: jest.fn(),
}));

jest.mock('../../config/firebaseConfig', () => ({
  firebaseConfig: { apiKey: 'test', projectId: 'test' },
  useEmulators: false,
  emulatorHost: 'localhost',
  emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
}));

jest.mock('../../core/ServiceRegistry', () => {
  const registry = new Map<string, any>();
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => ({
        get: (name: string) => {
          if (!registry.has(name)) throw new Error(`Service '${name}' not found`);
          return registry.get(name);
        },
        register: (name: string, svc: any) => registry.set(name, svc),
        has: (name: string) => registry.has(name),
      })),
    },
  };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUsageStatus() {
  return {
    usage: {
      daily: { count: 5, lastReset: new Date().toISOString(), limit: 10 },
      weekly: { count: 10, lastReset: new Date().toISOString(), limit: 30 },
      monthly: { count: 20, lastReset: new Date().toISOString(), limit: 100 },
    },
    limitExceeded: false,
    nextReset: {
      daily: new Date().toISOString(),
      weekly: new Date().toISOString(),
      monthly: new Date().toISOString(),
    },
  };
}

function makeOpenAIEntity(type: 'npc' | 'location' | 'quest' | 'rumor' = 'npc') {
  return {
    text: 'Test entity',
    type,
    confidence: 0.9,
    details: {
      name: 'Test',
      relationship: 'friendly',
      context: 'test context',
    },
  };
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('EntityExtractionService', () => {
  let EntityExtractionService: typeof import('../EntityExtractionService').default;
  let UsageLimitExceededError: typeof import('../EntityExtractionService').UsageLimitExceededError;

  const authWithUser = { currentUser: { uid: 'user-ai' } };
  const authWithoutUser = { currentUser: null };

  beforeEach(() => {
    jest.resetModules();
    mockHttpsCallable.mockReset();

    const registry = new Map<string, any>();
    jest.doMock('../../core/ServiceRegistry', () => ({
      __esModule: true,
      default: {
        getInstance: jest.fn(() => ({
          get: (name: string) => {
            if (!registry.has(name)) throw new Error(`Service '${name}' not found`);
            return registry.get(name);
          },
          register: (name: string, svc: any) => registry.set(name, svc),
          has: (name: string) => registry.has(name),
        })),
      },
    }));
    jest.doMock('firebase/functions', () => ({
      getFunctions: jest.fn(() => ({})),
      connectFunctionsEmulator: jest.fn(),
      httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
    }));
    jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
    jest.doMock('firebase/auth', () => ({
      getAuth: jest.fn(() => authWithUser),
      connectAuthEmulator: jest.fn(),
    }));
    jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
    jest.doMock('firebase/firestore', () => ({
      getFirestore: jest.fn(() => ({})),
      connectFirestoreEmulator: jest.fn(),
    }));
    jest.doMock('../../config/firebaseConfig', () => ({
      firebaseConfig: { apiKey: 'test', projectId: 'test' },
      useEmulators: false,
      emulatorHost: 'localhost',
      emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
    }));

    const m = require('../EntityExtractionService');
    EntityExtractionService = m.default;
    UsageLimitExceededError = m.UsageLimitExceededError;
  });

  // ─── UsageLimitExceededError ────────────────────────────────────────────────

  describe('UsageLimitExceededError', () => {
    test('should be an instance of Error', () => {
      const err = new UsageLimitExceededError({
        error: 'limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: makeUsageStatus(),
        contactInfo: {
          message: 'Contact us',
          contactUrl: '/contact',
          prefilledSubject: 'Limit Request',
        },
      });
      expect(err).toBeInstanceOf(Error);
    });

    test('should set the name to UsageLimitExceededError', () => {
      const err = new UsageLimitExceededError({
        error: 'limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: makeUsageStatus(),
        contactInfo: { message: '', contactUrl: '', prefilledSubject: '' },
      });
      expect(err.name).toBe('UsageLimitExceededError');
    });

    test('should expose usage property', () => {
      const usage = makeUsageStatus();
      const err = new UsageLimitExceededError({
        error: 'limit exceeded',
        code: 'USAGE_LIMIT_EXCEEDED',
        usage,
        contactInfo: { message: '', contactUrl: '', prefilledSubject: '' },
      });
      expect(err.usage).toBe(usage);
    });

    test('should expose contactInfo property', () => {
      const contactInfo = {
        message: 'Please contact support',
        contactUrl: '/contact',
        prefilledSubject: 'Limit Request',
      };
      const err = new UsageLimitExceededError({
        error: 'limit',
        code: 'USAGE_LIMIT_EXCEEDED',
        usage: makeUsageStatus(),
        contactInfo,
      });
      expect(err.contactInfo).toEqual(contactInfo);
    });
  });

  // ─── getInstance ────────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return an EntityExtractionService instance', () => {
      expect(EntityExtractionService.getInstance()).toBeDefined();
    });

    test('should be a singleton', () => {
      expect(EntityExtractionService.getInstance()).toBe(EntityExtractionService.getInstance());
    });
  });

  // ─── getCurrentUsage / clearUsageCache ──────────────────────────────────────

  describe('getCurrentUsage', () => {
    test('should return null initially', () => {
      const svc = EntityExtractionService.getInstance();
      expect(svc.getCurrentUsage()).toBeNull();
    });
  });

  describe('clearUsageCache', () => {
    test('should set current usage to null', async () => {
      // Populate usage via fetchUsageStatus
      const usage = makeUsageStatus();
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: true, usage },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await svc.fetchUsageStatus();
      expect(svc.getCurrentUsage()).not.toBeNull();

      svc.clearUsageCache();
      expect(svc.getCurrentUsage()).toBeNull();
    });
  });

  // ─── extractEntities ────────────────────────────────────────────────────────

  describe('extractEntities', () => {
    test('should throw "User not authenticated" when no current user', async () => {
      jest.resetModules();
      const reg = new Map<string, any>();
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: {
          getInstance: jest.fn(() => ({
            get: (n: string) => { if (!reg.has(n)) throw new Error(`Service '${n}' not found`); return reg.get(n); },
            register: (n: string, s: any) => reg.set(n, s),
            has: (n: string) => reg.has(n),
          })),
        },
      }));
      jest.doMock('firebase/auth', () => ({
        getAuth: jest.fn(() => authWithoutUser),
        connectAuthEmulator: jest.fn(),
      }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
        httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/firestore', () => ({
        getFirestore: jest.fn(() => ({})),
        connectFirestoreEmulator: jest.fn(),
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const EES = require('../EntityExtractionService').default;
      await expect(EES.getInstance().extractEntities('Some content')).rejects.toThrow(
        'User not authenticated'
      );
    });

    test('should return mapped ExtractedEntity array on success', async () => {
      const entities = [makeOpenAIEntity('npc'), makeOpenAIEntity('location')];
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: true, entities, usage: makeUsageStatus() },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      const result = await svc.extractEntities('Some note content');
      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('npc');
      expect(result[1].type).toBe('location');
    });

    test('should store usage after successful extraction', async () => {
      const usage = makeUsageStatus();
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: true, entities: [makeOpenAIEntity()], usage },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await svc.extractEntities('Content');
      expect(svc.getCurrentUsage()).toBe(usage);
    });

    test('should throw "No entities returned" when success=false or entities missing', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: false },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await expect(svc.extractEntities('Content')).rejects.toThrow('No entities returned');
    });

    test('should throw UsageLimitExceededError on resource-exhausted Firebase error', async () => {
      const usage = makeUsageStatus();
      const firebaseError = {
        code: 'functions/resource-exhausted',
        message: 'USAGE_LIMIT_EXCEEDED: limit hit',
        details: {
          usage,
          contactInfo: {
            message: 'Contact us',
            contactUrl: '/contact',
            prefilledSubject: 'Limit',
          },
        },
      };
      const mockFn = jest.fn().mockRejectedValueOnce(firebaseError);
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await expect(svc.extractEntities('Content')).rejects.toThrow(UsageLimitExceededError);
    });

    test('should throw generic Error for other Firebase function errors', async () => {
      const firebaseError = {
        code: 'functions/internal',
        message: 'Internal server error',
        details: null,
      };
      const mockFn = jest.fn().mockRejectedValueOnce(firebaseError);
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await expect(svc.extractEntities('Content')).rejects.toThrow('Internal server error');
    });

    test('should re-throw non-Firebase errors as-is', async () => {
      const mockFn = jest.fn().mockRejectedValueOnce(new Error('network failure'));
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await expect(svc.extractEntities('Content')).rejects.toThrow('network failure');
    });

    test('should use default model gpt-3.5-turbo when none provided', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: true, entities: [makeOpenAIEntity()] },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await svc.extractEntities('Content');
      expect(mockFn).toHaveBeenCalledWith({ content: 'Content', model: 'gpt-3.5-turbo' });
    });

    test('should use the provided model when specified', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: true, entities: [makeOpenAIEntity()] },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      await svc.extractEntities('Content', 'gpt-4');
      expect(mockFn).toHaveBeenCalledWith({ content: 'Content', model: 'gpt-4' });
    });
  });

  // ─── fetchUsageStatus ───────────────────────────────────────────────────────

  describe('fetchUsageStatus', () => {
    test('should return null when no user is authenticated', async () => {
      jest.resetModules();
      const reg = new Map<string, any>();
      jest.doMock('../../core/ServiceRegistry', () => ({
        __esModule: true,
        default: {
          getInstance: jest.fn(() => ({
            get: (n: string) => { if (!reg.has(n)) throw new Error(`Service '${n}' not found`); return reg.get(n); },
            register: (n: string, s: any) => reg.set(n, s),
            has: (n: string) => reg.has(n),
          })),
        },
      }));
      jest.doMock('firebase/auth', () => ({
        getAuth: jest.fn(() => authWithoutUser),
        connectAuthEmulator: jest.fn(),
      }));
      jest.doMock('firebase/functions', () => ({
        getFunctions: jest.fn(() => ({})),
        connectFunctionsEmulator: jest.fn(),
        httpsCallable: function() { return (mockHttpsCallable as Function).apply(null, arguments); },
      }));
      jest.doMock('firebase/app', () => ({ initializeApp: jest.fn(() => ({})) }));
      jest.doMock('firebase/analytics', () => ({ getAnalytics: jest.fn(() => ({})) }));
      jest.doMock('firebase/firestore', () => ({
        getFirestore: jest.fn(() => ({})),
        connectFirestoreEmulator: jest.fn(),
      }));
      jest.doMock('../../config/firebaseConfig', () => ({
        firebaseConfig: { apiKey: 'test', projectId: 'test' },
        useEmulators: false, emulatorHost: 'localhost',
        emulatorPorts: { auth: '9099', firestore: '8080', functions: '5001' },
      }));
      const EES = require('../EntityExtractionService').default;
      const result = await EES.getInstance().fetchUsageStatus();
      expect(result).toBeNull();
    });

    test('should return usage on success', async () => {
      const usage = makeUsageStatus();
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: true, usage },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      const result = await svc.fetchUsageStatus();
      expect(result).toBe(usage);
    });

    test('should return null when success=false or no usage in response', async () => {
      const mockFn = jest.fn().mockResolvedValueOnce({
        data: { success: false },
      });
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      const result = await svc.fetchUsageStatus();
      expect(result).toBeNull();
    });

    test('should extract usage from resource-exhausted error details', async () => {
      const usage = makeUsageStatus();
      const firebaseError = {
        code: 'functions/resource-exhausted',
        message: 'limit exceeded',
        details: { usage },
      };
      const mockFn = jest.fn().mockRejectedValueOnce(firebaseError);
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      const result = await svc.fetchUsageStatus();
      expect(result).toBe(usage);
    });

    test('should return null and not throw on unknown errors', async () => {
      const mockFn = jest.fn().mockRejectedValueOnce(new Error('network error'));
      mockHttpsCallable.mockReturnValueOnce(mockFn);

      const svc = EntityExtractionService.getInstance();
      const result = await svc.fetchUsageStatus();
      expect(result).toBeNull();
    });
  });
});
