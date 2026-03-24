import { useEffect, useState } from "react";
import { Clock, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Store {
  id: string;
  name: string;
  address: string;
  hours: string | null;
  is_open: boolean | null;
}

const StoreHoursManagement = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editedHours, setEditedHours] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, address, hours, is_open")
      .order("name");

    if (error) {
      toast({ title: "Error", description: "Failed to fetch stores", variant: "destructive" });
    } else {
      setStores(data || []);
      const hoursMap: Record<string, string> = {};
      (data || []).forEach((s) => {
        hoursMap[s.id] = s.hours || "";
      });
      setEditedHours(hoursMap);
    }
    setLoading(false);
  };

  const handleSave = async (storeId: string) => {
    setSavingId(storeId);
    const { error } = await supabase
      .from("stores")
      .update({ hours: editedHours[storeId] || null })
      .eq("id", storeId);

    if (error) {
      toast({ title: "Error", description: "Failed to update store hours", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Store hours updated" });
      fetchStores();
    }
    setSavingId(null);
  };

  const handleSaveAll = async () => {
    setSavingId("all");
    let hasError = false;

    for (const store of stores) {
      const { error } = await supabase
        .from("stores")
        .update({ hours: editedHours[store.id] || null })
        .eq("id", store.id);
      if (error) hasError = true;
    }

    if (hasError) {
      toast({ title: "Error", description: "Some stores failed to update", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "All store hours updated" });
    }
    fetchStores();
    setSavingId(null);
  };

  if (loading) {
    return <div className="text-center py-8 text-muted-foreground">Loading stores...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Store Hours
        </CardTitle>
        <Button onClick={handleSaveAll} disabled={savingId === "all"}>
          <Save className="h-4 w-4 mr-2" />
          {savingId === "all" ? "Saving..." : "Save All"}
        </Button>
      </CardHeader>
      <CardContent>
        {stores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No stores found.</div>
        ) : (
          <div className="space-y-4">
            {stores.map((store) => (
              <div key={store.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{store.name}</h3>
                  <p className="text-sm text-muted-foreground truncate">{store.address}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Input
                    className="w-64"
                    value={editedHours[store.id] || ""}
                    onChange={(e) =>
                      setEditedHours((prev) => ({ ...prev, [store.id]: e.target.value }))
                    }
                    placeholder="e.g. 10:00 AM - 10:00 PM"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleSave(store.id)}
                    disabled={savingId === store.id}
                  >
                    {savingId === store.id ? "..." : "Save"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StoreHoursManagement;
