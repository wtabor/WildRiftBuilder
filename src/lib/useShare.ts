"use client";

import { useCallback, useState } from "react";

/**
 * Copy the current page URL (which encodes the full build) to the clipboard.
 * Returns a transient `copied` flag for "Copied!" affordances. Shared by all
 * three designs so the share interaction behaves identically everywhere.
 */
export function useShare() {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback for non-secure contexts / older browsers.
      const el = document.createElement("textarea");
      el.value = url;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      try {
        document.execCommand("copy");
      } catch {
        /* give up silently */
      }
      document.body.removeChild(el);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, []);

  return { copied, copy };
}
