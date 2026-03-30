import { useState, useEffect, useRef } from "react";
import {
  Image as ImageIcon, Upload, Eye, EyeOff, Store as StoreIcon,
  PackageCheck, PackageX, Copy, Check,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processProductImage } from "@/utils/imageProcessor";
import type { ProductGroup, StoreInfo, PackPrice } from "@/hooks/useInventoryData";

const CATEGORY_EMOJI: Record<string, string> = {
  beer: "🍺", wine: "🍷", spirits: "🥃", smokes: "🚬",
};

interface Props {
  group: ProductGroup | null;
  stores: StoreInfo[];
  packPrices: PackPrice[];
  onClose: () => void;
  onRefresh: () => void;
  onOpenEditor: (name: string, category: string) => void;
}

const ProductDetailDrawer = ({ group, stores, packPrices, onClose, onRefresh, onOpenEditor }: Props) => {
  const { toast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);
  const [copiedStore, setCopiedStore] = useState<string | null>(null);

  if (!group) return null;

  const storeMap = new Map(stores.map(s => [s.id, s.name]));
  const assignedStoreIds = new Set(group.products.map(p => p.store_id));

  const getProductPacks = (productId: string) =>
    packPrices.filter(pp => pp.product_id === productId && !pp.is_hidden);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Processing image..." });
    try {
      const blob = await processProductImage(file, () => {});
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("store-images")
        .upload(`products/${fileName}`, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
      const ids = group.products.map(p => p.id);
      await supabase.from("products").update({ image_url: publicUrl }).in("id", ids);
      toast({ title: "Image updated" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const toggleVisibility = async (productId: string, currentlyHidden: boolean | null) => {
    await supabase.from("products").update({ is_hidden: !currentlyHidden }).eq("id", productId);
    onRefresh();
  };

  const toggleStock = async (productId: string, currentlyInStock: boolean) => {
    await supabase.from("products").update({ in_stock: !currentlyInStock }).eq("id", productId);
    onRefresh();
  };

  const copyPricingFromStore = async (fromProductId: string) => {
    const fromPacks = packPrices.filter(pp => pp.product_id === fromProductId);
    const otherProducts = group.products.filter(p => p.id !== fromProductId);
    for (const toProduct of otherProducts) {
      await supabase.from("product_pack_prices").delete().eq("product_id", toProduct.id);
      if (fromPacks.length > 0) {
        await supabase.from("product_pack_prices").insert(
          fromPacks.map(pp => ({
            product_id: toProduct.id,
            pack_size: pp.pack_size,
            price: pp.price,
            is_hidden: pp.is_hidden,
          }))
        );
      }
    }
    const storeName = storeMap.get(group.products.find(p => p.id === fromProductId)?.store_id || "");
    setCopiedStore(fromProductId);
    setTimeout(() => setCopiedStore(null), 2000);
    toast({ title: "Pricing copied", description: `Applied ${storeName} pricing to all stores` });
    onRefresh();
  };

  return (
    <Sheet open={!!group} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <SheetHeader className="pb-4">
          <SheetTitle className="text-lg">{group.name}</SheetTitle>
          <SheetDescription>
            <Badge variant="outline" className="capitalize mr-2">
              {CATEGORY_EMOJI[group.category]} {group.category}
            </Badge>
            {group.storeCount} store{group.storeCount !== 1 ? "s" : ""}
            {" · "}
            {group.variantCount} size{group.variantCount !== 1 ? "s" : ""}
          </SheetDescription>
        </SheetHeader>

        {/* Image */}
        <div className="mb-5">
          <div className="relative h-40 bg-muted/30 rounded-xl overflow-hidden flex items-center justify-center">
            {group.image_url ? (
              <img src={group.image_url} alt={group.name} className="h-full object-contain p-4" />
            ) : (
              <ImageIcon className="h-12 w-12 text-muted-foreground/20" />
            )}
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-2 right-2 h-8 rounded-lg"
              onClick={() => imageRef.current?.click()}
            >
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              {group.image_url ? "Replace" : "Upload"}
            </Button>
          </div>
        </div>

        {/* Full Editor Link */}
        <Button
          variant="outline"
          className="w-full mb-5 rounded-xl"
          onClick={() => { onClose(); onOpenEditor(group.name, group.category); }}
        >
          Open Full Product Editor
        </Button>

        <Separator className="mb-5" />

        {/* Store Assignments */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground">Store Assignments</h3>
          {group.products.map(p => {
            const storeName = storeMap.get(p.store_id) || "Unknown";
            const packs = getProductPacks(p.id);
            return (
              <div key={p.id} className="border border-border/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StoreIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{storeName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      title="Copy pricing to all stores"
                      onClick={() => copyPricingFromStore(p.id)}
                    >
                      {copiedStore === p.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    {p.is_hidden ? <EyeOff className="h-3 w-3 text-muted-foreground" /> : <Eye className="h-3 w-3 text-emerald-500" />}
                    <span className="text-muted-foreground">Visible</span>
                    <Switch
                      checked={!p.is_hidden}
                      onCheckedChange={() => toggleVisibility(p.id, p.is_hidden)}
                      className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {p.in_stock ? <PackageCheck className="h-3 w-3 text-emerald-500" /> : <PackageX className="h-3 w-3 text-red-500" />}
                    <span className="text-muted-foreground">In Stock</span>
                    <Switch
                      checked={p.in_stock}
                      onCheckedChange={() => toggleStock(p.id, p.in_stock)}
                      className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                    />
                  </div>
                </div>

                {packs.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {packs.map(pp => (
                      <Badge key={pp.id} variant="secondary" className="text-[10px] h-5 font-normal">
                        {pp.pack_size}: ${pp.price.toFixed(2)}
                      </Badge>
                    ))}
                  </div>
                )}
                {packs.length === 0 && (
                  <p className="text-[11px] text-muted-foreground italic">No pricing set</p>
                )}
              </div>
            );
          })}

          {/* Unassigned stores */}
          {stores.filter(s => !assignedStoreIds.has(s.id)).length > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground mb-2">
                Not assigned to {stores.filter(s => !assignedStoreIds.has(s.id)).length} store(s)
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ProductDetailDrawer;
