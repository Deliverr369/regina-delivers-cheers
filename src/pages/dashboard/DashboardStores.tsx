import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Store as StoreIcon, MapPin, Clock, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface StoreData {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  hours: string | null;
  delivery_fee: number | null;
  delivery_time: string | null;
  is_open: boolean | null;
  rating: number | null;
  image_url: string | null;
}

const emptyForm = {
  name: "", address: "", phone: "", hours: "10:00 AM - 10:00 PM",
  delivery_fee: 0, delivery_time: "30-45 min", is_open: true, image_url: "",
};

const DashboardStores = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<StoreData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<StoreData | null>(null);
  const [deleting, setDeleting] = useState<StoreData | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchStores(); }, []);

  const fetchStores = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("stores").select("*").order("name");
    if (error) toast({ title: "Error", description: "Failed to fetch stores", variant: "destructive" });
    else setStores(data || []);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (s: StoreData) => {
    setEditing(s);
    setForm({
      name: s.name, address: s.address, phone: s.phone || "",
      hours: s.hours || "", delivery_fee: s.delivery_fee || 0,
      delivery_time: s.delivery_time || "", is_open: s.is_open ?? true, image_url: s.image_url || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.address.trim()) {
      toast({ title: "Error", description: "Name and address are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(), address: form.address.trim(), phone: form.phone.trim() || null,
      hours: form.hours.trim() || null, delivery_fee: form.delivery_fee,
      delivery_time: form.delivery_time.trim() || null, is_open: form.is_open,
      image_url: form.image_url.trim() || null,
    };

    const { error } = editing
      ? await supabase.from("stores").update(payload).eq("id", editing.id)
      : await supabase.from("stores").insert(payload);

    if (error) toast({ title: "Error", description: `Failed to ${editing ? "update" : "create"} store`, variant: "destructive" });
    else { toast({ title: "Success", description: `Store ${editing ? "updated" : "created"}` }); setDialogOpen(false); fetchStores(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("stores").delete().eq("id", deleting.id);
    if (error) toast({ title: "Error", description: "Failed to delete store", variant: "destructive" });
    else { toast({ title: "Success", description: "Store deleted" }); fetchStores(); }
    setDeleteOpen(false); setDeleting(null);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-40 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Store Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your Regina delivery stores</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />Add Store
        </Button>
      </div>

      {stores.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <StoreIcon className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No stores yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first store to get started</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />Add Store
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stores.map((store) => (
            <Card key={store.id} className="border-border/50 hover:shadow-md transition-all group">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">{store.name}</h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Badge variant={store.is_open ? "default" : "destructive"} className="text-[10px] h-5 px-2">
                          {store.is_open ? "Open" : "Closed"}
                        </Badge>
                        {store.rating && (
                          <span className="text-xs text-muted-foreground">⭐ {store.rating}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(store)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleting(store); setDeleteOpen(true); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{store.address}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {store.hours && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span className="text-xs">{store.hours}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <DollarSign className="h-3.5 w-3.5" />
                      <span className="text-xs">${store.delivery_fee || 0} fee · {store.delivery_time || "—"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit Store" : "Add Store"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Address *</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-2"><Label>Hours</Label><Input value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} placeholder="10:00 AM - 10:00 PM" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Delivery Fee ($)</Label><Input type="number" value={form.delivery_fee} onChange={(e) => setForm({ ...form, delivery_fee: parseFloat(e.target.value) || 0 })} /></div>
              <div className="space-y-2"><Label>Delivery Time</Label><Input value={form.delivery_time} onChange={(e) => setForm({ ...form, delivery_time: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Image URL</Label><Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_open} onCheckedChange={(c) => setForm({ ...form, is_open: c })} />
              <Label>Store is open</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Store</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deleting?.name}"? This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardStores;
