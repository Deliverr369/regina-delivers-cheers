import { useState, useRef } from "react";
import {
  Image as ImageIcon, Upload, Eye, EyeOff, PackageCheck, PackageX,
  Copy, Check, Store as StoreIcon, ExternalLink,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  packsByProduct: Record<string, PackPrice[]>;
  onClose: () => void;
  onRefresh: () => void;
  onOpenEditor: (name: string, category: string) => void;
}

const ProductDetailDrawer = ({ group, stores, packsByProduct, onClose, onRefresh, onOpenEditor }: Props) => {
  const { toast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);
  const [copiedStore, setCopiedStore] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!group) return null;

  const storeMap = new Map(stores.map(s => [s.id, s.name]));
  const assignedStoreIds = new Set(group.products.map(p => p.store_id));
  const unassignedStores = stores.filter(s => !assignedStoreIds.has(s.id));

  const getProductPacks = (productId: string) =>
    (packsByProduct[productId] || []).filter(pp => !pp.is_hidden);

  // Collect all unique variant names across all stores
  const allVariantNames = new Set<string>();
  group.products.forEach(p => {
    (packsByProduct[p.id] || []).forEach(pp => allVariantNames.add(pp.pack_size));
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    toast({ title: "Processing image..." });
    try {
      const blob = await processProductImage(file, () => {});
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      await supabase.storage.from("store-images").upload(`products/${fileName}`, blob, { contentType: "image/jpeg" });
      const { data: { publicUrl } } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
      await supabase.from("products").update({ image_url: publicUrl }).in("id", group.products.map(p => p.id));
      toast({ title: "Image updated across all stores" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploading(false);
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
    const fromPacks = packsByProduct[fromProductId] || [];
    const otherProducts = group.products.filter(p => p.id !== fromProductId);
    for (const toProduct of otherProducts) {
      await supabase.from("product_pack_prices").delete().eq("product_id", toProduct.id);
      if (fromPacks.length > 0) {
        await supabase.from("product_pack_prices").insert(
          fromPacks.map(pp => ({ product_id: toProduct.id, pack_size: pp.pack_size, price: pp.price, is_hidden: pp.is_hidden }))
        );
      }
    }
    setCopiedStore(fromProductId);
    setTimeout(() => setCopiedStore(null), 2000);
    toast({ title: "Pricing synced to all stores" });
    onRefresh();
  };

  return (
    <Sheet open={!!group} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-0">
        <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

        {/* Header with image */}
        <div className="p-5 pb-0">
          <SheetHeader className="mb-4">
            <div className="flex items-start gap-4">
              <div
                className={`w-16 h-16 rounded-xl border border-border/30 overflow-hidden flex-shrink-0 cursor-pointer group relative ${
                  group.hasImage ? "bg-white" : "bg-muted/30"
                }`}
                onClick={() => imageRef.current?.click()}
              >
                {group.image_url ? (
                  <img src={group.image_url} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                  <Upload className="h-4 w-4 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-base leading-tight">{group.name}</SheetTitle>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="capitalize text-[10px] h-5 font-normal">
                    {CATEGORY_EMOJI[group.category]} {group.category}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                    {group.storeCount}/{group.totalStores} stores
                  </Badge>
                  <Badge variant="secondary" className="text-[10px] h-5 font-normal">
                    {group.variantCount} sizes
                  </Badge>
                </div>
                {group.description && (
                  <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{group.description}</p>
                )}
              </div>
            </div>
          </SheetHeader>

          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl text-xs mb-4"
            onClick={() => { onClose(); onOpenEditor(group.name, group.category); }}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1.5" />Open Full Product Editor
          </Button>
        </div>

        <Tabs defaultValue="stores" className="px-5 pb-6">
          <TabsList className="w-full h-9 mb-4 bg-muted/30">
            <TabsTrigger value="stores" className="flex-1 text-xs">Stores</TabsTrigger>
            <TabsTrigger value="variants" className="flex-1 text-xs">Variants</TabsTrigger>
            <TabsTrigger value="overview" className="flex-1 text-xs">Overview</TabsTrigger>
          </TabsList>

          {/* STORES TAB */}
          <TabsContent value="stores" className="space-y-2.5 mt-0">
            {group.products.map(p => {
              const storeName = storeMap.get(p.store_id) || "Unknown";
              const packs = getProductPacks(p.id);
              return (
                <div key={p.id} className="border border-border/40 rounded-xl p-3 hover:border-border/60 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StoreIcon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-sm">{storeName}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                      onClick={() => copyPricingFromStore(p.id)}
                    >
                      {copiedStore === p.id ? (
                        <><Check className="h-3 w-3 mr-1 text-emerald-500" />Copied</>
                      ) : (
                        <><Copy className="h-3 w-3 mr-1" />Copy to all</>
                      )}
                    </Button>
                  </div>

                  <div className="flex items-center gap-5 text-xs mb-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      {!p.is_hidden ? <Eye className="h-3 w-3 text-emerald-500" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                      <span className="text-muted-foreground">Visible</span>
                      <Switch
                        checked={!p.is_hidden}
                        onCheckedChange={() => toggleVisibility(p.id, p.is_hidden)}
                        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                      />
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      {p.in_stock ? <PackageCheck className="h-3 w-3 text-emerald-500" /> : <PackageX className="h-3 w-3 text-destructive" />}
                      <span className="text-muted-foreground">Stock</span>
                      <Switch
                        checked={p.in_stock}
                        onCheckedChange={() => toggleStock(p.id, p.in_stock)}
                        className="h-4 w-7 [&>span]:h-3 [&>span]:w-3"
                      />
                    </label>
                  </div>

                  {packs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {packs.map(pp => (
                        <Badge key={pp.id} variant="secondary" className="text-[10px] h-5 font-normal tabular-nums">
                          {pp.pack_size}: ${pp.price.toFixed(2)}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground/60 italic">No pricing set</p>
                  )}
                </div>
              );
            })}

            {unassignedStores.length > 0 && (
              <>
                <Separator className="my-3" />
                <p className="text-xs text-muted-foreground">
                  Not assigned to: {unassignedStores.map(s => s.name).join(", ")}
                </p>
              </>
            )}
          </TabsContent>

          {/* VARIANTS TAB */}
          <TabsContent value="variants" className="mt-0">
            {allVariantNames.size === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No variants configured</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Use the Product Editor to add pricing</p>
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from(allVariantNames).sort().map(variantName => {
                  const storesWithVariant = group.products.filter(p =>
                    (packsByProduct[p.id] || []).some(pp => pp.pack_size === variantName)
                  );
                  const prices = storesWithVariant.map(p =>
                    (packsByProduct[p.id] || []).find(pp => pp.pack_size === variantName)?.price || 0
                  );
                  const minPrice = Math.min(...prices);
                  const maxPrice = Math.max(...prices);
                  const hasDiff = maxPrice - minPrice > 0.01;

                  return (
                    <div key={variantName} className="border border-border/40 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-medium text-sm">{variantName}</span>
                        <div className="flex items-center gap-1.5">
                          {hasDiff ? (
                            <Badge variant="outline" className="text-[10px] h-5 font-normal tabular-nums">
                              ${minPrice.toFixed(2)} – ${maxPrice.toFixed(2)}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5 font-normal tabular-nums">
                              ${minPrice.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {group.products.map(p => {
                          const pack = (packsByProduct[p.id] || []).find(pp => pp.pack_size === variantName);
                          const storeName = storeMap.get(p.store_id) || "?";
                          return (
                            <Badge
                              key={p.id}
                              variant={pack ? "secondary" : "outline"}
                              className={`text-[10px] h-5 font-normal ${!pack ? "opacity-40 border-dashed" : ""}`}
                            >
                              {storeName.split(" ")[0]}: {pack ? `$${pack.price.toFixed(2)}` : "—"}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="mt-0">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Category</p>
                  <p className="text-sm font-medium capitalize">{CATEGORY_EMOJI[group.category]} {group.category}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Status</p>
                  <p className="text-sm font-medium">{group.isVisible ? "Active" : "Hidden"}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Stores</p>
                  <p className="text-sm font-medium">{group.storeCount} of {group.totalStores}</p>
                </div>
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Variants</p>
                  <p className="text-sm font-medium">{group.variantCount} sizes</p>
                </div>
              </div>
              {group.priceRange && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Price Range</p>
                  <p className="text-sm font-medium tabular-nums">
                    ${group.priceRange.min.toFixed(2)}
                    {group.hasPriceInconsistency && ` – $${group.priceRange.max.toFixed(2)}`}
                  </p>
                </div>
              )}
              {group.description && (
                <div className="p-3 rounded-xl bg-muted/20 border border-border/30">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Description</p>
                  <p className="text-sm">{group.description}</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

export default ProductDetailDrawer;
