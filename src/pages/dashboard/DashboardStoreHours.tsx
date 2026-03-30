import { useEffect, useState } from "react";
import { Clock, Save, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Store {
  id: string;
  name: string;
  address: string;
  hours: string | null;
  is_open: boolean | null;
}

const DashboardStoreHours = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedHours, setEditedHours] = useState<Record<string, string>>({});
  const [editedOpen, setEditedOpen] = useState<Record<string, boolean>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => { fetchStores(); }, []);

  const fetchStores = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stores").select("id, name, address, hours, is_open").order("name");
    if (error) {
      toast({ title: "Error", description: "Failed to fetch stores", variant: "destructive" });
    } else {
      setStores(data || []);
      const hoursMap: Record<string, string> = {};
      const openMap: Record<string, boolean> = {};
      (data || []).forEach((s) => {
        hoursMap[s.id] = s.hours || "";
        openMap[s.id] = s.is_open ?? true;
      });
      setEditedHours(hoursMap);
      setEditedOpen(openMap);
    }
    setLoading(false);
  };

  const handleSave = async (storeId: string) => {
    setSavingId(storeId);
    const { error } = await supabase
      .from("stores")
      .update({ hours: editedHours[storeId] || null, is_open: editedOpen[storeId] })
      .eq("id", storeId);

    if (error) toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    else { toast({ title: "Success", description: "Store hours updated" }); fetchStores(); }
    setSavingId(null);
  };

  const handleSaveAll = async () => {
    setSavingId("all");
    let hasError = false;
    for (const store of stores) {
      const { error } = await supabase
        .from("stores")
        .update({ hours: editedHours[store.id] || null, is_open: editedOpen[store.id] })
        .eq("id", store.id);
      if (error) hasError = true;
    }
    if (hasError) toast({ title: "Error", description: "Some stores failed to update", variant: "destructive" });
    else toast({ title: "Success", description: "All store hours updated" });
    fetchStores();
    setSavingId(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Store Hours</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage operating hours and open/closed status</p>
        </div>
        <Button onClick={handleSaveAll} disabled={savingId === "all"} className="rounded-xl">
          <Save className="h-4 w-4 mr-2" />
          {savingId === "all" ? "Saving..." : "Save All"}
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Clock className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No stores found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {stores.map((store) => (
            <Card key={store.id} className="border-border/50 hover:shadow-sm transition-all">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground text-sm">{store.name}</h3>
                      <p className="text-xs text-muted-foreground truncate">{store.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editedOpen[store.id] ?? true}
                        onCheckedChange={(c) => setEditedOpen((prev) => ({ ...prev, [store.id]: c }))}
                      />
                      <Badge variant={(editedOpen[store.id] ?? true) ? "default" : "destructive"} className="text-[10px] w-14 justify-center">
                        {(editedOpen[store.id] ?? true) ? "Open" : "Closed"}
                      </Badge>
                    </div>

                    <Input
                      className="w-56 h-9 text-sm"
                      value={editedHours[store.id] || ""}
                      onChange={(e) => setEditedHours((prev) => ({ ...prev, [store.id]: e.target.value }))}
                      placeholder="e.g. 10:00 AM - 10:00 PM"
                    />

                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-lg"
                      onClick={() => handleSave(store.id)}
                      disabled={savingId === store.id}
                    >
                      {savingId === store.id ? "..." : "Save"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default DashboardStoreHours;
