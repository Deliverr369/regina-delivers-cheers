import { useState } from "react";
import {
  DollarSign, Eye, EyeOff, PackageCheck, PackageX, Trash2, X,
  Download, TrendingUp, TrendingDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ProductGroup, StoreInfo } from "@/hooks/useInventoryData";

interface Props {
  selectedGroups: ProductGroup[];
  stores: StoreInfo[];
  onClear: () => void;
  onRefresh: () => void;
}

const BulkActionsToolbar = ({ selectedGroups, stores, onClear, onRefresh }: Props) => {
  const { toast } = useToast();
  const [priceOpen, setPriceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [priceAction, setPriceAction] = useState({
    type: "increase_pct" as "increase_pct" | "increase_amt" | "decrease_pct" | "decrease_amt",
    value: "",
    storeScope: "all",
  });
  const [saving, setSaving] = useState(false);

  const allProductIds = selectedGroups.flatMap(g => g.products.map(p => p.id));
  const count = selectedGroups.length;

  const handleBulkVisibility = async (visible: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("products").update({ is_hidden: !visible }).in("id", allProductIds);
    if (error) toast({ title: "Error", variant: "destructive" });
    else toast({ title: `${count} product(s) ${visible ? "shown" : "hidden"}` });
    setSaving(false);
    onRefresh();
  };

  const handleBulkStock = async (inStock: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("products").update({ in_stock: inStock }).in("id", allProductIds);
    if (error) toast({ title: "Error", variant: "destructive" });
    else toast({ title: `${count} product(s) marked ${inStock ? "in stock" : "out of stock"}` });
    setSaving(false);
    onRefresh();
  };

  const handleBulkPrice = async () => {
    const val = parseFloat(priceAction.value);
    if (isNaN(val) || val <= 0) { toast({ title: "Enter a valid number", variant: "destructive" }); return; }

    setSaving(true);
    let targetProductIds = allProductIds;
    if (priceAction.storeScope !== "all") {
      targetProductIds = selectedGroups
        .flatMap(g => g.products.filter(p => p.store_id === priceAction.storeScope))
        .map(p => p.id);
    }

    // Get all pack prices for these products
    const { data: packs } = await supabase
      .from("product_pack_prices")
      .select("*")
      .in("product_id", targetProductIds);

    if (packs && packs.length > 0) {
      for (const pp of packs) {
        let newPrice = pp.price;
        switch (priceAction.type) {
          case "increase_pct": newPrice = pp.price * (1 + val / 100); break;
          case "decrease_pct": newPrice = pp.price * (1 - val / 100); break;
          case "increase_amt": newPrice = pp.price + val; break;
          case "decrease_amt": newPrice = pp.price - val; break;
        }
        newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
        await supabase.from("product_pack_prices").update({ price: newPrice }).eq("id", pp.id);
      }
      toast({ title: "Prices updated", description: `${packs.length} variant price(s) adjusted` });
    } else {
      toast({ title: "No prices found", description: "Selected products have no variant prices", variant: "destructive" });
    }

    setPriceOpen(false);
    setSaving(false);
    onRefresh();
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    await supabase.from("product_pack_prices").delete().in("product_id", allProductIds);
    const { error } = await supabase.from("products").delete().in("id", allProductIds);
    if (error) toast({ title: "Error", variant: "destructive" });
    else toast({ title: `${count} product(s) deleted` });
    setDeleteOpen(false);
    setSaving(false);
    onClear();
    onRefresh();
  };

  const handleExport = () => {
    const rows = selectedGroups.map(g => ({
      name: g.name,
      category: g.category,
      stores: g.storeCount,
      variants: g.variantCount,
      status: g.isVisible ? "active" : "hidden",
      in_stock: g.inStock ? "yes" : "no",
      has_image: g.hasImage ? "yes" : "no",
    }));
    const headers = Object.keys(rows[0]);
    const csv = [headers.join(","), ...rows.map(r => headers.map(h => `"${(r as any)[h]}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `inventory-export-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${count} product(s) exported to CSV` });
  };

  if (count === 0) return null;

  return (
    <>
      <div className="sticky bottom-4 z-40 mx-auto max-w-4xl">
        <div className="bg-foreground text-background rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 border border-border/10">
          <div className="flex items-center gap-2 mr-2">
            <Badge className="bg-primary text-primary-foreground text-xs font-bold h-6 min-w-6 flex items-center justify-center rounded-full">
              {count}
            </Badge>
            <span className="text-sm font-medium hidden sm:inline">selected</span>
          </div>

          <div className="h-5 w-px bg-background/20" />

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={() => setPriceOpen(true)} disabled={saving}>
              <DollarSign className="h-3.5 w-3.5 mr-1" />Prices
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={() => handleBulkVisibility(true)} disabled={saving}>
              <Eye className="h-3.5 w-3.5 mr-1" />Show
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={() => handleBulkVisibility(false)} disabled={saving}>
              <EyeOff className="h-3.5 w-3.5 mr-1" />Hide
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={() => handleBulkStock(true)} disabled={saving}>
              <PackageCheck className="h-3.5 w-3.5 mr-1" />In Stock
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={() => handleBulkStock(false)} disabled={saving}>
              <PackageX className="h-3.5 w-3.5 mr-1" />OOS
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-background hover:bg-background/10 hover:text-background"
              onClick={handleExport} disabled={saving}>
              <Download className="h-3.5 w-3.5 mr-1" />Export
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300"
              onClick={() => setDeleteOpen(true)} disabled={saving}>
              <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
            </Button>
          </div>

          <div className="ml-auto">
            <Button size="icon" variant="ghost" className="h-7 w-7 text-background hover:bg-background/10" onClick={onClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Price Adjustment Dialog */}
      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" />Bulk Price Adjustment</DialogTitle>
            <DialogDescription>Adjust prices for {count} selected product(s)</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={priceAction.type} onValueChange={(v: any) => setPriceAction(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase_pct"><div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" />Increase by %</div></SelectItem>
                  <SelectItem value="increase_amt"><div className="flex items-center gap-2"><TrendingUp className="h-3.5 w-3.5 text-emerald-500" />Increase by $</div></SelectItem>
                  <SelectItem value="decrease_pct"><div className="flex items-center gap-2"><TrendingDown className="h-3.5 w-3.5 text-red-500" />Decrease by %</div></SelectItem>
                  <SelectItem value="decrease_amt"><div className="flex items-center gap-2"><TrendingDown className="h-3.5 w-3.5 text-red-500" />Decrease by $</div></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input
                type="number"
                placeholder={priceAction.type.includes("pct") ? "e.g. 5" : "e.g. 2.50"}
                value={priceAction.value}
                onChange={(e) => setPriceAction(p => ({ ...p, value: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Apply to stores</Label>
              <Select value={priceAction.storeScope} onValueChange={(v) => setPriceAction(p => ({ ...p, storeScope: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkPrice} disabled={saving}>
              {saving ? "Applying..." : "Apply Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} product(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove {count} product(s) and all their variants from all stores. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionsToolbar;
