"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mql.matches);
    try {
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    } catch {
      // Safari support (legacy methods)
      type LegacyMql = MediaQueryList & {
        addListener: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
        removeListener: (listener: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => void;
      };
      const legacy = mql as LegacyMql;
      legacy.addListener(onChange);
      return () => legacy.removeListener(onChange);
    }
  }, [query]);

  return matches;
}

export function useIsDesktop(): boolean {
  // Tailwind md breakpoint (min-width: 768px)
  return useMediaQuery("(min-width: 768px)");
}
