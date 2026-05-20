type Factory<T> = () => T;

export class Container {
  private readonly factories = new Map<string, Factory<unknown>>();
  private readonly singletons = new Map<string, unknown>();

  register<T>(key: string, factory: Factory<T>): void {
    if (this.factories.has(key)) {
      throw new Error(`Container key "${key}" already registered`);
    }
    this.factories.set(key, factory);
  }

  resolve<T>(key: string): T {
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Container key "${key}" not registered`);
    const instance = factory();
    this.singletons.set(key, instance);
    return instance as T;
  }
}
