import "server-only";

/**
 * Process-wide cache for public catalogue data (vehicles, prices, FAQs, CMS
 * settings), which is the same for every visitor. Each page used to refetch the
 * whole catalogue from Supabase on every request; now it is served from memory
 * and refreshed in the background once stale (stale-while-revalidate). Any
 * Server Action that changes data clears it through revalidatePath in
 * "@/lib/revalidate", so admin edits show up on the next request.
 */
type Entry = { value?: unknown; at: number; pending?: Promise<unknown> };

const store = new Map<string, Entry>();

export function clearPublicCache() {
  store.clear();
}

export async function cachedPublic<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const entry = store.get(key);
  const refresh = () => {
    const current = store.get(key) ?? { at: 0 };
    if (current.pending) return current.pending as Promise<T>;
    const pending = load()
      .then((value) => {
        store.set(key, { value, at: Date.now() });
        return value;
      })
      .catch((error) => {
        const stale = store.get(key);
        if (stale && "value" in stale && stale.value !== undefined) {
          store.set(key, { value: stale.value, at: stale.at });
          console.error(`public cache refresh failed for ${key}`, error);
          return stale.value as T;
        }
        store.delete(key);
        throw error;
      });
    store.set(key, { ...current, pending });
    return pending;
  };

  if (entry && entry.value !== undefined) {
    if (Date.now() - entry.at > ttlMs) void refresh().catch(() => {});
    return entry.value as T;
  }
  return refresh();
}
