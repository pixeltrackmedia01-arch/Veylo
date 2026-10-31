import "server-only";

import { mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Cache for public catalogue data (vehicles, prices, FAQs, CMS settings), which
 * is the same for every visitor. Loading the catalogue from Supabase takes
 * seconds (~3 MB), so results are kept in memory and mirrored to a temp file
 * that every server process on the host shares, and refreshed in the background
 * once stale (stale-while-revalidate). Any Server Action that changes data
 * clears both layers through revalidatePath in "@/lib/revalidate".
 */
type Entry = { value?: unknown; at: number; pending?: Promise<unknown> };

const store = new Map<string, Entry>();
const dir = join(tmpdir(), "groupdrive-public-cache");
// A file older than this is ignored even as a stale fallback.
const MAX_FILE_AGE_MS = 24 * 60 * 60 * 1000;

// Without a writable temp dir the cache is memory-only (no cross-process sync).
let fileCacheWorks = true;

const fileFor = (key: string) => join(dir, `${encodeURIComponent(key)}.json`);

function readFile(key: string): Entry | null {
  try {
    const path = fileFor(key);
    const at = statSync(path).mtimeMs;
    if (Date.now() - at > MAX_FILE_AGE_MS) return null;
    return { value: JSON.parse(readFileSync(path, "utf8")), at };
  } catch {
    return null;
  }
}

function writeFile(key: string, value: unknown) {
  try {
    mkdirSync(dir, { recursive: true });
    const tmp = `${fileFor(key)}.${process.pid}.tmp`;
    writeFileSync(tmp, JSON.stringify(value));
    renameSync(tmp, fileFor(key));
  } catch (error) {
    fileCacheWorks = false;
    console.error("public cache write failed", error);
  }
}

export function clearPublicCache() {
  store.clear();
  try {
    for (const name of readdirSync(dir)) rmSync(join(dir, name), { force: true });
  } catch {
    // No cache directory yet.
  }
}

export async function cachedPublic<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  let entry = store.get(key);
  // Another process may have refreshed the file (take it) or cleared it after an
  // edit (then this process's copy is treated as stale).
  let fileAt: number | null = null;
  try {
    fileAt = statSync(fileFor(key)).mtimeMs;
  } catch {
    fileAt = null;
  }
  if (!entry || entry.value === undefined || (fileAt !== null && fileAt > entry.at)) {
    const fromFile = readFile(key);
    if (fromFile) store.set(key, (entry = { ...fromFile, pending: entry?.pending }));
  }
  const cleared = fileCacheWorks && entry !== undefined && entry.value !== undefined && fileAt === null;

  const refresh = () => {
    const current = store.get(key) ?? { at: 0 };
    if (current.pending) return current.pending as Promise<T>;
    const pending = load()
      .then((value) => {
        store.set(key, { value, at: Date.now() });
        writeFile(key, value);
        return value;
      })
      .catch((error) => {
        const stale = store.get(key);
        if (stale && stale.value !== undefined) {
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
    if (cleared || Date.now() - entry.at > ttlMs) void refresh().catch(() => {});
    return entry.value as T;
  }
  return refresh();
}
