import { BaseAdapter } from './base';

const registry = new Map<string, BaseAdapter>();

export function registerAdapter(key: string, adapter: BaseAdapter): void {
  registry.set(key, adapter);
}

export function getAdapter(key: string): BaseAdapter | undefined {
  return registry.get(key);
}

export function getAllAdapters(): BaseAdapter[] {
  return Array.from(registry.values());
}
