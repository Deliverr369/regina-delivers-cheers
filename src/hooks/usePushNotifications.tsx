import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Registers the device for native push notifications and persists the
 * token in `device_tokens` so the backend can deliver pushes via FCM/APNs.
 *
 * No-op on web — push is mobile-only here.
 */
export function usePushNotifications() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );

        const perm = await PushNotifications.checkPermissions();
        let receive = perm.receive;
        if (receive === "prompt" || receive === "prompt-with-rationale") {
          const req = await PushNotifications.requestPermissions();
          receive = req.receive;
        }
        if (receive !== "granted") {
          console.warn("Push permission not granted");
          return;
        }

        await PushNotifications.register();

        const regHandle = await PushNotifications.addListener(
          "registration",
          async (token) => {
            const platform = Capacitor.getPlatform() as
              | "ios"
              | "android"
              | "web";
            await supabase.from("device_tokens").upsert(
              {
                user_id: user.id,
                token: token.value,
                platform,
                last_seen_at: new Date().toISOString(),
              },
              { onConflict: "user_id,token" },
            );
          },
        );

        const errHandle = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.error("Push registration error", err);
          },
        );

        const recvHandle = await PushNotifications.addListener(
          "pushNotificationReceived",
          (n) => {
            console.log("Push received in foreground", n);
          },
        );

        const actHandle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const link = action.notification.data?.link;
            if (link && typeof link === "string") {
              window.location.href = link;
            }
          },
        );

        cleanup = () => {
          regHandle.remove();
          errHandle.remove();
          recvHandle.remove();
          actHandle.remove();
        };
      } catch (e) {
        console.error("Push setup failed", e);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [user]);
}
