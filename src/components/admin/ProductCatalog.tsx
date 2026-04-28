import { useEffect, useState, useMemo, useRef } from "react";
import { Plus, Search, Package, Trash2, Upload, Image as ImageIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { processProductImage } from "@/utils/imageProcessor";
import type { Database } from "@/integrations/supabase/types";

type ProductCategory = Database["public"]["Enums"]["product_category"];

interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  image_url: string | null;
  store_id: string;
  in_stock: boolean;
  is_hidden: boolean | null;
  description: string | null;
}

interface ProductGroup {
  name: string;
  category: ProductCategory;
  image_url: string | null;
  description: string | null;
  storeCount: number;
  products: Product[];
  variantCount: number;
}

interface Props {
  onEdit: (name: string, category: string) => void;
}

const categories: ProductCategory[] = ["beer", "wine", "spirits", "smokes"];
const CATEGORY_EMOJI: Record<string, string> = {
  beer: "🍺", wine: "🍷", spirits: "🥃", smokes: "🚬",
};

const ProductCatalog = ({ onEdit }: Props) => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [packPriceCounts, setPackPriceCounts] = useState<Record<string, number>>({});
  const [stores, setStores] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<ProductGroup | null>(null);
  const [newProduct, setNewProduct] = useState({ name: "", category: "beer" as ProductCategory, description: "" });
  const [saving, setSaving] = useState(false);
  const imageUploadRef = useRef<HTMLInputElement>(null);
  const [uploadingGroup, setUploadingGroup] = useState<ProductGroup | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch all products in batches to avoid the 1000-row limit
    let allProducts: Product[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, category, image_url, store_id, in_stock, is_hidden, description")
        .order("name")
        .range(from, from + batchSize - 1);
      if (error || !data || data.length === 0) break;
      allProducts = allProducts.concat(data as Product[]);
      if (data.length < batchSize) break;
      from += batchSize;
    }

    const [storesRes, packsRes] = await Promise.all([
      supabase.from("stores").select("id, name").order("name"),
      supabase.from("product_pack_prices").select("product_id"),
    ]);
    setProducts(allProducts);
    setStores(storesRes.data || []);
    const counts: Record<string, number> = {};
    (packsRes.data || []).forEach((pp: any) => {
      counts[pp.product_id] = (counts[pp.product_id] || 0) + 1;
    });
    setPackPriceCounts(counts);
    setLoading(false);
  };

  const groups = useMemo(() => {
    const map: Record<string, ProductGroup> = {};
    products.forEach((p) => {
      const key = p.name.toLowerCase().trim();
      if (!map[key]) {
        map[key] = { name: p.name, category: p.category, image_url: p.image_url, description: p.description, storeCount: 0, products: [], variantCount: 0 };
      }
      map[key].products.push(p);
      map[key].storeCount = map[key].products.length;
      if (!map[key].image_url && p.image_url) map[key].image_url = p.image_url;
    });
    Object.values(map).forEach((g) => {
      g.variantCount = Math.max(0, ...g.products.map(p => packPriceCounts[p.id] || 0));
    });
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, packPriceCounts]);

  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchSearch = search === "" || g.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || g.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [groups, search, categoryFilter]);

  const handleCreate = async () => {
    if (!newProduct.name.trim()) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const allStoreIds = stores.map(s => s.id);
    const productsToInsert = allStoreIds.map(storeId => ({
      name: newProduct.name.trim(),
      category: newProduct.category,
      description: newProduct.description.trim() || null,
      price: 0,
      store_id: storeId,
      in_stock: true,
      is_hidden: false,
    }));
    const { error } = await supabase.from("products").insert(productsToInsert);
    if (error) {
      toast({ title: "Error", description: "Failed to create product", variant: "destructive" });
    } else {
      toast({ title: "Product created", description: `Added to ${allStoreIds.length} stores` });
      setCreateOpen(false);
      const createdName = newProduct.name.trim();
      const createdCategory = newProduct.category;
      setNewProduct({ name: "", category: "beer", description: "" });
      onEdit(createdName, createdCategory);
    }
    setSaving(false);
  };

  const handleDeleteGroup = async () => {
    if (!deletingGroup) return;
    setSaving(true);
    const ids = deletingGroup.products.map(p => p.id);
    await supabase.from("product_pack_prices").delete().in("product_id", ids);
    const { error } = await supabase.from("products").delete().in("id", ids);
    if (error) toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    else { toast({ title: `Deleted "${deletingGroup.name}"` }); fetchData(); }
    setDeleteOpen(false);
    setDeletingGroup(null);
    setSaving(false);
  };

  const handleGroupImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingGroup) { setUploadingGroup(null); return; }
    if (!file.type.startsWith("image/")) { toast({ title: "Invalid file", variant: "destructive" }); setUploadingGroup(null); return; }
    toast({ title: "Processing image", description: "Removing background..." });
    try {
      const blob = await processProductImage(file, () => {});
      const ext = blob.type === "image/webp" ? "webp" : "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("store-images").upload(`products/${fileName}`, blob, { contentType: blob.type || "image/jpeg" });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("store-images").getPublicUrl(`products/${fileName}`);
      const ids = uploadingGroup.products.map(p => p.id);
      await supabase.from("products").update({ image_url: publicUrl }).in("id", ids);
      toast({ title: "Image updated" });
      fetchData();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
    setUploadingGroup(null);
    e.target.value = "";
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-full bg-muted animate-pulse rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <input ref={imageUploadRef} type="file" accept="image/*" className="hidden" onChange={handleGroupImageUpload} />

      {/* Category Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[{ value: "all", label: "All", emoji: "📦" }, ...categories.map(cat => ({ value: cat, label: cat.charAt(0).toUpperCase() + cat.slice(1), emoji: CATEGORY_EMOJI[cat] }))].map(tab => (
          <button
            key={tab.value}
            onClick={() => setCategoryFilter(tab.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              categoryFilter === tab.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
        <div className="ml-auto flex gap-2 items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-9 w-[250px]" />
          </div>
          <Button onClick={() => setCreateOpen(true)} className="rounded-xl h-9 whitespace-nowrap">
            <Plus className="h-4 w-4 mr-1.5" />Add Product
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
        <span className="font-medium">{filtered.length} product{filtered.length !== 1 ? "s" : ""}</span>
        <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
        <span>{stores.length} store{stores.length !== 1 ? "s" : ""}</span>
        {(search || categoryFilter !== "all") && (
          <>
            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
            <button className="text-primary hover:underline" onClick={() => { setSearch(""); setCategoryFilter("all"); }}>Clear filters</button>
          </>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Package className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground font-medium">No products found</p>
            <p className="text-xs text-muted-foreground mt-1">{search ? "Try a different search" : "Add your first product"}</p>
            {!search && (
              <Button onClick={() => setCreateOpen(true)} variant="outline" className="mt-4 rounded-xl">
                <Plus className="h-4 w-4 mr-2" />Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filtered.map((group) => (
            <Card
              key={group.name}
              className="border-border/50 hover:shadow-lg hover:border-primary/20 transition-all cursor-pointer group overflow-hidden"
              onClick={() => onEdit(group.name, group.category)}
            >
              <div className="aspect-square bg-muted/30 relative overflow-hidden">
                {group.image_url ? (
                  <img src={group.image_url} alt={group.name} className="w-full h-full object-contain p-4" onError={(e) => { (e.target as HTMLImageElement).src = "/placeholder.svg"; }} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors" />
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-7 w-7 rounded-lg shadow-sm"
                    onClick={(e) => { e.stopPropagation(); setUploadingGroup(group); imageUploadRef.current?.click(); }}
                    title="Upload image"
                  >
                    <Upload className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-7 w-7 rounded-lg shadow-sm"
                    onClick={(e) => { e.stopPropagation(); setDeletingGroup(group); setDeleteOpen(true); }}
                    title="Delete product"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-3">
                <p className="font-semibold text-foreground text-sm truncate">{group.name}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Badge variant="outline" className="text-[10px] h-5 capitalize">{CATEGORY_EMOJI[group.category]} {group.category}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-2 text-[11px] text-muted-foreground">
                  <span>{group.storeCount} store{group.storeCount !== 1 ? "s" : ""}</span>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                  <span>{group.variantCount} size{group.variantCount !== 1 ? "s" : ""}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Product</DialogTitle>
            <DialogDescription>Create a new product across all stores.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input value={newProduct.name} onChange={(e) => setNewProduct(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Budweiser" />
            </div>
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={newProduct.category} onValueChange={(v) => setNewProduct(p => ({ ...p, category: v as ProductCategory }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_EMOJI[cat]} {cat.charAt(0).toUpperCase() + cat.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={newProduct.description} onChange={(e) => setNewProduct(p => ({ ...p, description: e.target.value }))} placeholder="Optional description" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create & Configure"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{deletingGroup?.name}" from all {deletingGroup?.storeCount} stores? This removes all variants and pricing. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete Everywhere
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductCatalog;
