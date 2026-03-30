import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Eye, EyeOff, Megaphone, GripVertical } from "lucide-react";
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[...Array(2)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Promo Banners</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage homepage promotional banners</p>
        </div>
        <Button onClick={openCreate} className="rounded-xl">
          <Plus className="h-4 w-4 mr-2" />Add Banner
        </Button>
      </div>

      {banners.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No promo banners</p>
            <p className="text-xs text-muted-foreground mt-1">Create your first promotional banner</p>
            <Button onClick={openCreate} variant="outline" className="mt-4 rounded-xl">
              <Plus className="h-4 w-4 mr-2" />Add Banner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <Card key={b.id} className={`border-border/50 transition-all hover:shadow-md ${!b.is_active ? "opacity-60" : ""}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0 cursor-grab" />
                
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-5 w-5 text-primary" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground text-sm">{b.title}</h3>
                    {b.subtitle && <span className="text-xs text-muted-foreground">— {b.subtitle}</span>}
                    <Badge variant={b.is_active ? "default" : "secondary"} className="text-[10px] h-5">
                      {b.is_active ? "Active" : "Inactive"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">#{b.display_order}</span>
                  </div>
                  {b.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{b.description}</p>}
                  {b.button_text && (
                    <p className="text-[11px] text-muted-foreground mt-1">
                      CTA: <span className="font-medium text-foreground">{b.button_text}</span> → {b.button_link}
                    </p>
                  )}
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleActive(b)}>
                    {b.is_active ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(b)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setDeleting(b); setDeleteOpen(true); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "Create"} Banner</DialogTitle>
            <DialogDescription>{editing ? "Update" : "Fill in"} the banner details.</DialogDescription>
          </DialogHeader>
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
