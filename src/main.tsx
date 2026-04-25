import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

createRoot(document.getElementById("root")!).render(<App />);

// Hide native splash once the React app has mounted (Capacitor only)
if (Capacitor.isNativePlatform()) {
  // Small delay so first paint completes before fade-out
  setTimeout(() => {
    SplashScreen.hide({ fadeOutDuration: 300 }).catch(() => {});
  }, 400);
}
