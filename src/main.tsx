import { createRoot } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App.tsx";
import "./index.css";

type CapacitorWithEvents = typeof Capacitor & {
  createEvent?: (eventName: string, eventData?: Record<string, unknown>) => Event | null;
  triggerEvent?: (eventName: string, target: string, eventData?: Record<string, unknown>) => boolean;
};

const capacitor = Capacitor as CapacitorWithEvents;

capacitor.createEvent ??= (eventName, eventData = {}) => {
  const event = document.createEvent("Events") as Event & Record<string, unknown>;
  event.initEvent(eventName, false, false);
  Object.assign(event, eventData);
  return event;
};

capacitor.triggerEvent ??= (eventName, target, eventData = {}) => {
  const event = capacitor.createEvent?.(eventName, eventData);
  if (!event) return false;

  if (target === "document") return document.dispatchEvent(event);
  if (target === "window") return window.dispatchEvent(event);

  const targetElement = document.querySelector(target);
  return targetElement ? targetElement.dispatchEvent(event) : false;
};

createRoot(document.getElementById("root")!).render(<App />);
