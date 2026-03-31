import { useState, useEffect, useMemo } from "react";
import {
  Check,
  X,
  Edit3,
  Image as ImageIcon,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
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

interface BulkEditValues {
  variantOrSize: string;
  category: string;
  priceAction: string;
  imageAction: string;
  reviewNotes: string;
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

const CATEGORY_OPTIONS = ["beer", "wine", "spirits", "ciders_seltzers", "smokes"] as const;
const QUICK_SIZE_OPTIONS = [
  "1 Tall Can",
  "4 Pack",
  "6 Pack",
  "8 Pack",
  "12 Pack",
  "15 Pack",
  "24 Pack",
  "36 Pack",
  "48 Pack",
  "355ml",
  "473ml",
  "750ml",
  "1L",
  "1.14L",
  "1.75L",
];

const resolveImportedImageUrl = (value?: string | null) => {
  if (!value) return null;

  let normalized = value.trim();
  normalized = normalized
    .replace(/%7Bwidth%7D/gi, "800")
    .replace(/%7Bheight%7D/gi, "800")
    .replace(/\{width\}/gi, "800")
    .replace(/\{height\}/gi, "800");

  if (normalized.startsWith("//")) {
    normalized = `https:${normalized}`;
  }

  return normalized;
};

const normalizeVariantSize = (value?: string | null) => {
  if (!value) return null;

  const raw = value.trim();
  if (!raw) return null;

  const packMatch = raw.match(/(\d+)\s*(?:pack|pk)\b/i);
  if (packMatch) {
    return `${packMatch[1]} Pack`;
  }

  if (/tall\s*can|single\s*can|1\s*tall/i.test(raw)) {
    return "1 Tall Can";
  }

  const volumeMatch = raw.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
  if (volumeMatch) {
    const amount = volumeMatch[1];
    const unit = volumeMatch[2].toLowerCase() === "l" ? "L" : "ml";
    return `${amount}${unit}`;
  }

  return raw
    .replace(/\s*[-–—]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

interface Props {
  sessionId: string | null;
  sessionIds?: string[];
  onSessionChange: (id: string | null) => void;
}

const ImportReviewQueue = ({ sessionId, sessionIds }: Props) => {
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
  const [bulkEditOpen, setBulkEditOpen] = useState(false);

  useEffect(() => {
    supabase.from("stores").select("id, name").order("name").then(({ data }) => {
      setStores(data || []);
    });
  }, []);

  useEffect(() => {
    const idsToFetch = sessionIds && sessionIds.length > 0 ? sessionIds : sessionId ? [sessionId] : [];
    if (idsToFetch.length === 0) {
      setDrafts([]);
      return;
    }

    setLoading(true);
    supabase
      .from("import_drafts")
      .select("*")
      .in("session_id", idsToFetch)
      .order("product_name")
      .then(({ data, error }) => {
        if (error) console.error(error);

        const normalized = (data || []).map((draft: any) => {
          const normalizedVariant = normalizeVariantSize(draft.size || draft.variant);
          return {
            ...draft,
            imported_image_url: resolveImportedImageUrl(draft.imported_image_url),
            assigned_store_ids: draft.assigned_store_ids || [],
            price_action: draft.price_action || "import_as_default",
            image_action: draft.image_action || "import_as_main",
            variant: normalizedVariant ?? draft.variant ?? null,
            size: normalizedVariant ?? draft.size ?? null,
          };
        });

        setDrafts(normalized);
        setLoading(false);
      });
  }, [sessionId, sessionIds]);

  const filtered = useMemo(() => {
    return drafts.filter((draft) => {
      if (filterStatus !== "all" && draft.review_status !== filterStatus) return false;
      if (filterMatch !== "all" && draft.match_status !== filterMatch) return false;
      return true;
    });
  }, [drafts, filterStatus, filterMatch]);

  const stats = useMemo(
    () => ({
      total: drafts.length,
      pending: drafts.filter((draft) => draft.review_status === "pending").length,
      approved: drafts.filter((draft) => draft.review_status === "approved").length,
      rejected: drafts.filter((draft) => draft.review_status === "rejected").length,
      imported: drafts.filter((draft) => draft.review_status === "imported").length,
    }),
    [drafts],
  );

  const syncSessionSummary = async (nextDrafts: ImportDraft[], failedCount = 0) => {
    if (!sessionId) return;

    const approvedCount = nextDrafts.filter((draft) => draft.review_status === "approved").length;
    const importedCount = nextDrafts.filter((draft) => draft.review_status === "imported").length;
    const rejectedCount = nextDrafts.filter((draft) => draft.review_status === "rejected").length;

    await supabase
      .from("import_sessions")
      .update({
        status: approvedCount > 0 ? "review" : importedCount + rejectedCount > 0 ? "completed" : "review",
        approved_count: approvedCount,
        imported_count: importedCount,
        rejected_count: rejectedCount,
        failed_count: failedCount,
      })
      .eq("id", sessionId);
  };

  const importDraftsToInventory = async (draftsToImport: ImportDraft[]) => {
    const importedIds = new Set<string>();
    const errors: string[] = [];
    let imported = 0;
    let failed = 0;

    const availableStoreIds = stores.length
      ? stores.map((store) => store.id)
      : ((await supabase.from("stores").select("id")).data || []).map((store) => store.id);

    for (const draft of draftsToImport) {
      try {
        const category = CATEGORY_OPTIONS.includes((draft.category || "") as (typeof CATEGORY_OPTIONS)[number])
          ? (draft.category as "beer" | "wine" | "spirits" | "ciders_seltzers" | "smokes")
          : "beer";

        const normalizedName = draft.product_name.trim();
        const normalizedVariant = normalizeVariantSize(draft.size || draft.variant);
        const imageUrl = draft.image_action !== "keep_current" ? resolveImportedImageUrl(draft.imported_image_url) : null;
        const targetStoreIds = draft.assigned_store_ids?.length ? draft.assigned_store_ids : availableStoreIds;

        if (targetStoreIds.length === 0) {
          errors.push(`${draft.product_name}: No stores available`);
          failed += 1;
          continue;
        }

        let existingQuery = supabase
          .from("products")
          .select("store_id")
          .in("store_id", targetStoreIds)
          .eq("category", category)
          .ilike("name", normalizedName);

        existingQuery = normalizedVariant ? existingQuery.eq("size", normalizedVariant) : existingQuery.is("size", null);

        const { data: existingRows, error: existingError } = await existingQuery;
        if (existingError) throw existingError;

        const existingStoreIds = new Set((existingRows || []).map((row) => row.store_id));
        const rowsToInsert = targetStoreIds
          .filter((storeId) => !existingStoreIds.has(storeId))
          .map((store_id) => ({
            name: normalizedName,
            category,
            description: draft.description || null,
            price: draft.imported_price ?? 0,
            size: normalizedVariant,
            image_url: imageUrl,
            store_id,
            in_stock: draft.availability !== "out_of_stock",
            is_hidden: false,
          }));

        if (rowsToInsert.length > 0) {
          const { data: insertedProducts, error: insertError } = await supabase
            .from("products")
            .insert(rowsToInsert)
            .select("id, store_id");
          if (insertError) throw insertError;

          // Also create pack price entries so pricing shows up in the store assignment matrix
          if (insertedProducts && insertedProducts.length > 0 && (draft.imported_price ?? 0) > 0) {
            const packSize = normalizedVariant || "Single Bottle";
            const packPriceRows = insertedProducts.map((p) => ({
              product_id: p.id,
              pack_size: packSize,
              price: draft.imported_price ?? 0,
              is_hidden: false,
            }));
            const { error: packError } = await supabase.from("product_pack_prices").insert(packPriceRows);
            if (packError) console.error("Pack price insert error:", packError);
          }
        }

        const { error: draftError } = await supabase
          .from("import_drafts")
          .update({ review_status: "imported" })
          .eq("id", draft.id);

        if (draftError) throw draftError;

        importedIds.add(draft.id);
        imported += 1;
      } catch (err: any) {
        console.error("Import error for", draft.product_name, err);
        errors.push(`${draft.product_name}: ${err?.message || "Unknown error"}`);
        failed += 1;
      }
    }

    return { importedIds, imported, failed, errors };
  };

  const updateDraftStatus = async (ids: string[], status: string) => {
    const { error } = await supabase.from("import_drafts").update({ review_status: status }).in("id", ids);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }

    const nextDrafts = drafts.map((draft) => (ids.includes(draft.id) ? { ...draft, review_status: status } : draft));

    if (status !== "approved") {
      setDrafts(nextDrafts);
      setSelectedIds(new Set());
      await syncSessionSummary(nextDrafts);
      return;
    }

    setImporting(true);
    const approvalTargets = nextDrafts.filter((draft) => ids.includes(draft.id));
    const result = await importDraftsToInventory(approvalTargets);
    const finalDrafts = nextDrafts.map((draft) =>
      result.importedIds.has(draft.id) ? { ...draft, review_status: "imported" } : draft,
    );

    setDrafts(finalDrafts);
    setSelectedIds(new Set());
    setImporting(false);
    await syncSessionSummary(finalDrafts, result.failed);

    if (result.failed > 0) {
      toast({
        title: "Approved with errors",
        description: `${result.imported} imported, ${result.failed} failed.`,
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Approved and imported", description: `${result.imported} product(s) added to inventory.` });
  };

  const saveDraftEdit = async (draft: ImportDraft) => {
    const normalizedVariant = normalizeVariantSize(draft.variant || draft.size);
    const normalizedDraft = {
      ...draft,
      imported_image_url: resolveImportedImageUrl(draft.imported_image_url),
      variant: normalizedVariant,
      size: normalizedVariant,
      assigned_store_ids: draft.assigned_store_ids || [],
    };

    const { error } = await supabase
      .from("import_drafts")
      .update({
        product_name: normalizedDraft.product_name,
        brand: normalizedDraft.brand,
        category: normalizedDraft.category,
        description: normalizedDraft.description,
        imported_price: normalizedDraft.imported_price,
        variant: normalizedDraft.variant,
        size: normalizedDraft.size,
        assigned_store_ids: normalizedDraft.assigned_store_ids,
        price_action: normalizedDraft.price_action,
        image_action: normalizedDraft.image_action,
        review_notes: normalizedDraft.review_notes,
      })
      .eq("id", draft.id);

    if (error) {
      toast({ title: "Save failed", variant: "destructive" });
      return;
    }

    setDrafts((prev) => prev.map((item) => (item.id === draft.id ? normalizedDraft : item)));
    setEditDraft(null);
    toast({ title: "Draft updated" });
  };

  const applyBulkEdit = async (values: BulkEditValues) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    const normalizedVariant = normalizeVariantSize(values.variantOrSize);
    const updateData: Partial<ImportDraft> = {};

    if (normalizedVariant) {
      updateData.variant = normalizedVariant;
      updateData.size = normalizedVariant;
    }
    if (values.category !== "no_change") {
      updateData.category = values.category;
    }
    if (values.priceAction !== "no_change") {
      updateData.price_action = values.priceAction;
    }
    if (values.imageAction !== "no_change") {
      updateData.image_action = values.imageAction;
    }
    if (values.reviewNotes.trim()) {
      updateData.review_notes = values.reviewNotes.trim();
    }

    if (Object.keys(updateData).length === 0) {
      toast({ title: "Nothing to apply", description: "Choose at least one bulk field first.", variant: "destructive" });
      return;
    }

    const { error } = await supabase.from("import_drafts").update(updateData).in("id", ids);
    if (error) {
      toast({ title: "Bulk edit failed", variant: "destructive" });
      return;
    }

    setDrafts((prev) =>
      prev.map((draft) =>
        ids.includes(draft.id)
          ? {
              ...draft,
              ...updateData,
              variant: updateData.variant ?? draft.variant,
              size: updateData.size ?? draft.size,
            }
          : draft,
      ),
    );
    setBulkEditOpen(false);
    toast({ title: "Bulk edit applied", description: `Updated ${ids.length} selected listing(s).` });
  };

  const handleImportApproved = async () => {
    const approved = drafts.filter((draft) => draft.review_status === "approved");
    if (approved.length === 0) {
      toast({ title: "No approved items to import", variant: "destructive" });
      return;
    }

    setImporting(true);
    const result = await importDraftsToInventory(approved);
    const nextDrafts = drafts.map((draft) =>
      result.importedIds.has(draft.id) ? { ...draft, review_status: "imported" } : draft,
    );

    setDrafts(nextDrafts);
    setImporting(false);
    setConfirmImport(false);
    await syncSessionSummary(nextDrafts, result.failed);

    if (result.failed > 0) {
      console.error("Import errors:", result.errors);
      toast({
        title: "Import complete with errors",
        description: `${result.imported} imported, ${result.failed} failed. Check console for details.`,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Import complete",
      description: `${result.imported} product(s) imported successfully`,
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs h-6">{stats.total} total</Badge>
          <Badge className="text-[10px] h-5 bg-muted text-muted-foreground">{stats.pending} pending</Badge>
          <Badge className="text-[10px] h-5 bg-emerald-500/10 text-emerald-600 border-emerald-200">{stats.approved} approved</Badge>
          <Badge className="text-[10px] h-5 bg-destructive/10 text-destructive">{stats.rejected} rejected</Badge>
          {stats.imported > 0 && <Badge className="text-[10px] h-5 bg-primary/10 text-primary">{stats.imported} imported</Badge>}
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

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-xl border border-border/40 flex-wrap">
          <Badge variant="secondary" className="text-xs">{selectedIds.size} selected</Badge>
          <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setBulkEditOpen(true)}>
            <Edit3 className="h-3 w-3 mr-1" />Bulk Edit
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[11px] text-emerald-600" onClick={() => updateDraftStatus(Array.from(selectedIds), "approved")}>
            <Check className="h-3 w-3 mr-1" />Approve + Import
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

      <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/20 hover:bg-muted/20">
              <TableHead className="w-10 pl-4">
                <Checkbox
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onCheckedChange={() => {
                    if (selectedIds.size === filtered.length) setSelectedIds(new Set());
                    else setSelectedIds(new Set(filtered.map((draft) => draft.id)));
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
              filtered.map((draft) => {
                const matchBadge = MATCH_BADGES[draft.match_status] || MATCH_BADGES.new;
                const reviewBadge = REVIEW_BADGES[draft.review_status] || REVIEW_BADGES.pending;
                const isSelected = selectedIds.has(draft.id);
                const imageUrl = resolveImportedImageUrl(draft.imported_image_url);
                const variantLabel = normalizeVariantSize(draft.variant || draft.size);

                return (
                  <TableRow
                    key={draft.id}
                    className={`border-b border-border/30 transition-colors ${isSelected ? "bg-primary/[0.03]" : "hover:bg-muted/30"} ${draft.review_status === "rejected" ? "opacity-50" : ""}`}
                  >
                    <TableCell className="pl-4" onClick={(event) => event.stopPropagation()}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(draft.id)} />
                    </TableCell>
                    <TableCell className="pr-0">
                      <div className="h-9 w-9 rounded-lg border border-border/30 overflow-hidden bg-muted/20">
                        {imageUrl ? (
                          <img src={imageUrl} alt="" className="h-full w-full object-contain p-0.5" loading="lazy" />
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
                      <Badge variant="outline" className="text-[10px] h-5 capitalize font-normal">{draft.category || "—"}</Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">{variantLabel || "—"}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      {draft.imported_price != null ? (
                        <span className="text-sm font-medium tabular-nums">${draft.imported_price.toFixed(2)}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] h-5 font-normal ${matchBadge.className}`}>{matchBadge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] h-5 font-normal ${reviewBadge.className}`}>{reviewBadge.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10"
                          onClick={() => updateDraftStatus([draft.id], "approved")}
                          disabled={draft.review_status === "imported"}
                          title="Approve and import"
                        >
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          onClick={() => updateDraftStatus([draft.id], "rejected")}
                          disabled={draft.review_status === "imported"}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 hover:bg-muted/50" onClick={() => setEditDraft(draft)}>
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

      {stats.approved > 0 && (
        <div className="flex justify-end">
          <Button onClick={() => setConfirmImport(true)} className="gap-2">
            Import Remaining {stats.approved} Approved Product(s)
          </Button>
        </div>
      )}

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

      <Sheet open={bulkEditOpen} onOpenChange={setBulkEditOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <BulkEditDraftForm
            selectedCount={selectedIds.size}
            onApply={applyBulkEdit}
            onClose={() => setBulkEditOpen(false)}
          />
        </SheetContent>
      </Sheet>

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
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import Now"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

function BulkEditDraftForm({
  selectedCount,
  onApply,
  onClose,
}: {
  selectedCount: number;
  onApply: (values: BulkEditValues) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<BulkEditValues>({
    variantOrSize: "",
    category: "no_change",
    priceAction: "no_change",
    imageAction: "no_change",
    reviewNotes: "",
  });

  const update = (partial: Partial<BulkEditValues>) => setValues((prev) => ({ ...prev, ...partial }));

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="text-base">Bulk edit {selectedCount} selected listing(s)</SheetTitle>
      </SheetHeader>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Variant / Size</Label>
          <Input
            value={values.variantOrSize}
            onChange={(event) => update({ variantOrSize: event.target.value })}
            placeholder="e.g. 24 Pack or 750ml"
            className="h-9"
          />
          <p className="text-[10px] text-muted-foreground">Applies the same normalized size label to every selected draft.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {QUICK_SIZE_OPTIONS.map((option) => (
            <Button key={option} type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => update({ variantOrSize: option })}>
              {option}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">Category</Label>
          <Select value={values.category} onValueChange={(value) => update({ category: value })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="no_change">No change</SelectItem>
              {CATEGORY_OPTIONS.map((category) => (
                <SelectItem key={category} value={category} className="capitalize">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Price Action</Label>
            <Select value={values.priceAction} onValueChange={(value) => update({ priceAction: value })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No change</SelectItem>
                <SelectItem value="import_as_default">Import as default price</SelectItem>
                <SelectItem value="import_as_store_price">Import as store-specific price</SelectItem>
                <SelectItem value="no_overwrite">Don't overwrite if exists</SelectItem>
                <SelectItem value="overwrite">Overwrite existing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Image Action</Label>
            <Select value={values.imageAction} onValueChange={(value) => update({ imageAction: value })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="no_change">No change</SelectItem>
                <SelectItem value="import_as_main">Import as main image</SelectItem>
                <SelectItem value="replace_existing">Replace existing image</SelectItem>
                <SelectItem value="keep_current">Keep current image</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Review Notes</Label>
          <Input
            value={values.reviewNotes}
            onChange={(event) => update({ reviewNotes: event.target.value })}
            className="h-9"
            placeholder="Optional note for all selected drafts"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={() => onApply(values)} className="flex-1">Apply to Selected</Button>
      </div>
    </div>
  );
}

function EditDraftForm({
  draft,
  stores,
  onSave,
  onClose,
}: {
  draft: ImportDraft;
  stores: StoreInfo[];
  onSave: (draft: ImportDraft) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<ImportDraft>({
    ...draft,
    imported_image_url: resolveImportedImageUrl(draft.imported_image_url),
  });

  const update = (partial: Partial<ImportDraft>) => setLocal((prev) => ({ ...prev, ...partial }));

  const updateVariantSize = (value: string) => {
    const normalized = normalizeVariantSize(value);
    update({
      variant: normalized,
      size: normalized,
    });
  };

  const toggleStore = (id: string) => {
    const current = local.assigned_store_ids || [];
    update({
      assigned_store_ids: current.includes(id) ? current.filter((storeId) => storeId !== id) : [...current, id],
    });
  };

  return (
    <div className="space-y-5 pt-4">
      <SheetHeader>
        <SheetTitle className="text-base">Edit Import Draft</SheetTitle>
      </SheetHeader>

      {local.imported_image_url && (
        <div className="h-32 w-32 rounded-xl border border-border/30 overflow-hidden bg-background mx-auto">
          <img src={local.imported_image_url} alt="" className="h-full w-full object-contain p-2" />
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Product Name</Label>
          <Input value={local.product_name} onChange={(event) => update({ product_name: event.target.value })} className="h-9" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Brand</Label>
            <Input value={local.brand || ""} onChange={(event) => update({ brand: event.target.value })} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Category</Label>
            <Select value={local.category || ""} onValueChange={(value) => update({ category: value })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select..." /></SelectTrigger>
              <SelectContent>
                {CATEGORY_OPTIONS.map((category) => (
                  <SelectItem key={category} value={category} className="capitalize">
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Price</Label>
            <Input
              type="number"
              step="0.01"
              value={local.imported_price ?? ""}
              onChange={(event) => update({ imported_price: parseFloat(event.target.value) || null })}
              className="h-9"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Variant / Size</Label>
            <Input value={local.variant || local.size || ""} onChange={(event) => updateVariantSize(event.target.value)} className="h-9" />
          </div>
        </div>

        <Separator />

        <div className="space-y-1.5">
          <Label className="text-xs">Price Action</Label>
          <Select value={local.price_action} onValueChange={(value) => update({ price_action: value })}>
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
          <Select value={local.image_action} onValueChange={(value) => update({ image_action: value })}>
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
            {stores.map((store) => (
              <label key={store.id} className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/20 last:border-0">
                <Checkbox checked={local.assigned_store_ids?.includes(store.id) || false} onCheckedChange={() => toggleStore(store.id)} />
                <span className="text-sm">{store.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Review Notes</Label>
          <Input
            value={local.review_notes || ""}
            onChange={(event) => update({ review_notes: event.target.value })}
            className="h-9"
            placeholder="Optional notes..."
          />
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
