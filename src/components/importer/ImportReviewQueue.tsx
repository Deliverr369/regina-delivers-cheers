import { useState, useEffect, useMemo } from "react";
import {
  Check, X, Edit3, Merge, Image as ImageIcon, DollarSign,
  Eye, Loader2, Store as StoreIcon, AlertTriangle, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface ImportDraft {
  id: string;
  session_id: string;
  source_url: string | null;
  product_name: string;
  brand: string | null;
  category: string | null;
  description: string | null;
  imported_image_url: string | null;
  imported_price: number | null;
  compare_at_price: number | null;
  variant: string | null;
  size: string | null;
  sku: string | null;
  availability: string | null;
  match_status: string;
  matched_product_id: string | null;
  review_status: string;
  review_notes: string | null;
  assigned_store_ids: string[];
  price_action: string;
  image_action: string;
}

interface StoreInfo {
  id: string;
  name: string;
}

const MATCH_BADGES: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  exact_match: { label: "Exact Match", className: "bg-primary/10 text-primary border-primary/20" },
  possible_match: { label: "Possible", className: "bg-amber-500/10 text-amber-600 border-amber-200" },
  missing_data: { label: "Missing Data", className: "bg-orange-500/10 text-orange-600 border-orange-200" },
  needs_review: { label: "Needs Review", className: "bg-violet-500/10 text-violet-600 border-violet-200" },
};

const REVIEW_BADGES: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-muted text-muted-foreground" },
  approved: { label: "Approved", className: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
  rejected: { label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/20" },
  imported: { label: "Imported", className: "bg-primary/10 text-primary border-primary/20" },
  skipped: { label: "Skipped", className: "bg-muted text-muted-foreground" },
};

const CATEGORY_OPTIONS = ["beer", "wine", "spirits", "smokes"];

interface Props {
  sessionId: string | null;
  onSessionChange: (id: string | null) => void;
}

const ImportReviewQueue = ({ sessionId, onSessionChange }: Props) => {
  const { toast } = useToast();
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editDraft, setEditDraft] = useState<ImportDraft | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [importing, setImporting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMatch, setFilterMatch] = useState("all");

  useEffect(() => {
    supabase.from("stores").select("id, name").order("name").then(({ data }) => {
      setStores(data || []);
    });
  }, []);

  useEffect(() => {
    if (!sessionId) { setDrafts([]); return; }
    setLoading(true);
    supabase
      .from("import_drafts")
      .select("*")
      .eq("session_id", sessionId)
      .order("product_name")
      .then(({ data, error }) => {
        if (error) console.error(error);
        setDrafts((data as any[]) || []);
        setLoading(false);
      });
  }, [sessionId]);

  const filtered = useMemo(() => {
    return drafts.filter(d => {
      if (filterStatus !== "all" && d.review_status !== filterStatus) return false;
      if (filterMatch !== "all" && d.match_status !== filterMatch) return false;
      return true;
    });
  }, [drafts, filterStatus, filterMatch]);

  const stats = useMemo(() => ({
    total: drafts.length,
    pending: drafts.filter(d => d.review_status === "pending").length,
    approved: drafts.filter(d => d.review_status === "approved").length,
    rejected: drafts.filter(d => d.review_status === "rejected").length,
    imported: drafts.filter(d => d.review_status === "imported").length,
  }), [drafts]);

  const updateDraftStatus = async (ids: string[], status: string) => {
    await supabase.from("import_drafts").update({ review_status: status }).in("id", ids);
    setDrafts(prev => prev.map(d => ids.includes(d.id) ? { ...d, review_status: status } : d));
    setSelectedIds(new Set());
  };

  const saveDraftEdit = async (draft: ImportDraft) => {
    const { error } = await supabase.from("import_drafts").update({
      product_name: draft.product_name,
      brand: draft.brand,
      category: draft.category,
      description: draft.description,
      imported_price: draft.imported_price,
      variant: draft.variant,
      size: draft.size,
      assigned_store_ids: draft.assigned_store_ids,
      price_action: draft.price_action,
      image_action: draft.image_action,
      review_notes: draft.review_notes,
    }).eq("id", draft.id);

    if (error) {
      toast({ title: "Save failed", variant: "destructive" });
    } else {
      setDrafts(prev => prev.map(d => d.id === draft.id ? draft : d));
      setEditDraft(null);
      toast({ title: "Draft updated" });
    }
  };

  const handleImportApproved = async () => {
    const approved = drafts.filter(d => d.review_status === "approved");
    if (approved.length === 0) {
      toast({ title: "No approved items to import", variant: "destructive" });
      return;
    }

    setImporting(true);
    let imported = 0;
    let failed = 0;

    // Get stores to assign — if none specified, use all
    const { data: allStores } = await supabase.from("stores").select("id");
    const allStoreIds = (allStores || []).map(s => s.id);

    for (const draft of approved) {
      try {
        const category = CATEGORY_OPTIONS.includes(draft.category || "")
          ? draft.category as "beer" | "wine" | "spirits" | "smokes"
          : "beer";

        const storeIds = draft.assigned_store_ids.length > 0
          ? draft.assigned_store_ids
          : allStoreIds;

        for (const storeId of storeIds) {
          const { error } = await supabase.from("products").insert({
            name: draft.product_name,
            category,
            description: draft.description,
            price: draft.imported_price || 0,
            size: draft.size || draft.variant,
            image_url: draft.image_action !== "keep_current" ? draft.imported_image_url : null,
            store_id: storeId,
            in_stock: draft.availability !== "out_of_stock",
            is_hidden: false,
          });
          if (error) throw error;
        }

        await supabase.from("import_drafts").update({ review_status: "imported" }).eq("id", draft.id);
        imported++;
      } catch (err) {
        console.error("Import error for", draft.product_name, err);
        failed++;
      }
    }

    // Update session counts
    if (sessionId) {
      await supabase.from("import_sessions").update({
        status: "completed",
        imported_count: imported,
        failed_count: failed,
        approved_count: approved.length,
        rejected_count: drafts.filter(d => d.review_status === "rejected").length,
      }).eq("id", sessionId);
    }

    setDrafts(prev => prev.map(d =>
      d.review_status === "approved" ? { ...d, review_status: "imported" } : d
    ));
    setImporting(false);
    setConfirmImport(false);
    toast({
      title: "Import complete",
      description: `${imported} product(s) imported${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (!sessionId) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="h-10 w-10 text-muted-foreground/20 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground font-medium">No active import session</p>
        <p className="text-xs text-muted-foreground/70 mt-1">Scan a URL first, or open a previous session from History</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs h-6">{stats.total} total</Badge>
          <Badge className="text-[10px] h-5 bg-muted text-muted-foreground">{stats.pending} pending</Badge>
          <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200">{stats.approved} approved</Badge>
          <Badge className="text-[10px] h-5 bg-destructive/10 text-destructive">{stats.rejected} rejected</Badge>
          {stats.imported > 0 && (
            <Badge className="text-[10px] h-5 bg-primary/10 text-primary">{stats.imported} imported</Badge>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={filterMatch} onValueChange={setFilterMatch}>
            <SelectTrigger className="h-8 w-[130px] text-xs"><SelectValue placeholder="Match..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Matches</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="exact_match">Exact Match</SelectItem>
              <SelectItem value="possible_match">Possible</SelectItem>
              <SelectItem value="missing_data">Missing Data</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue placeholder="Status..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/40">
          <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
          <Button size="sm" variant="outline" className="h-7 text-[11px] text-emerald-600" onClick={() => updateDraftStatus(Array.from(selectedIds), "approved")}>
            <Check className="h-3 w-3 mr-1" />Approve
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] text-destructive" onClick={() => updateDraftStatus(Array.from(selectedIds), "rejected")}>
            <X className="h-3 w-3 mr-1" />Reject
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => updateDraftStatus(Array.from(selectedIds), "skipped")}>
            Skip
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-[11px] ml-auto" onClick={() => setSelectedIds(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={() => {
                    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filtered.map(d => d.id)));
                  }}
                />
              </TableHead>
              <TableHead className="w-11" />
              <TableHead className="text-xs font-semibold">Product</TableHead>
              <TableHead className="w-[80px] text-xs font-semibold">Category</TableHead>
              <TableHead className="w-[90px] text-xs font-semibold">Variant</TableHead>
              <TableHead className="w-[80px] text-xs font-semibold text-right">Price</TableHead>
              <TableHead className="w-[90px] text-xs font-semibold">Match</TableHead>
              <TableHead className="w-[80px] text-xs font-semibold">Status</TableHead>
              <TableHead className="w-[120px] text-xs font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12">
                  <p className="text-sm text-muted-foreground">No items match current filters</p>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(draft => {
                const matchBadge = MATCH_BADGES[draft.match_status] || MATCH_BADGES.new;
                const reviewBadge = REVIEW_BADGES[draft.review_status] || REVIEW_BADGES.pending;
                const isSelected = selectedIds.has(draft.id);

                return (
                  <TableRow
                    key={draft.id}
                    className={`border-b border-border/30 transition-colors ${
                      isSelected ? "bg-primary/[0.03]" : "hover:bg-muted/30"
                    } ${draft.review_status === "rejected" ? "opacity-50" : ""}`}
                  >
                    <TableCell className="pl-4" onClick={e => e.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(draft.id)} />
                    </TableCell>
                    <TableCell className="pr-0">
                      <div className="h-9 w-9 rounded-lg border border-border/30 overflow-hidden bg-muted/20">
                        {draft.imported_image_url ? (
                          <img src={draft.imported_image_url} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <ImageIcon className="h-3.5 w-3.5 text-muted-foreground/25" />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-sm truncate max-w-[250px]">{draft.product_name}</p>
                      {draft.brand && <p className="text-[11px] text-muted-foreground truncate">{draft.brand}</p>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] h-5 capitalize font-normal">
                        {draft.category || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{draft.variant || draft.size || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {draft.imported_price != null ? (
                        <span className="text-sm font-medium tabular-nums">${draft.imported_price.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] h-5 font-normal ${matchBadge.className}`}>
                        {matchBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] h-5 font-normal ${reviewBadge.className}`}>
                        {reviewBadge.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => updateDraftStatus([draft.id], "approved")}
                          disabled={draft.review_status === "imported"}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => updateDraftStatus([draft.id], "rejected")}
                          disabled={draft.review_status === "imported"}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-muted/50"
                          onClick={() => setEditDraft(draft)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Import Button */}
      {stats.approved > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setConfirmImport(true)} className="gap-2">
            Import {stats.approved} Approved Product(s)
          </Button>
        </div>
      )}

      {/* Edit Drawer */}
      <Sheet open={!!editDraft} onOpenChange={() => setEditDraft(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {editDraft && (
            <EditDraftForm
              draft={editDraft}
              stores={stores}
              onSave={saveDraftEdit}
              onClose={() => setEditDraft(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm Import Dialog */}
      <AlertDialog open={confirmImport} onOpenChange={setConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Import {stats.approved} approved product(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create new products in your inventory. Products without store assignments will be added to all stores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImportApproved} disabled={importing}>
              {importing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Importing...</> : "Import Now"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Edit Draft Form
function EditDraftForm({ draft, stores, onSave, onClose }: {
  draft: ImportDraft;
  stores: StoreInfo[];
  onSave: (d: ImportDraft) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState({ ...draft });

  const update = (partial: Partial<ImportDraft>) => setLocal(prev => ({ ...prev, ...partial }));

  const toggleStore = (id: string) => {
    const current = local.assigned_store_ids || [];
    update({
      assigned_store_ids: current.includes(id)
        ? current.filter(s => s !== id)
        : [...current, id],
    });
  };

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="text-base">Edit Import Draft</SheetTitle>
      </SheetHeader>

      {local.imported_image_url && (
        <div className="h-32 w-32 rounded-xl border border-border/30 overflow-hidden bg-white mx-auto">
          <img src={local.imported_image_url} alt="" className="h-full w-full object-contain p-2" />
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Product Name</Label>
          <Input value={local.product_name} onChange={e => update({ product_name: e.target.value })} className="h-9" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Brand</Label>
            <Input value={local.brand || ""} onChange={e => update({ brand: e.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={local.category || ""} onValueChange={v => update({ category: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Price</Label>
            <Input type="number" step="0.01" value={local.imported_price ?? ""} onChange={e => update({ imported_price: parseFloat(e.target.value) || null })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Variant / Size</Label>
            <Input value={local.variant || local.size || ""} onChange={e => update({ variant: e.target.value })} className="h-9" />
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">Price Action</Label>
          <Select value={local.price_action} onValueChange={v => update({ price_action: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="import_as_default">Import as default price</SelectItem>
              <SelectItem value="import_as_store_price">Import as store-specific price</SelectItem>
              <SelectItem value="no_overwrite">Don't overwrite if exists</SelectItem>
              <SelectItem value="overwrite">Overwrite existing</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Image Action</Label>
          <Select value={local.image_action} onValueChange={v => update({ image_action: v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="import_as_main">Import as main image</SelectItem>
              <SelectItem value="replace_existing">Replace existing image</SelectItem>
              <SelectItem value="keep_current">Keep current image</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">Assign to Stores</Label>
          <p className="text-[10px] text-muted-foreground">Leave empty to assign to all stores</p>
          <div className="border border-border/40 rounded-xl max-h-40 overflow-y-auto">
            {stores.map(s => (
              <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/20 last:border-0">
                <Checkbox
                  checked={local.assigned_store_ids?.includes(s.id) || false}
                  onCheckedChange={() => toggleStore(s.id)}
                />
                <span className="text-sm">{s.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Review Notes</Label>
          <Input value={local.review_notes || ""} onChange={e => update({ review_notes: e.target.value })} className="h-9" placeholder="Optional notes..." />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={() => onSave(local)} className="flex-1">Save Changes</Button>
      </div>
    </div>
  );
}

export default ImportReviewQueue;
