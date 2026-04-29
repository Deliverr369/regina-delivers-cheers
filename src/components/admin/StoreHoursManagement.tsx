import { useEffect, useState, useCallback } from "react";
import { Clock, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WEEKDAY_LABELS, WEEKDAY_LONG, type StoreHourRow } from "@/lib/storeHours";

interface Store {
  id: string;
  name: string;
  address: string;
}

type EditableRow = { is_closed: boolean; open_time: string; close_time: string };
// Map<storeId, weekday(0-6) → row>
type HoursState = Record<string, Record<number, EditableRow>>;

const toHHMM = (t: string) => (t?.length >= 5 ? t.slice(0, 5) : t || "10:00");

const StoreHoursManagement = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [hours, setHours] = useState<HoursState>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [{ data: storeRows, error: storeErr }, { data: hourRows, error: hourErr }] =
      await Promise.all([
        supabase.from("stores").select("id, name, address").order("name"),
        supabase.from("store_hours").select("store_id, weekday, is_closed, open_time, close_time"),
      ]);
    if (storeErr || hourErr) {
      toast({ title: "Error", description: "Failed to load store hours", variant: "destructive" });
      setLoading(false);
      return;
    }
    setStores(storeRows || []);
    const next: HoursState = {};
    for (const s of storeRows || []) {
      next[s.id] = {};
      for (let w = 0; w < 7; w++) {
        next[s.id][w] = { is_closed: false, open_time: "10:00", close_time: "22:00" };
      }
    }
    for (const r of (hourRows || []) as StoreHourRow[]) {
      if (!next[r.store_id]) next[r.store_id] = {};
      next[r.store_id][r.weekday] = {
        is_closed: r.is_closed,
        open_time: toHHMM(r.open_time),
        close_time: toHHMM(r.close_time),
      };
    }
    setHours(next);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const updateRow = (storeId: string, weekday: number, patch: Partial<EditableRow>) => {
    setHours((prev) => ({
      ...prev,
      [storeId]: { ...prev[storeId], [weekday]: { ...prev[storeId][weekday], ...patch } },
    }));
  };

  const saveStore = async (storeId: string) => {
    setSavingId(storeId);
    const dayRows = hours[storeId];
    const payload = Object.entries(dayRows).map(([w, row]) => ({
      store_id: storeId,
      weekday: Number(w),
      is_closed: row.is_closed,
      open_time: row.open_time,
      close_time: row.close_time,
    }));

    // Validate
    for (const r of payload) {
      if (!r.is_closed && r.open_time >= r.close_time) {
        toast({
          title: "Invalid hours",
          description: `${WEEKDAY_LONG[r.weekday]}: closing time must be after opening time`,
          variant: "destructive",
        });
        setSavingId(null);
        return;
      }
    }

    const { error } = await supabase
      .from("store_hours")
      .upsert(payload, { onConflict: "store_id,weekday" });

    if (error) {
      toast({ title: "Error", description: "Failed to save hours", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Store hours updated" });
    }
    setSavingId(null);
  };

  const copyMondayToWeekdays = (storeId: string) => {
    const monday = hours[storeId]?.[1];
    if (!monday) return;
    setHours((prev) => {
      const next = { ...prev[storeId] };
      for (const w of [2, 3, 4, 5]) next[w] = { ...monday };
      return { ...prev, [storeId]: next };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading store hours…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stores.length === 0 && (
        <p className="text-center py-8 text-muted-foreground">No stores found.</p>
      )}

      {stores.map((store) => (
        <Card key={store.id}>
          <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
            <div className="min-w-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                {store.name}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1 truncate">{store.address}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button size="sm" variant="ghost" onClick={() => copyMondayToWeekdays(store.id)}>
                Copy Mon → Tue–Fri
              </Button>
              <Button size="sm" onClick={() => saveStore(store.id)} disabled={savingId === store.id}>
                <Save className="h-4 w-4 mr-1.5" />
                {savingId === store.id ? "Saving…" : "Save"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {WEEKDAY_LABELS.map((label, w) => {
                const row = hours[store.id]?.[w];
                if (!row) return null;
                return (
                  <div
                    key={w}
                    className="grid grid-cols-[80px_120px_1fr_auto_1fr] gap-3 items-center py-2 border-b last:border-0"
                  >
                    <span className="text-sm font-medium text-foreground">{label}</span>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!row.is_closed}
                        onCheckedChange={(open) => updateRow(store.id, w, { is_closed: !open })}
                      />
                      <span className="text-xs text-muted-foreground">
                        {row.is_closed ? "Closed" : "Open"}
                      </span>
                    </div>
                    <Input
                      type="time"
                      value={row.open_time}
                      disabled={row.is_closed}
                      onChange={(e) => updateRow(store.id, w, { open_time: e.target.value })}
                      className="h-9"
                    />
                    <span className="text-xs text-muted-foreground">to</span>
                    <Input
                      type="time"
                      value={row.close_time}
                      disabled={row.is_closed}
                      onChange={(e) => updateRow(store.id, w, { close_time: e.target.value })}
                      className="h-9"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StoreHoursManagement;
