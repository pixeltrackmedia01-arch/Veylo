"use client";

import { useEffect } from "react";
import { MAX_COMPARE, useCompareList } from "./compare-store";

/** Keeps the compare tray in step with the cars shown on this page. */
export function CompareSync({ slugs }: { slugs: string[] }) {
  const list = useCompareList();
  useEffect(() => {
    if (slugs.join(",") !== list.join(",")) {
      try {
        window.localStorage.setItem("gd-compare", JSON.stringify(slugs.slice(0, MAX_COMPARE)));
        window.dispatchEvent(new Event("gd-compare-change"));
      } catch {
        // Storage unavailable; the URL still drives the page.
      }
    }
    // Only sync when the page's cars change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugs.join(",")]);
  return null;
}
