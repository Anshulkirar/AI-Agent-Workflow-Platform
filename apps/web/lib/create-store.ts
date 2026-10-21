import { useSyncExternalStore } from "react";

type Options<T> = {
  /** localStorage key. */
  key: string;
  /** Data used during SSR and when nothing is stored yet. */
  seed: T[];
  /** Optional clean-up applied once when data is loaded from storage. */
  hydrate?: (items: T[]) => T[];
  /** Cap on persisted items (oldest dropped). */
  limit?: number;
};

/**
 * Frontend-only collection store: in-memory state persisted to localStorage,
 * shared by every component via useSyncExternalStore and synced across tabs.
 * Swap `read`/`write` for API calls once a backend exists.
 */
export function createCollectionStore<T extends { id: string }>({ key, seed, hydrate, limit }: Options<T>) {
  let cache: T[] | null = null;
  const listeners = new Set<() => void>();

  function read(): T[] {
    if (cache) return cache;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      const items = Array.isArray(parsed) ? (parsed as T[]) : seed;
      cache = hydrate ? hydrate(items) : items;
    } catch {
      cache = seed;
    }
    return cache;
  }

  function write(next: T[]) {
    cache = limit ? next.slice(0, limit) : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(cache));
    } catch {
      // Storage full or unavailable — keep the in-memory state.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  const getServerSnapshot = () => seed;

  function useAll() {
    return useSyncExternalStore(subscribe, read, getServerSnapshot);
  }

  function update(id: string, patch: Partial<T> | ((item: T) => Partial<T>)) {
    write(
      read().map((item) =>
        item.id === id ? { ...item, ...(typeof patch === "function" ? patch(item) : patch) } : item,
      ),
    );
  }

  /** Removes an item and returns what's needed to undo it. */
  function remove(id: string) {
    const list = read();
    const index = list.findIndex((item) => item.id === id);
    const item = list[index];
    if (!item) return null;
    write(list.filter((entry) => entry.id !== id));
    return { item, index };
  }

  function restore(item: T, index: number) {
    const list = [...read()];
    list.splice(Math.min(index, list.length), 0, item);
    write(list);
  }

  return { read, write, useAll, update, remove, restore };
}

/**
 * Single persisted object (preferences, workspace settings…) with the same
 * sync behavior as collections. Stored values are merged over the seed so new
 * fields get defaults after an upgrade.
 */
export function createValueStore<T extends object>({ key, seed }: { key: string; seed: T }) {
  let cache: T | null = null;
  const listeners = new Set<() => void>();

  function read(): T {
    if (cache) return cache;
    if (typeof window === "undefined") return seed;
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      cache = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? { ...seed, ...(parsed as Partial<T>) } : seed;
    } catch {
      cache = seed;
    }
    return cache;
  }

  function write(next: T) {
    cache = next;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage full or unavailable — keep the in-memory state.
    }
    listeners.forEach((listener) => listener());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        cache = null;
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  }

  function useValue() {
    return useSyncExternalStore(subscribe, read, () => seed);
  }

  function update(patch: Partial<T> | ((value: T) => Partial<T>)) {
    const current = read();
    write({ ...current, ...(typeof patch === "function" ? patch(current) : patch) });
  }

  return { read, write, update, useValue };
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 32) || "item"
  );
}

export function makeId(name: string) {
  return `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
}
