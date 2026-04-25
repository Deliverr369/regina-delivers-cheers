import { useEffect, useState } from "react";

/**
 * Returns true when the app is running inside the Capacitor native shell
 * (iOS or Android). Returns false in any browser context, including the
 * Lovable preview and the published website.
 *
 * Use this to gate iOS/native-only UI refinements so the website is never
 * affected.
 */
export function useIsNative(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!cancelled) setIsNative(Capacitor.isNativePlatform());
      } catch {
        if (!cancelled) setIsNative(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return isNative;
}
