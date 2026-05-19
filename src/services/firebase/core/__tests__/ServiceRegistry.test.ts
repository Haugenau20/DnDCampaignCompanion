// src/services/firebase/core/__tests__/ServiceRegistry.test.ts

/**
 * Tests for ServiceRegistry
 *
 * ServiceRegistry is a singleton, so we use jest.resetModules() in beforeEach
 * to get a fresh instance between tests.  The (private) static field is reset
 * automatically when the module is re-required after resetModules().
 */

describe('ServiceRegistry', () => {
  let ServiceRegistry: typeof import('../ServiceRegistry').default;

  beforeEach(() => {
    jest.resetModules();
    ServiceRegistry = require('../ServiceRegistry').default;
  });

  // ─── getInstance ──────────────────────────────────────────────────────────

  describe('getInstance', () => {
    test('should return a ServiceRegistry instance', () => {
      const registry = ServiceRegistry.getInstance();
      expect(registry).toBeDefined();
    });

    test('should always return the same instance (singleton)', () => {
      const a = ServiceRegistry.getInstance();
      const b = ServiceRegistry.getInstance();
      expect(a).toBe(b);
    });
  });

  // ─── register / has / get ─────────────────────────────────────────────────

  describe('register', () => {
    test('should store a service that can subsequently be retrieved with get()', () => {
      const registry = ServiceRegistry.getInstance();
      const fakeService = { name: 'fakeService' };
      registry.register('fake', fakeService);
      expect(registry.get('fake')).toBe(fakeService);
    });

    test('should overwrite a previously registered service with the same name', () => {
      const registry = ServiceRegistry.getInstance();
      const first = { version: 1 };
      const second = { version: 2 };
      registry.register('svc', first);
      registry.register('svc', second);
      expect(registry.get<{ version: number }>('svc').version).toBe(2);
    });

    test('should support registering services of different types', () => {
      const registry = ServiceRegistry.getInstance();
      registry.register('num', 42);
      registry.register('str', 'hello');
      registry.register('obj', { a: 1 });
      expect(registry.get<number>('num')).toBe(42);
      expect(registry.get<string>('str')).toBe('hello');
      expect(registry.get<{ a: number }>('obj')).toEqual({ a: 1 });
    });
  });

  describe('has', () => {
    test('should return false for a service that has not been registered', () => {
      const registry = ServiceRegistry.getInstance();
      expect(registry.has('nonexistent')).toBe(false);
    });

    test('should return true after a service is registered', () => {
      const registry = ServiceRegistry.getInstance();
      registry.register('present', {});
      expect(registry.has('present')).toBe(true);
    });
  });

  describe('get', () => {
    test('should throw an error when getting an unregistered service', () => {
      const registry = ServiceRegistry.getInstance();
      expect(() => registry.get('missing')).toThrow("Service 'missing' not found in registry");
    });

    test('should return the registered value exactly as provided', () => {
      const registry = ServiceRegistry.getInstance();
      const payload = { complex: true, nested: { value: 99 } };
      registry.register('payload', payload);
      expect(registry.get('payload')).toBe(payload); // reference equality
    });
  });

  // ─── isolation across instances ───────────────────────────────────────────

  describe('singleton isolation', () => {
    test('registrations from one getInstance() call are visible via another call', () => {
      const r1 = ServiceRegistry.getInstance();
      r1.register('shared', 'value');

      const r2 = ServiceRegistry.getInstance();
      expect(r2.get<string>('shared')).toBe('value');
    });
  });
});
