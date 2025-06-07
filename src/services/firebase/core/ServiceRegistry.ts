// src/services/firebase/core/ServiceRegistry.ts

/**
 * ServiceRegistry provides a centralized registry for all Firebase services
 * allowing them to be easily accessed and dependencies to be resolved.
 */
class ServiceRegistry {
    private static instance: ServiceRegistry;
    private services: Map<string, any> = new Map();
  
    private constructor() {}
  
    /**
     * Get singleton instance of ServiceRegistry
     */
    public static getInstance(): ServiceRegistry {
      if (!ServiceRegistry.instance) {
        ServiceRegistry.instance = new ServiceRegistry();
      }
      return ServiceRegistry.instance;
    }
  
    /**
     * Register a service with the registry
     * @param name Service identifier
     * @param service Service instance
     */
    public register<T>(name: string, service: T): void {
      this.services.set(name, service);
    }
  
    /**
     * Get a service from the registry
     * @param name Service identifier
     * @returns The service instance
     */
    public get<T>(name: string): T {
      const service = this.services.get(name);
      if (!service) {
        throw new Error(`Service '${name}' not found in registry`);
      }
      return service as T;
    }
  
    /**
     * Check if a service exists in the registry
     * @param name Service identifier
     * @returns Whether the service exists
     */
    public has(name: string): boolean {
      return this.services.has(name);
    }
  }
  
  export default ServiceRegistry;