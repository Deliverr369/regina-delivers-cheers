import { usePushNotifications } from "@/hooks/usePushNotifications";

/** Headless component that registers the device for native push on mount. */
export default function PushNotificationsMount() {
  usePushNotifications();
  return null;
}
