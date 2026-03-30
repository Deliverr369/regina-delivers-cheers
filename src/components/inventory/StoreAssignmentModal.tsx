import { useState, useMemo } from "react";
import { Store as StoreIcon, Plus, Minus, Copy, ArrowRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ProductGroup, StoreInfo, PackPrice } from "@/hooks/useInventoryData";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedGroups: ProductGroup[];
  stores: StoreInfo[];
  packsByProduct: Record<string, PackPrice[]>;
  onRefresh: () => void;
}

const StoreAssignmentModal = ({ open, onClose, selectedGroups, stores, packsByProduct, onRefresh }: Props) => {
  const { toast } = useToast();
  const [action, setAction] = useState<"assign" | "unassign" | "copy_pricing">("assign");
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<string>>(new Set());
  const [copyFromStoreId, setCopyFromStoreId] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleStore = (id: string) => {
    setSelectedStoreIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    if (selectedStoreIds.size === 0 && action !== "copy_pricing") {
      toast({ title: "Select at least one store", variant: "destructive" });
      return;
    }
    setSaving(true);

    let count = 0;
    for (const group of selectedGroups) {
      const assignedMap = new Map(group.products.map(p => [p.store_id, p]));
      const firstProduct = group.products[0];
      if (!firstProduct) continue;

      if (action === "assign") {
        for (const storeId of selectedStoreIds) {
          if (assignedMap.has(storeId)) continue;
          const { data: newProd } = await supabase.from("products").insert({
            name: firstProduct.name, category: firstProduct.category,
            description: firstProduct.description, price: firstProduct.price,
            size: firstProduct.size, store_id: storeId,
            image_url: firstProduct.image_url, in_stock: true, is_hidden: false,
          }).select().single();
          if (newProd) {
            const sourcePacks = packsByProduct[firstProduct.id] || [];
            if (sourcePacks.length > 0) {
              await supabase.from("product_pack_prices").insert(
                sourcePacks.map(pp => ({
                  product_id: newProd.id, pack_size: pp.pack_size,
                  price: pp.price, is_hidden: pp.is_hidden,
                }))
              );
            }
            count++;
          }
        }
      } else if (action === "unassign") {
        for (const storeId of selectedStoreIds) {
          const product = assignedMap.get(storeId);
          if (!product) continue;
          await supabase.from("product_pack_prices").delete().eq("product_id", product.id);
          await supabase.from("products").delete().eq("id", product.id);
          count++;
        }
      } else if (action === "copy_pricing" && copyFromStoreId) {
        const sourceProduct = assignedMap.get(copyFromStoreId);
        if (!sourceProduct) continue;
        const sourcePacks = packsByProduct[sourceProduct.id] || [];
        for (const [sid, product] of assignedMap) {
          if (sid === copyFromStoreId) continue;
          if (selectedStoreIds.size > 0 && !selectedStoreIds.has(sid)) continue;
          await supabase.from("product_pack_prices").delete().eq("product_id", product.id);
          if (sourcePacks.length > 0) {
            await supabase.from("product_pack_prices").insert(
              sourcePacks.map(pp => ({
                product_id: product.id, pack_size: pp.pack_size,
                price: pp.price, is_hidden: pp.is_hidden,
              }))
            );
          }
          count++;
        }
      }
    }

    const messages: Record<string, string> = {
      assign: `Assigned to ${count} store(s)`,
      unassign: `Removed from ${count} store(s)`,
      copy_pricing: `Copied pricing to ${count} store(s)`,
    };
    toast({ title: "Done", description: messages[action] });
    setSaving(false);
    setSelectedStoreIds(new Set());
    onClose();
    onRefresh();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StoreIcon className="h-5 w-5 text-primary" />
            Store Assignments
          </DialogTitle>
          <DialogDescription>
            Manage store assignments for {selectedGroups.length} product(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Action</Label>
            <Select value={action} onValueChange={(v: any) => setAction(v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="assign"><div className="flex items-center gap-2"><Plus className="h-3.5 w-3.5 text-emerald-500" />Assign to stores</div></SelectItem>
                <SelectItem value="unassign"><div className="flex items-center gap-2"><Minus className="h-3.5 w-3.5 text-destructive" />Remove from stores</div></SelectItem>
                <SelectItem value="copy_pricing"><div className="flex items-center gap-2"><Copy className="h-3.5 w-3.5 text-primary" />Copy pricing between stores</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          {action === "copy_pricing" && (
            <div className="space-y-2">
              <Label className="text-xs font-medium">Copy from store</Label>
              <Select value={copyFromStoreId} onValueChange={setCopyFromStoreId}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Select source..." /></SelectTrigger>
                <SelectContent>
                  {stores.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-medium">
              {action === "copy_pricing" ? "Copy to stores (leave empty for all)" : "Select stores"}
            </Label>
            <div className="border border-border/40 rounded-xl max-h-48 overflow-y-auto">
              {stores.map(s => (
                <label
                  key={s.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 cursor-pointer border-b border-border/20 last:border-0"
                >
                  <Checkbox
                    checked={selectedStoreIds.has(s.id)}
                    onCheckedChange={() => toggleStore(s.id)}
                  />
                  <span className="text-sm">{s.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply} disabled={saving}>
            {saving ? "Applying..." : "Apply"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StoreAssignmentModal;
