import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PromoBanner {
  id: string; title: string; subtitle: string | null; description: string | null;
  button_text: string | null; button_link: string | null; is_active: boolean;
  display_order: number; created_at: string; updated_at: string;
}

const emptyForm = {
  title: "", subtitle: "", description: "", button_text: "ORDER NOW",
  button_link: "/products", is_active: true, display_order: 0,
};

const DashboardBanners = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editing, setEditing] = useState<PromoBanner | null>(null);
  const [deleting, setDeleting] = useState<PromoBanner | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchBanners(); }, []);

  const fetchBanners = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("promo_banners").select("*").order("display_order");
    if (error) toast({ title: "Error", description: "Failed to fetch banners", variant: "destructive" });
    else setBanners(data || []);
    setLoading(false);
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (b: PromoBanner) => {
    setEditing(b);
    setForm({
      title: b.title, subtitle: b.subtitle || "", description: b.description || "",
      button_text: b.button_text || "", button_link: b.button_link || "",
      is_active: b.is_active, display_order: b.display_order,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast({ title: "Error", description: "Title required", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      title: form.title.trim(), subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null, button_text: form.button_text.trim() || null,
      button_link: form.button_link.trim() || null, is_active: form.is_active, display_order: form.display_order,
    };
    const { error } = editing
      ? await supabase.from("promo_banners").update(payload).eq("id", editing.id)
      : await supabase.from("promo_banners").insert(payload);
    if (error) toast({ title: "Error", description: `Failed to ${editing ? "update" : "create"} banner`, variant: "destructive" });
    else { toast({ title: "Success", description: `Banner ${editing ? "updated" : "created"}` }); setDialogOpen(false); fetchBanners(); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("promo_banners").delete().eq("id", deleting.id);
    if (error) toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    else { toast({ title: "Success", description: "Banner deleted" }); fetchBanners(); }
    setDeleteOpen(false); setDeleting(null);
  };

  const toggleActive = async (b: PromoBanner) => {
    const { error } = await supabase.from("promo_banners").update({ is_active: !b.is_active }).eq("id", b.id);
    if (!error) fetchBanners();
  };

  if (loading) return <div className="text-muted-foreground">Loading banners...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Promo Banners</h2>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />Add Banner</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {banners.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No banners found.</p>
          ) : (
            <div className="space-y-3">
              {banners.map((b) => (
                <div key={b.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{b.title}</h3>
                      {b.subtitle && <span className="text-muted-foreground">- {b.subtitle}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded ${b.is_active ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                        {b.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {b.description && <p className="text-sm text-muted-foreground mt-1">{b.description}</p>}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => toggleActive(b)}>
                      {b.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(b)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { setDeleting(b); setDeleteOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Create"} Banner</DialogTitle><DialogDescription>{editing ? "Update" : "Fill in"} the banner details.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
            <div className="space-y-2"><Label>Subtitle</Label><Input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Button Text</Label><Input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} /></div>
              <div className="space-y-2"><Label>Button Link</Label><Input value={form.button_link} onChange={(e) => setForm({ ...form, button_link: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Display Order</Label><Input type="number" value={form.display_order} onChange={(e) => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} /></div>
              <div className="flex items-center gap-2 pt-6"><Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} /><Label>Active</Label></div>
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
          <AlertDialogHeader><AlertDialogTitle>Delete Banner</AlertDialogTitle>
            <AlertDialogDescription>Delete "{deleting?.title}"? This cannot be undone.</AlertDialogDescription>
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

export default DashboardBanners;
