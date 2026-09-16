// Shared helpers for per-weekday store hours and delivery slot enforcement.
//
// `store_hours` rows: { store_id, weekday (0=Sun..6=Sat), is_closed, open_time "HH:MM:SS", close_time "HH:MM:SS" }

export interface StoreHourRow {
  store_id: string;
  weekday: number;
  is_closed: boolean;
  open_time: string;  // "HH:MM:SS" in local store time
  close_time: string; // "HH:MM:SS"
}

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const WEEKDAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

export const LEAD_TIME_MINUTES = 60; // 1-hour buffer before any slot

/** Parse "HH:MM" or "HH:MM:SS" → minutes since midnight. */
export const timeToMinutes = (t: string): number => {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

/** Parse "HH:MM-HH:MM" slot → start/end minutes. */
export const slotToMinutes = (slot: string): { start: number; end: number } => {
  const [s, e] = slot.split("-");
  return { start: timeToMinutes(s), end: timeToMinutes(e) };
};

/** Format "HH:MM" → "10:00 AM". */
export const formatTime12 = (t: string): string => {
  const [h] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:00 ${period}`;
};

/**
 * Everything below is evaluated in STORE time (America/Regina), never the
 * shopper's device timezone — a phone set to another zone must not change
 * whether a Regina store counts as open. Regina has no DST (fixed UTC-6),
 * so wall-clock ↔ instant conversion is a constant offset.
 */
export const STORE_TZ = "America/Regina";
const STORE_UTC_OFFSET_MIN = -6 * 60;

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const storeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: STORE_TZ,
  hour12: false,
  weekday: "short",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Current wall-clock parts in store time. */
export const storeNowParts = (now = new Date()) => {
  const parts = Object.fromEntries(
    storeFmt.formatToParts(now).map((p) => [p.type, p.value]),
  ) as Record<string, string>;
  const hour = Number(parts.hour) % 24; // en-US hour12:false can emit "24"
  return {
    weekday: WEEKDAY_INDEX[parts.weekday] ?? 0,
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    minutes: hour * 60 + Number(parts.minute),
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
  };
};

/** Weekday (0=Sun) for a YYYY-MM-DD string, timezone-independent. */
export const weekdayOfDateStr = (dateStr: string): number => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1)).getUTCDay();
};

/** Store-local date YYYY-MM-DD, `offsetDays` from today. */
export const storeDateStr = (offsetDays = 0, now = new Date()): string => {
  const p = storeNowParts(now);
  const d = new Date(Date.UTC(p.year, p.month - 1, p.day + offsetDays));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};

/** Kept for compatibility: store-local date string for a given instant. */
export const toLocalDateStr = (d: Date): string => storeNowParts(d).dateStr;

/** The real instant of a store wall-clock YYYY-MM-DD + HH:MM. */
export const localDateTime = (dateStr: string, time: string): Date => {
  const [hh, mm] = time.split(":").map(Number);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(
    Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0) - STORE_UTC_OFFSET_MIN * 60_000,
  );
};

/** Hours rows grouped by store id. */
export type HoursByStore = Record<string, StoreHourRow[]>;

export const groupHoursByStore = (rows: StoreHourRow[]): HoursByStore => {
  const out: HoursByStore = {};
  for (const r of rows) {
    (out[r.store_id] ||= []).push(r);
  }
  return out;
};

/** Get the hours row for a specific store on a specific weekday. */
export const getDayHours = (
  storeId: string,
  weekday: number,
  byStore: HoursByStore,
): StoreHourRow | null => {
  const list = byStore[storeId];
  if (!list) return null;
  return list.find((r) => r.weekday === weekday) ?? null;
};

/** Is a store open RIGHT NOW in store time (used for ASAP gating)? */
export const isStoreOpenNow = (storeId: string, byStore: HoursByStore, now = new Date()): boolean => {
  const p = storeNowParts(now);
  const day = getDayHours(storeId, p.weekday, byStore);
  if (!day || day.is_closed) return false;
  return p.minutes >= timeToMinutes(day.open_time) && p.minutes < timeToMinutes(day.close_time);
};

/**
 * Is a 1-hour slot ("HH:MM-HH:MM") on `dateStr` selectable for ALL given stores,
 * given current time + lead time + each store's weekday hours?
 */
export const isSlotAvailable = (
  dateStr: string,
  slot: string,
  storeIds: string[],
  byStore: HoursByStore,
  now = new Date(),
): boolean => {
  if (!dateStr || !slot) return false;
  const slotStart = localDateTime(dateStr, slot.split("-")[0]);
  // Lead time gate
  if (slotStart.getTime() - now.getTime() < LEAD_TIME_MINUTES * 60 * 1000) return false;

  const { start, end } = slotToMinutes(slot);
  const weekday = weekdayOfDateStr(dateStr);

  // Slot must fit within EVERY store's open window for that weekday
  for (const id of storeIds) {
    const day = getDayHours(id, weekday, byStore);
    if (!day || day.is_closed) return false;
    const open = timeToMinutes(day.open_time);
    const close = timeToMinutes(day.close_time);
    if (start < open || end > close) return false;
  }
  return true;
};

/** Human-readable hours summary for a store on a given weekday. */
export const formatDayHours = (row: StoreHourRow | null): string => {
  if (!row || row.is_closed) return "Closed";
  return `${formatTime12(row.open_time)} – ${formatTime12(row.close_time)}`;
};
