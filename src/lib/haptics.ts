import { Capacitor } from "@capacitor/core";

/**
 * Cross-platform haptic feedback. No-op on web (and silently swallows
 * errors so missing plugins never crash the app).
 */
export const haptics = {
  async light() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      /* noop */
    }
  },
  async medium() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      /* noop */
    }
  },
  async success() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      /* noop */
    }
  },
  async warning() {
    if (!Capacitor.isNativePlatform()) return;
    try {
      const { Haptics, NotificationType } = await import("@capacitor/haptics");
      await Haptics.notification({ type: NotificationType.Warning });
    } catch {
      /* noop */
    }
  },
};
