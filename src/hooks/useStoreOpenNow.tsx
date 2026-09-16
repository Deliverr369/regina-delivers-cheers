import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  groupHoursByStore,
  isStoreOpenNow,
  type HoursByStore,
  type StoreHourRow,
} from "@/lib/storeHours";

/**
 * Single source of truth for the "Open / Closed" badges shown to customers.
 *
 * A store counts as open only when BOTH are true:
 *   - the admin master switch (`stores.is_open`) is on, and
 *   - today's `store_hours` window (Regina time) covers right now.
 *
 * This is the same rule checkout enforces, so a store can never look "Open"
 * on a listing and then reject the order at payment time.
 */
export const useStoreOpenNow = () => {
  const { data: hours } = useQuery<HoursByStore>({
    queryKey: ["store-hours-all"],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_hours")
        .select("store_id, weekday, is_closed, open_time, close_time");
      if (error) throw error;
      return groupHoursByStore((data || []) as StoreHourRow[]);
    },
  });

  /** `flag` is the store's `is_open` column. */
  const isOpen = (storeId: string, flag: boolean | null | undefined): boolean => {
    if (flag === false) return false;
    if (!hours || !hours[storeId]) return flag !== false; // no hours set → trust the switch
    return isStoreOpenNow(storeId, hours);
  };

  return { isOpen, hoursLoaded: !!hours };
};
