import { useState, useMemo } from "react";
import { DollarSign, TrendingUp, TrendingDown, ArrowRight, Check } from "lucide-react";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ProductGroup, StoreInfo, PackPrice } from "@/hooks/useInventoryData";

type ActionType = "increase_pct" | "increase_amt" | "decrease_pct" | "decrease_amt" | "set_exact";

interface Props {
  open: boolean;
  onClose: () => void;
  selectedGroups: ProductGroup[];
  stores: StoreInfo[];
  packsByProduct: Record<string, PackPrice[]>;
  onRefresh: () => void;
}

const BulkPriceModal = ({ open, onClose, selectedGroups, stores, packsByProduct, onRefresh }: Props) => {
  const { toast } = useToast();
  const [step, setStep] = useState<"config" | "preview">("config");
  const [actionType, setActionType] = useState<ActionType>("increase_pct");
  const [value, setValue] = useState("");
  const [storeScope, setStoreScope] = useState("all");
  const [variantScope, setVariantScope] = useState("all");
  const [saving, setSaving] = useState(false);

  const storeMap = new Map(stores.map(s => [s.id, s.name]));

  // Collect all unique variant names
  const allVariants = useMemo(() => {
    const set = new Set<string>();
    selectedGroups.forEach(g => g.products.forEach(p =>
      (packsByProduct[p.id] || []).forEach(pp => set.add(pp.pack_size))
    ));
    return Array.from(set).sort();
  }, [selectedGroups, packsByProduct]);

  // Build preview data
  const previewRows = useMemo(() => {
    const val = parseFloat(value);
    if (isNaN(val)) return [];

    const rows: { productName: string; storeName: string; variant: string; oldPrice: number; newPrice: number; packId: string }[] = [];

    selectedGroups.forEach(g => {
      g.products.forEach(p => {
        if (storeScope !== "all" && p.store_id !== storeScope) return;
        const packs = packsByProduct[p.id] || [];
        packs.forEach(pp => {
          if (variantScope !== "all" && pp.pack_size !== variantScope) return;
          let newPrice = pp.price;
          switch (actionType) {
            case "increase_pct": newPrice = pp.price * (1 + val / 100); break;
            case "decrease_pct": newPrice = pp.price * (1 - val / 100); break;
            case "increase_amt": newPrice = pp.price + val; break;
            case "decrease_amt": newPrice = pp.price - val; break;
            case "set_exact": newPrice = val; break;
          }
          newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
          rows.push({
            productName: g.name,
            storeName: storeMap.get(p.store_id) || "Unknown",
            variant: pp.pack_size,
            oldPrice: pp.price,
            newPrice,
            packId: pp.id,
          });
        });
      });
    });

    return rows;
  }, [selectedGroups, packsByProduct, actionType, value, storeScope, variantScope, storeMap]);

  const handleApply = async () => {
    if (previewRows.length === 0) return;
    setSaving(true);
    for (const row of previewRows) {
      await supabase.from("product_pack_prices").update({ price: row.newPrice }).eq("id", row.packId);
    }
    toast({ title: "Prices updated", description: `${previewRows.length} variant price(s) adjusted` });
    setSaving(false);
    setStep("config");
    setValue("");
    onClose();
    onRefresh();
  };

  const handleClose = () => {
    setStep("config");
    setValue("");
    onClose();
  };

  const actionLabels: Record<ActionType, string> = {
    increase_pct: "Increase by %",
    increase_amt: "Increase by $",
    decrease_pct: "Decrease by %",
    decrease_amt: "Decrease by $",
    set_exact: "Set exact price",
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={step === "preview" ? "max-w-3xl max-h-[85vh] overflow-hidden flex flex-col" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Bulk Price Adjustment
          </DialogTitle>
          <DialogDescription>
            {step === "config"
              ? `Adjust prices for ${selectedGroups.length} product(s)`
              : `Review ${previewRows.length} price change(s) before saving`
            }
          </DialogDescription>
        </DialogHeader>

        {step === "config" ? (
          <>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Action</Label>
                <Select value={actionType} onValueChange={(v: ActionType) => setActionType(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.entries(actionLabels) as [ActionType, string][]).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        <div className="flex items-center gap-2">
                          {k.startsWith("increase") && <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />}
                          {k.startsWith("decrease") && <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                          {k === "set_exact" && <Check className="h-3.5 w-3.5 text-primary" />}
                          {v}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {actionType.includes("pct") ? "Percentage" : "Amount ($)"}
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={actionType.includes("pct") ? "e.g. 5" : "e.g. 2.50"}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-9"
                />
              </div>

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

              <div className="space-y-2">
                <Label className="text-xs font-medium">Apply to variants</Label>
                <Select value={variantScope} onValueChange={setVariantScope}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Variants</SelectItem>
                    {allVariants.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button
                onClick={() => setStep("preview")}
                disabled={!value || isNaN(parseFloat(value)) || previewRows.length === 0}
              >
                Preview Changes <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-auto border border-border/40 rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20 hover:bg-muted/20">
                    <TableHead className="text-xs font-semibold">Product</TableHead>
                    <TableHead className="text-xs font-semibold">Store</TableHead>
                    <TableHead className="text-xs font-semibold">Variant</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Old Price</TableHead>
                    <TableHead className="text-xs font-semibold text-right">New Price</TableHead>
                    <TableHead className="text-xs font-semibold text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewRows.slice(0, 100).map((row, i) => {
                    const diff = row.newPrice - row.oldPrice;
                    return (
                      <TableRow key={i} className="border-b border-border/30">
                        <TableCell className="text-xs py-2 font-medium">{row.productName}</TableCell>
                        <TableCell className="text-xs py-2 text-muted-foreground">{row.storeName}</TableCell>
                        <TableCell className="text-xs py-2">{row.variant}</TableCell>
                        <TableCell className="text-xs py-2 text-right tabular-nums text-muted-foreground">${row.oldPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs py-2 text-right tabular-nums font-medium">${row.newPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-xs py-2 text-right tabular-nums">
                          <span className={diff > 0 ? "text-emerald-600" : diff < 0 ? "text-destructive" : "text-muted-foreground"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(2)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {previewRows.length > 100 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  Showing 100 of {previewRows.length} changes
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Badge variant="secondary" className="text-xs h-6">
                {previewRows.length} changes
              </Badge>
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => setStep("config")}>Back</Button>
                <Button onClick={handleApply} disabled={saving}>
                  {saving ? "Applying..." : "Apply All Changes"}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkPriceModal;
