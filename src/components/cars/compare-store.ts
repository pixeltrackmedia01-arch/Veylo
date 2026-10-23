"use client";

import { useSyncExternalStore } from "react";

/** Cars picked for comparison, kept in this browser only (max 3). */
const KEY = "gd-compare";
const EVENT = "gd-compare-change";
export const MAX_COMPARE = 3;

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

let cache: string[] = [];
let cacheRaw = "";

function snapshot() {
  const list = read();
  const raw = list.join(",");
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cache = list;
  }
  return cache;
}

function write(list: string[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_COMPARE)));
  } catch {
    // Storage unavailable (private mode); comparison still works via the URL.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const EMPTY: string[] = [];

export function useCompareList() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}

/** Returns false when the list is already full. */
export function toggleCompare(slug: string) {
  const list = read();
  if (list.includes(slug)) {
    write(list.filter((s) => s !== slug));
    return true;
  }
  if (list.length >= MAX_COMPARE) return false;
  write([...list, slug]);
  return true;
}

export function clearCompare() {
  write([]);
}
