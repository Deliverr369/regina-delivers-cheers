import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  ArrowLeft, Save, Trash2, Plus, Upload, Copy, Search,
  Store as StoreIcon, Package, Image as ImageIcon, Settings2,
  Check, X, Eye, EyeOff,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processProductImage } from "@/utils/imageProcessor";
import type { Database } from "@/integrations/supabase/types";

type ProductCategory = Database["public"]["Enums"]["product_category"];

const PACK_SIZES_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  beer: [
    { value: "1-tall", label: "1 Tall Can" },
    { value: "6-pack", label: "6 Pack" },
    { value: "8-pack", label: "8 Pack" },
    { value: "15-pack", label: "15 Pack" },
    { value: "24-pack", label: "24 Pack" },
    { value: "36-pack", label: "36 Pack" },
    { value: "48-pack", label: "48 Pack" },
  ],
  wine: [
    { value: "single-bottle", label: "Single Bottle" },
    { value: "2-pack", label: "2-Pack" },
    { value: "case-6", label: "Case of 6" },
    { value: "case-12", label: "Case of 12" },
  ],
  spirits: [
    { value: "single-bottle", label: "Single Bottle" },
    { value: "2-pack", label: "2-Pack" },
    { value: "case-6", label: "Case of 6" },
  ],
  ciders_seltzers: [
    { value: "single-can", label: "Single Can" },
    { value: "4-pack", label: "4 Pack" },
    { value: "6-pack", label: "6 Pack" },
    { value: "12-pack", label: "12 Pack" },
    { value: "24-pack", label: "24 Pack" },
  ],
  smokes: [],
};

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  size: string | null;
  category: ProductCategory;
  store_id: string;
  image_url: string | null;
  in_stock: boolean;
  is_hidden: boolean | null;
  display_order: number;
}

interface PackPrice {
  id: string;
  product_id: string;
  pack_size: string;
  price: number;
  is_hidden: boolean;
}

interface StoreInfo {
  id: string;
  name: string;
}

interface Props {
  productName: string;
  productCategory: string;
  onBack: () => void;
}

const ProductEditor = ({ productName, productCategory, onBack }: Props) => {
  const { toast } = useToast();
  const imageRef = useRef<HTMLInputElement>(null);

  // Core data
  const [currentName, setCurrentName] = useState(productName);
  const [products, setProducts] = useState<Product[]>([]);
  const [allStores, setAllStores] = useState<StoreInfo[]>([]);
  const [packPrices, setPackPrices] = useState<PackPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Template prices
  const [templatePrices, setTemplatePrices] = useState<Record<string, string>>({});
  const [newVariant, setNewVariant] = useState({ size: "", price: "" });

  // Matrix inline edits
  const [matrixEdits, setMatrixEdits] = useState<Record<string, string>>({});
  const [savingCell, setSavingCell] = useState<string | null>(null);

  // Store filter
  const [storeSearch, setStoreSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState<"all" | "assigned" | "unassigned">("all");

  // Edit details
  const [editDetailsOpen, setEditDetailsOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: "", description: "", category: "" as ProductCategory });

  // Delete confirmation
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Bulk price adjustment
  const [bulkPriceOpen, setBulkPriceOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState({ type: "set" as "set" | "increase_pct" | "increase_amt", value: "" });

  // Store detail sheet
  const [storeDetailId, setStoreDetailId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [productsRes, storesRes, packsRes] = await Promise.all([
      supabase.from("products").select("*").ilike("name", currentName).order("store_id"),
      supabase.from("stores").select("id, name").order("name"),
      supabase.from("product_pack_prices").select("*"),
    ]);
    const prods = (productsRes.data as Product[]) || [];
    setProducts(prods);
    setAllStores(storesRes.data || []);

    const prodIds = new Set(prods.map(p => p.id));
    const relevantPacks = ((packsRes.data as PackPrice[]) || []).filter(pp => prodIds.has(pp.product_id));
    setPackPrices(relevantPacks);

    // Initialize template from category defaults + first product's prices
    const categoryPacks = PACK_SIZES_BY_CATEGORY[productCategory] || [];
    const template: Record<string, string> = {};
    categoryPacks.forEach(p => { template[p.value] = ""; });
    if (prods.length > 0) {
      const firstPacks = relevantPacks.filter(pp => pp.product_id === prods[0].id);
      firstPacks.forEach(pp => { template[pp.pack_size] = pp.price.toString(); });
    }
    setTemplatePrices(template);
    setLoading(false);
  }, [currentName, productCategory]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // --- Derived data ---
  const storeProductMap = useMemo(() => {
    const map: Record<string, Product> = {};
    products.forEach(p => { map[p.store_id] = p; });
    return map;
  }, [products]);

  const productPacksMap = useMemo(() => {
    const map: Record<string, PackPrice[]> = {};
    packPrices.forEach(pp => {
      if (!map[pp.product_id]) map[pp.product_id] = [];
      map[pp.product_id].push(pp);
    });
    return map;
  }, [packPrices]);

  const variantColumns = useMemo(() => {
    const categoryPacks = PACK_SIZES_BY_CATEGORY[productCategory] || [];
    const standardSizes = categoryPacks.map(p => p.value);
    const customSizes = new Set<string>();
    packPrices.forEach(pp => {
      if (!standardSizes.includes(pp.pack_size)) customSizes.add(pp.pack_size);
    });
    Object.keys(templatePrices).forEach(size => {
      if (!standardSizes.includes(size) && !customSizes.has(size)) customSizes.add(size);
    });
    return [...standardSizes, ...Array.from(customSizes)];
  }, [productCategory, packPrices, templatePrices]);

  const variantLabel = (size: string) => {
    const categoryPacks = PACK_SIZES_BY_CATEGORY[productCategory] || [];
    return categoryPacks.find(p => p.value === size)?.label || size;
  };

  const productInfo = products[0];
  const assignedStoreIds = useMemo(() => new Set(products.map(p => p.store_id)), [products]);

  const filteredStores = useMemo(() => {
    return allStores.filter(s => {
      const matchSearch = storeSearch === "" || s.name.toLowerCase().includes(storeSearch.toLowerCase());
      const isAssigned = assignedStoreIds.has(s.id);
      const matchFilter = storeFilter === "all" || (storeFilter === "assigned" && isAssigned) || (storeFilter === "unassigned" && !isAssigned);
      return matchSearch && matchFilter;
    });
  }, [allStores, storeSearch, storeFilter, assignedStoreIds]);

  const storeDetailProduct = storeDetailId ? storeProductMap[storeDetailId] : null;
  const storeDetailPacks = storeDetailProduct ? (productPacksMap[storeDetailProduct.id] || []) : [];
  const storeDetailName = storeDetailId ? allStores.find(s => s.id === storeDetailId)?.name : null;

  // --- Handlers ---
  const assignStore = async (storeId: string) => {
    if (!productInfo) return;
    setSaving(true);
    const { data: newProd, error } = await supabase.from("products").insert({
      name: productInfo.name,
      category: productInfo.category,
      description: productInfo.description,
      price: productInfo.price,
      size: productInfo.size,
      store_id: storeId,
      image_url: productInfo.image_url,
      in_stock: true,
      is_hidden: false,
    }).select().single();

    if (error) {
      toast({ title: "Error", description: "Failed to assign store", variant: "destructive" });
    } else if (newProd) {
      const templateEntries = Object.entries(templatePrices).filter(([, price]) => price && !isNaN(parseFloat(price)));
      if (templateEntries.length > 0) {
        await supabase.from("product_pack_prices").insert(
          templateEntries.map(([pack_size, price]) => ({
            product_id: newProd.id,
            pack_size,
            price: parseFloat(price),
            is_hidden: false,
          }))
        );
      }
      toast({ title: "Store assigned" });
      fetchData();
    }
    setSaving(false);
  };

  const unassignStore = async (storeId: string) => {
    const product = storeProductMap[storeId];
    if (!product) return;
    setSaving(true);
    await supabase.from("product_pack_prices").delete().eq("product_id", product.id);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) toast({ title: "Error", description: "Failed to unassign", variant: "destructive" });
    else { toast({ title: "Store unassigned" }); fetchData(); }
    setSaving(false);
  };

  const handleMatrixSave = async (productId: string, packSize: string) => {
    const cellKey = `${productId}-${packSize}`;
    const rawValue = matrixEdits[cellKey];
    if (rawValue === undefined) return;

    setSavingCell(cellKey);
    const existing = packPrices.find(pp => pp.product_id === productId && pp.pack_size === packSize);

    if (rawValue === "") {
      if (existing) await supabase.from("product_pack_prices").delete().eq("id", existing.id);
    } else {
      const newPrice = parseFloat(rawValue);
      if (isNaN(newPrice) || newPrice < 0) {
        toast({ title: "Invalid price", variant: "destructive" });
        setSavingCell(null);
        return;
      }
      if (existing) {
        await supabase.from("product_pack_prices").update({ price: newPrice }).eq("id", existing.id);
      } else {
        await supabase.from("product_pack_prices").insert({
          product_id: productId,
          pack_size: packSize,
          price: newPrice,
          is_hidden: false,
        });
      }
    }

    setMatrixEdits(prev => { const n = { ...prev }; delete n[cellKey]; return n; });
    setSavingCell(null);
    fetchData();
  };

  const applyTemplateToAll = async () => {
    if (products.length === 0) return;
    setSaving(true);
    const templateEntries = Object.entries(templatePrices).filter(([, price]) => price && !isNaN(parseFloat(price)));

    for (const product of products) {
      await supabase.from("product_pack_prices").delete().eq("product_id", product.id);
      if (templateEntries.length > 0) {
        await supabase.from("product_pack_prices").insert(
          templateEntries.map(([pack_size, price]) => ({
            product_id: product.id,
            pack_size,
            price: parseFloat(price),
            is_hidden: false,
          }))
        );
      }
    }

    toast({ title: "Template applied", description: `Updated ${products.length} store(s)` });
    fetchData();
    setSaving(false);
  };

  const addTemplateVariant = () => {
    if (!newVariant.size.trim()) return;
    setTemplatePrices(prev => ({ ...prev, [newVariant.size.trim()]: newVariant.price || "" }));
    setNewVariant({ size: "", price: "" });
  };

  const removeTemplateVariant = (size: string) => {
    setTemplatePrices(prev => { const n = { ...prev }; delete n[size]; return n; });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast({ title: "Processing image..." });
    try {
      const blob = await processProductImage(file, () => {});
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const { error: uploadError } = await supabase.storage.from("store-images").upload(`products/${fileName}`, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
      const ids = products.map(p => p.id);
      await supabase.from("products").update({ image_url: publicUrl }).in("id", ids);
      toast({ title: "Image updated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    e.target.value = "";
  };

  const handleUpdateDetails = async () => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    const ids = products.map(p => p.id);
    const { error } = await supabase.from("products").update({
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      category: editForm.category,
    }).in("id", ids);
    if (error) toast({ title: "Error", variant: "destructive" });
    else {
      toast({ title: "Product updated" });
      setEditDetailsOpen(false);
      setCurrentName(editForm.name.trim());
    }
    setSaving(false);
  };

  const handleDeleteAll = async () => {
    setSaving(true);
    const ids = products.map(p => p.id);
    await supabase.from("product_pack_prices").delete().in("product_id", ids);
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) toast({ title: "Error", variant: "destructive" });
    else { toast({ title: "Product deleted" }); onBack(); }
    setSaving(false);
  };

  const handleBulkAssignAll = async () => {
    const unassigned = allStores.filter(s => !assignedStoreIds.has(s.id));
    if (unassigned.length === 0) return;
    setSaving(true);
    for (const store of unassigned) {
      if (!productInfo) continue;
      const { data: newProd } = await supabase.from("products").insert({
        name: productInfo.name,
        category: productInfo.category,
        description: productInfo.description,
        price: productInfo.price,
        size: productInfo.size,
        store_id: store.id,
        image_url: productInfo.image_url,
        in_stock: true,
        is_hidden: false,
      }).select().single();
      if (newProd) {
        const templateEntries = Object.entries(templatePrices).filter(([, price]) => price && !isNaN(parseFloat(price)));
        if (templateEntries.length > 0) {
          await supabase.from("product_pack_prices").insert(
            templateEntries.map(([pack_size, price]) => ({
              product_id: newProd.id,
              pack_size,
              price: parseFloat(price),
              is_hidden: false,
            }))
          );
        }
      }
    }
    toast({ title: "All stores assigned", description: `Added ${unassigned.length} store(s)` });
    fetchData();
    setSaving(false);
  };

  const copyStoreConfig = async (fromStoreId: string) => {
    const fromProduct = storeProductMap[fromStoreId];
    if (!fromProduct) return;
    const fromPacks = productPacksMap[fromProduct.id] || [];
    setSaving(true);
    const otherProducts = products.filter(p => p.store_id !== fromStoreId);
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
    toast({ title: "Prices copied", description: `Applied to ${otherProducts.length} other store(s)` });
    fetchData();
    setSaving(false);
  };

  const handleBulkPrice = async () => {
    if (!bulkAction.value) return;
    setSaving(true);
    const val = parseFloat(bulkAction.value);
    if (isNaN(val)) { toast({ title: "Invalid value", variant: "destructive" }); setSaving(false); return; }

    for (const pp of packPrices) {
      let newPrice = pp.price;
      if (bulkAction.type === "set") newPrice = val;
      else if (bulkAction.type === "increase_pct") newPrice = pp.price * (1 + val / 100);
      else if (bulkAction.type === "increase_amt") newPrice = pp.price + val;
      newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
      await supabase.from("product_pack_prices").update({ price: newPrice }).eq("id", pp.id);
    }

    toast({ title: "Prices updated" });
    setBulkPriceOpen(false);
    fetchData();
    setSaving(false);
  };

  const handleToggleStoreVisibility = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    await supabase.from("products").update({ is_hidden: !product.is_hidden }).eq("id", productId);
    fetchData();
  };

  const handleToggleStoreStock = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    await supabase.from("products").update({ in_stock: !product.in_stock }).eq("id", productId);
    fetchData();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="h-28 bg-muted animate-pulse rounded-xl" />
        <div className="h-48 bg-muted animate-pulse rounded-xl" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Back */}
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Catalog
      </Button>

      {/* ====== PRODUCT HEADER ====== */}
      <Card className="border-border/50 mb-5">
        <CardContent className="p-5">
          <div className="flex gap-5 items-start">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-muted/50 flex-shrink-0 overflow-hidden cursor-pointer group relative border border-border/50"
              onClick={() => imageRef.current?.click()}
            >
              {productInfo?.image_url ? (
                <img src={productInfo.image_url} alt={currentName} className="w-full h-full object-contain p-2" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/20" />
                </div>
              )}
              <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/10 transition-colors flex items-center justify-center">
                <Upload className="h-5 w-5 text-foreground/0 group-hover:text-foreground/60 transition-colors" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">{productInfo?.name || currentName}</h2>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className="capitalize text-xs">
                      {productCategory === "beer" ? "🍺" : productCategory === "wine" ? "🍷" : productCategory === "spirits" ? "🥃" : "🚬"} {productCategory}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {products.length}/{allStores.length} stores
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {Object.values(templatePrices).filter(v => v).length} variants
                    </Badge>
                  </div>
                  {productInfo?.description && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{productInfo.description}</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    onClick={() => {
                      setEditForm({
                        name: productInfo?.name || currentName,
                        description: productInfo?.description || "",
                        category: (productInfo?.category || productCategory) as ProductCategory,
                      });
                      setEditDetailsOpen(true);
                    }}
                  >
                    <Settings2 className="h-3 w-3 mr-1.5" />Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="h-3 w-3 mr-1.5" />Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== VARIANT TEMPLATE ====== */}
      <Card className="border-border/50 mb-5">
        <CardHeader className="pb-3 px-5 pt-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Variant Template
              <span className="text-[11px] font-normal text-muted-foreground">Default prices for new store assignments</span>
            </CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs h-7"
                onClick={() => setBulkPriceOpen(true)}
              >
                Bulk Adjust
              </Button>
              <Button
                size="sm"
                variant="default"
                className="rounded-lg text-xs h-7"
                onClick={applyTemplateToAll}
                disabled={saving || products.length === 0}
              >
                <Copy className="h-3 w-3 mr-1.5" />Apply to All Stores
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-2">
            {variantColumns.map(size => (
              <div key={size} className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/30 transition-colors">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground truncate">{variantLabel(size)}</span>
                  {!(PACK_SIZES_BY_CATEGORY[productCategory] || []).find(p => p.value === size) && (
                    <button onClick={() => removeTemplateVariant(size)} className="text-muted-foreground/50 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    className="h-7 text-sm flex-1"
                    value={templatePrices[size] || ""}
                    onChange={(e) => setTemplatePrices(prev => ({ ...prev, [size]: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
            ))}
            {/* Add custom variant */}
            <div className="flex flex-col gap-1.5 p-2.5 rounded-lg border border-dashed border-primary/30 bg-primary/5">
              <Input
                className="h-6 text-[11px] border-0 bg-transparent p-0 focus-visible:ring-0"
                value={newVariant.size}
                onChange={(e) => setNewVariant(v => ({ ...v, size: e.target.value }))}
                placeholder="Custom size..."
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">$</span>
                <Input
                  type="number"
                  step="0.01"
                  className="h-7 text-sm flex-1"
                  value={newVariant.price}
                  onChange={(e) => setNewVariant(v => ({ ...v, price: e.target.value }))}
                  placeholder="0.00"
                  onKeyDown={(e) => { if (e.key === "Enter") addTemplateVariant(); }}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0" onClick={addTemplateVariant}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ====== STORE ASSIGNMENT MATRIX ====== */}
      <Card className="border-border/50">
        <CardHeader className="pb-3 px-5 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <StoreIcon className="h-4 w-4 text-primary" />
              Store Assignments
              <Badge variant="secondary" className="text-[10px] ml-1">{products.length}/{allStores.length}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input className="h-7 text-xs pl-7 w-36" placeholder="Search stores..." value={storeSearch} onChange={(e) => setStoreSearch(e.target.value)} />
              </div>
              <Select value={storeFilter} onValueChange={(v: any) => setStoreFilter(v)}>
                <SelectTrigger className="h-7 w-[110px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>
              {allStores.length > products.length && (
                <Button size="sm" variant="outline" className="h-7 text-xs rounded-lg" onClick={handleBulkAssignAll} disabled={saving}>
                  <Plus className="h-3 w-3 mr-1" />Assign All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-border/50 bg-muted/30">
                  <th className="text-left px-4 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider sticky left-0 bg-muted/30 z-10 min-w-[200px]">
                    Store
                  </th>
                  <th className="text-center px-2 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider w-16">
                    Active
                  </th>
                  {variantColumns.map(size => (
                    <th key={size} className="text-center px-1 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider min-w-[85px]">
                      {variantLabel(size)}
                    </th>
                  ))}
                  <th className="w-20 text-center px-2 py-2.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredStores.length === 0 ? (
                  <tr>
                    <td colSpan={variantColumns.length + 3} className="text-center py-12 text-sm text-muted-foreground">
                      <StoreIcon className="h-8 w-8 mx-auto mb-2 text-muted-foreground/20" />
                      No stores found
                    </td>
                  </tr>
                ) : (
                  filteredStores.map((store, idx) => {
                    const product = storeProductMap[store.id];
                    const isAssigned = !!product;
                    const storePacks = product ? (productPacksMap[product.id] || []) : [];
                    const isHidden = product?.is_hidden;

                    return (
                      <tr
                        key={store.id}
                        className={`border-b border-border/20 transition-colors ${
                          idx % 2 === 0 ? "bg-background" : "bg-muted/10"
                        } ${!isAssigned ? "opacity-40" : ""} ${isHidden ? "opacity-60" : ""} hover:bg-muted/30`}
                      >
                        <td className="px-4 py-2 sticky left-0 z-10 bg-inherit">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <StoreIcon className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-foreground text-sm truncate block">{store.name}</span>
                              {isAssigned && (
                                <span className="text-[10px] text-muted-foreground">
                                  {storePacks.length} size{storePacks.length !== 1 ? "s" : ""}
                                  {isHidden ? " · Hidden" : ""}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-2 text-center">
                          <Switch
                            checked={isAssigned}
                            onCheckedChange={(checked) => {
                              if (checked) assignStore(store.id);
                              else unassignStore(store.id);
                            }}
                            disabled={saving}
                          />
                        </td>
                        {variantColumns.map(size => {
                          if (!isAssigned) {
                            return <td key={size} className="px-1 py-2 text-center text-muted-foreground/20 text-xs">—</td>;
                          }
                          const pack = storePacks.find(p => p.pack_size === size);
                          const cellKey = `${product!.id}-${size}`;
                          const editValue = matrixEdits[cellKey];
                          const isSaving = savingCell === cellKey;

                          return (
                            <td key={size} className="px-1 py-1">
                              <div className="flex items-center justify-center">
                                <div className="relative">
                                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">$</span>
                                  <Input
                                    type="number"
                                    step="0.01"
                                    className={`h-7 w-[72px] text-xs text-center pl-4 ${isSaving ? "opacity-50" : ""} ${pack?.is_hidden ? "line-through opacity-40" : ""}`}
                                    value={editValue ?? (pack?.price !== undefined ? pack.price.toFixed(2) : "")}
                                    onChange={(e) => setMatrixEdits(prev => ({ ...prev, [cellKey]: e.target.value }))}
                                    onBlur={() => { if (editValue !== undefined) handleMatrixSave(product!.id, size); }}
                                    onKeyDown={(e) => { if (e.key === "Enter") handleMatrixSave(product!.id, size); }}
                                    placeholder="—"
                                    disabled={isSaving}
                                  />
                                </div>
                              </div>
                            </td>
                          );
                        })}
                        <td className="px-2 py-2">
                          {isAssigned && (
                            <div className="flex items-center justify-center gap-0.5">
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                title="Copy prices to all other stores"
                                onClick={() => copyStoreConfig(store.id)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                title={isHidden ? "Show on storefront" : "Hide from storefront"}
                                onClick={() => handleToggleStoreVisibility(product!.id)}
                              >
                                {isHidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                              </Button>
                              <Button
                                variant="ghost" size="icon" className="h-6 w-6"
                                title="Store details"
                                onClick={() => setStoreDetailId(store.id)}
                              >
                                <Settings2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* ====== STORE DETAIL SHEET ====== */}
      <Sheet open={!!storeDetailId} onOpenChange={(open) => { if (!open) setStoreDetailId(null); }}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <StoreIcon className="h-4 w-4 text-primary" />
              {storeDetailName}
            </SheetTitle>
            <SheetDescription>Manage store-specific settings for {currentName}</SheetDescription>
          </SheetHeader>
          {storeDetailProduct && (
            <div className="mt-6 space-y-6">
              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">Visible on Storefront</p>
                    <p className="text-xs text-muted-foreground">Show this product to customers</p>
                  </div>
                  <Switch checked={!storeDetailProduct.is_hidden} onCheckedChange={() => handleToggleStoreVisibility(storeDetailProduct.id)} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium text-foreground">In Stock</p>
                    <p className="text-xs text-muted-foreground">Mark as available for purchase</p>
                  </div>
                  <Switch checked={storeDetailProduct.in_stock} onCheckedChange={() => handleToggleStoreStock(storeDetailProduct.id)} />
                </div>
              </div>

              <Separator />

              {/* Pack Prices */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" />
                  Size Pricing
                </h4>
                <div className="space-y-2">
                  {variantColumns.map(size => {
                    const pack = storeDetailPacks.find(p => p.pack_size === size);
                    const cellKey = `${storeDetailProduct.id}-${size}`;
                    const editValue = matrixEdits[cellKey];
                    return (
                      <div key={size} className="flex items-center justify-between p-2.5 rounded-lg border border-border/50 bg-background">
                        <span className="text-sm text-foreground">{variantLabel(size)}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            className="h-7 w-24 text-sm text-right"
                            value={editValue ?? (pack?.price !== undefined ? pack.price.toFixed(2) : "")}
                            onChange={(e) => setMatrixEdits(prev => ({ ...prev, [cellKey]: e.target.value }))}
                            onBlur={() => { if (editValue !== undefined) handleMatrixSave(storeDetailProduct.id, size); }}
                            onKeyDown={(e) => { if (e.key === "Enter") handleMatrixSave(storeDetailProduct.id, size); }}
                            placeholder="Not set"
                          />
                          {pack && (
                            <Button
                              variant="ghost" size="icon" className="h-7 w-7"
                              onClick={async () => {
                                await supabase.from("product_pack_prices").update({ is_hidden: !pack.is_hidden }).eq("id", pack.id);
                                fetchData();
                              }}
                              title={pack.is_hidden ? "Show size" : "Hide size"}
                            >
                              {pack.is_hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm"
                  onClick={() => { copyStoreConfig(storeDetailId!); setStoreDetailId(null); }}
                >
                  <Copy className="h-4 w-4 mr-2" />Copy these prices to all other stores
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-sm text-destructive hover:text-destructive"
                  onClick={() => { unassignStore(storeDetailId!); setStoreDetailId(null); }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />Remove from this store
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ====== EDIT DETAILS DIALOG ====== */}
      <Dialog open={editDetailsOpen} onOpenChange={setEditDetailsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit Product Details</DialogTitle>
            <DialogDescription>Update name, category, and description across all stores.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product Name</Label>
              <Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editForm.category} onValueChange={(v) => setEditForm(f => ({ ...f, category: v as ProductCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["beer", "wine", "spirits", "smokes"] as ProductCategory[]).map(cat => (
                    <SelectItem key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDetailsOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateDetails} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== DELETE CONFIRMATION ====== */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product Everywhere</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete "{currentName}" from all {products.length} stores including all variants and pricing. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Everywhere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ====== BULK PRICE DIALOG ====== */}
      <Dialog open={bulkPriceOpen} onOpenChange={setBulkPriceOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Bulk Price Adjustment</DialogTitle>
            <DialogDescription>Adjust all variant prices across all stores.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Action</Label>
              <Select value={bulkAction.type} onValueChange={(v: any) => setBulkAction(a => ({ ...a, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="set">Set all to fixed price</SelectItem>
                  <SelectItem value="increase_pct">Increase by %</SelectItem>
                  <SelectItem value="increase_amt">Increase by $</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{bulkAction.type === "increase_pct" ? "Percentage" : "Amount ($)"}</Label>
              <Input
                type="number"
                step="0.01"
                value={bulkAction.value}
                onChange={(e) => setBulkAction(a => ({ ...a, value: e.target.value }))}
                placeholder={bulkAction.type === "increase_pct" ? "e.g. 10" : "e.g. 5.00"}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkPriceOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkPrice} disabled={saving}>{saving ? "Applying..." : "Apply"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProductEditor;
