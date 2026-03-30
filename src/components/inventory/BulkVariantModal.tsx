import { useState, useMemo } from "react";
import { Layers, Plus, Trash2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ProductGroup, StoreInfo, PackPrice } from "@/hooks/useInventoryData";

const STANDARD_SIZES = [
  { value: "1-tall", label: "1 Tall Can" },
  { value: "6-pack", label: "6 Pack" },
  { value: "8-pack", label: "8 Pack" },
  { value: "12-pack", label: "12 Pack" },
  { value: "15-pack", label: "15 Pack" },
  { value: "18-pack", label: "18 Pack" },
  { value: "24-pack", label: "24 Pack" },
  { value: "36-pack", label: "36 Pack" },
  { value: "48-pack", label: "48 Pack" },
  { value: "single-bottle", label: "Single Bottle" },
  { value: "2-pack", label: "2-Pack" },
  { value: "case-6", label: "Case of 6" },
  { value: "case-12", label: "Case of 12" },
];

interface Props {
  open: boolean;
  onClose: () => void;
  selectedGroups: ProductGroup[];
  stores: StoreInfo[];
  packsByProduct: Record<string, PackPrice[]>;
  onRefresh: () => void;
}

const BulkVariantModal = ({ open, onClose, selectedGroups, stores, packsByProduct, onRefresh }: Props) => {
  const { toast } = useToast();
  const [action, setAction] = useState<"add" | "remove" | "enable" | "disable">("add");
  const [selectedSize, setSelectedSize] = useState("");
  const [price, setPrice] = useState("");
  const [storeScope, setStoreScope] = useState("all");
  const [saving, setSaving] = useState(false);

  const existingVariants = useMemo(() => {
    const set = new Set<string>();
    selectedGroups.forEach(g => g.products.forEach(p =>
      (packsByProduct[p.id] || []).forEach(pp => set.add(pp.pack_size))
    ));
    return Array.from(set).sort();
  }, [selectedGroups, packsByProduct]);

  const affectedCount = useMemo(() => {
    let count = 0;
    selectedGroups.forEach(g => {
      g.products.forEach(p => {
        if (storeScope !== "all" && p.store_id !== storeScope) return;
        count++;
      });
    });
    return count;
  }, [selectedGroups, storeScope]);

  const handleApply = async () => {
    if (!selectedSize) { toast({ title: "Select a size", variant: "destructive" }); return; }
    setSaving(true);

    let updatedCount = 0;
    for (const group of selectedGroups) {
      for (const product of group.products) {
        if (storeScope !== "all" && product.store_id !== storeScope) continue;
        const existing = (packsByProduct[product.id] || []).find(pp => pp.pack_size === selectedSize);

        switch (action) {
          case "add": {
            const priceVal = parseFloat(price);
            if (isNaN(priceVal) || priceVal < 0) continue;
            if (existing) {
              await supabase.from("product_pack_prices").update({ price: priceVal, is_hidden: false }).eq("id", existing.id);
            } else {
              await supabase.from("product_pack_prices").insert({
                product_id: product.id, pack_size: selectedSize, price: priceVal, is_hidden: false,
              });
            }
            updatedCount++;
            break;
          }
          case "remove":
            if (existing) {
              await supabase.from("product_pack_prices").delete().eq("id", existing.id);
              updatedCount++;
            }
            break;
          case "enable":
            if (existing) {
              await supabase.from("product_pack_prices").update({ is_hidden: false }).eq("id", existing.id);
              updatedCount++;
            }
            break;
          case "disable":
            if (existing) {
              await supabase.from("product_pack_prices").update({ is_hidden: true }).eq("id", existing.id);
              updatedCount++;
            }
            break;
        }
      }
    }

    toast({ title: "Variants updated", description: `${updatedCount} product-store(s) affected` });
    setSaving(false);
    onClose();
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            Bulk Variant Management
          </DialogTitle>
          <DialogDescription>
            Manage variants for {selectedGroups.length} product(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Action</Label>
            <Select value={action} onValueChange={(v: any) => setAction(v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add"><div className="flex items-center gap-2"><Plus className="h-3.5 w-3.5 text-emerald-500" />Add variant</div></SelectItem>
                <SelectItem value="remove"><div className="flex items-center gap-2"><Trash2 className="h-3.5 w-3.5 text-destructive" />Remove variant</div></SelectItem>
                <SelectItem value="enable"><div className="flex items-center gap-2">Enable variant (show)</div></SelectItem>
                <SelectItem value="disable"><div className="flex items-center gap-2">Disable variant (hide)</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium">Size / Variant</Label>
            <Select value={selectedSize} onValueChange={setSelectedSize}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select size..." /></SelectTrigger>
              <SelectContent>
                {action === "add" ? (
                  STANDARD_SIZES.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))
                ) : (
                  existingVariants.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {action === "add" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Price ($)</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 12.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="h-9"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium">Apply to stores</Label>
            <Select value={storeScope} onValueChange={setStoreScope}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assigned Stores</SelectItem>
                {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground">
            This will affect <span className="font-semibold text-foreground">{affectedCount}</span> product-store combination(s)
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={saving || !selectedSize}>
            {saving ? "Applying..." : "Apply Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkVariantModal;
