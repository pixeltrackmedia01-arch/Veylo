import "server-only";

import { revalidatePath as nextRevalidatePath } from "next/cache";
import { clearPublicCache } from "@/lib/data/public-cache";

/** next/cache revalidatePath that also drops the in-memory public data cache. */
export function revalidatePath(...args: Parameters<typeof nextRevalidatePath>) {
  clearPublicCache();
  return nextRevalidatePath(...args);
}
