const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** Objects fill in missing keys from the default; lists, numbers, booleans and text replace it. */
export function mergeSetting(fallback: unknown, value: unknown) {
  return isPlainObject(fallback) && isPlainObject(value) ? { ...fallback, ...value } : value;
}
