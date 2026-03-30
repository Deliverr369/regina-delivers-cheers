import { useState } from "react";
import {
  DollarSign, Eye, EyeOff, PackageCheck, PackageX, Trash2, X,
  Download, ImagePlus, Layers, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { ProductGroup, StoreInfo } from "@/hooks/useInventoryData";

interface Props {
  selectedGroups: ProductGroup[];
  stores: StoreInfo[];
  onClear: () => void;
  onRefresh: () => void;
  onOpenPriceModal: () => void;
  onOpenVariantModal: () => void;
  onOpenImageUpload: () => void;
  onOpenStoreAssignment: () => void;
}

const BulkActionsToolbar = ({
  selectedGroups, stores, onClear, onRefresh,
  onOpenPriceModal, onOpenVariantModal, onOpenImageUpload, onOpenStoreAssignment,
}: Props) => {
  const { toast } = useToast();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const allProductIds = selectedGroups.flatMap(g => g.products.map(p => p.id));
  const count = selectedGroups.length;

  const handleBulkVisibility = async (visible: boolean) => {
    setSaving(true);
    await supabase.from("products").update({ is_hidden: !visible }).in("id", allProductIds);
    toast({ title: `${count} product(s) ${visible ? "shown" : "hidden"}` });
    setSaving(false);
    onRefresh();
  };

  const handleBulkStock = async (inStock: boolean) => {
    setSaving(true);
    await supabase.from("products").update({ in_stock: inStock }).in("id", allProductIds);
    toast({ title: `${count} product(s) marked ${inStock ? "in stock" : "out of stock"}` });
    setSaving(false);
    onRefresh();
  };

  const handleBulkDelete = async () => {
    setSaving(true);
    await supabase.from("product_pack_prices").delete().in("product_id", allProductIds);
    await supabase.from("products").delete().in("id", allProductIds);
    toast({ title: `${count} product(s) deleted` });
    setDeleteOpen(false);
    setSaving(false);
    onClear();
    onRefresh();
  };

  const handleExport = () => {
    const rows: string[] = ["Name,Category,Stores,Variants,Status,In Stock,Has Image"];
    selectedGroups.forEach(g => {
      rows.push(`"${g.name}","${g.category}",${g.storeCount},${g.variantCount},"${g.isVisible ? "active" : "hidden"}","${g.inStock ? "yes" : "no"}","${g.hasImage ? "yes" : "no"}"`);
    });
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliverr-inventory-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: `${count} product(s) exported` });
  };

  if (count === 0) return null;

  const actions = [
    { icon: ImagePlus, label: "Images", onClick: onOpenImageUpload },
    { icon: DollarSign, label: "Prices", onClick: onOpenPriceModal },
    { icon: Layers, label: "Variants", onClick: onOpenVariantModal },
    { icon: Store, label: "Stores", onClick: onOpenStoreAssignment },
    { icon: Eye, label: "Show", onClick: () => handleBulkVisibility(true) },
    { icon: EyeOff, label: "Hide", onClick: () => handleBulkVisibility(false) },
    { icon: PackageCheck, label: "In Stock", onClick: () => handleBulkStock(true) },
    { icon: PackageX, label: "OOS", onClick: () => handleBulkStock(false) },
    { icon: Download, label: "Export", onClick: handleExport },
  ];

  return (
    <>
      <div className="sticky bottom-4 z-40 mx-auto max-w-5xl px-4">
        <div className="bg-foreground rounded-2xl shadow-2xl border border-foreground/90 px-3 py-2.5 flex items-center gap-2">
          <div className="flex items-center gap-2 pl-1 pr-2 border-r border-background/15 mr-1">
            <Badge className="bg-primary text-primary-foreground text-xs font-bold h-6 min-w-6 flex items-center justify-center rounded-full px-2">
              {count}
            </Badge>
            <span className="text-xs font-medium text-background/80 hidden sm:inline">selected</span>
          </div>

          <div className="flex items-center gap-0.5 flex-wrap">
            {actions.map(({ icon: Icon, label, onClick }) => (
              <Button
                key={label}
                size="sm"
                variant="ghost"
                className="h-8 px-2.5 text-[11px] text-background/80 hover:bg-background/10 hover:text-background gap-1"
                onClick={onClick}
                disabled={saving}
              >
                <Icon className="h-3.5 w-3.5" /><span className="hidden md:inline">{label}</span>
              </Button>
            ))}
            <div className="w-px h-5 bg-background/15 mx-1" />
            <Button
              size="sm"
              variant="ghost"
              className="h-8 px-2.5 text-[11px] text-red-400 hover:bg-red-500/20 hover:text-red-300 gap-1"
              onClick={() => setDeleteOpen(true)}
              disabled={saving}
            >
              <Trash2 className="h-3.5 w-3.5" /><span className="hidden md:inline">Delete</span>
            </Button>
          </div>

          <Button size="icon" variant="ghost" className="h-7 w-7 ml-auto text-background/60 hover:bg-background/10 hover:text-background" onClick={onClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} product(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes all selected products, their variants, and pricing from all stores. This action cannot be undone.
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
