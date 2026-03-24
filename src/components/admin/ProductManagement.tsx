import { useEffect, useState, useRef, useMemo } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Upload, X, Image as ImageIcon, Loader2, ChevronDown, ChevronRight, Save, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { processProductImage } from "@/utils/imageProcessor";

type ProductCategory = Database["public"]["Enums"]["product_category"];

const PACK_SIZES_BY_CATEGORY = {
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
  smokes: [] as { value: string; label: string }[],
};

interface Store {
  id: string;
  name: string;
}

interface ProductPackPrice {
  id: string;
  product_id: string;
  pack_size: string;
  price: number;
  is_hidden: boolean;
}

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
  is_hidden: boolean;
}

interface PackPrice {
  pack_size: string;
  price: string;
  is_hidden: boolean;
}

interface CustomSizePrice {
  id: string;
  size: string;
  price: string;
  is_hidden: boolean;
}

interface ProductFormData {
  name: string;
  description: string;
  price: string;
  size: string;
  category: ProductCategory;
  store_id: string;
  image_url: string;
  in_stock: boolean;
  is_hidden: boolean;
  packPrices: PackPrice[];
  customSizes: CustomSizePrice[];
}

const getInitialPackPrices = (category: ProductCategory): PackPrice[] => {
  return PACK_SIZES_BY_CATEGORY[category].map((size) => ({
    pack_size: size.value,
    price: "",
    is_hidden: false,
  }));
};

const initialFormData: ProductFormData = {
  name: "",
  description: "",
  price: "",
  size: "",
  category: "beer",
  store_id: "",
  image_url: "",
  in_stock: true,
  is_hidden: false,
  packPrices: getInitialPackPrices("beer"),
  customSizes: [],
};

const categories: ProductCategory[] = ["beer", "wine", "spirits", "smokes"];

const ProductManagement = () => {
  const { toast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [selectedStore, setSelectedStore] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [uploading, setUploading] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);
  const [packPricesMap, setPackPricesMap] = useState<Record<string, ProductPackPrice[]>>({});
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [inlineEditing, setInlineEditing] = useState<Record<string, string>>({});
  const [savingInline, setSavingInline] = useState<string | null>(null);
  const [inlinePackEditing, setInlinePackEditing] = useState<Record<string, string>>({});
  const [savingPackInline, setSavingPackInline] = useState<string | null>(null);

  useEffect(() => {
    fetchStores();
    fetchProducts();
    fetchPackPrices();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch stores",
        variant: "destructive",
      });
    } else {
      setStores(data || []);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } else {
      setProducts((data as Product[]) || []);
    }
    setLoading(false);
  };

  const handleOpenCreate = () => {
    setEditingProduct(null);
    const category = "beer" as ProductCategory;
    setFormData({
      ...initialFormData,
      store_id: selectedStore !== "all" ? selectedStore : "",
      packPrices: getInitialPackPrices(category),
    });
    setImagePreview(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = async (product: Product) => {
    setEditingProduct(product);
    
    // Fetch existing pack prices
    let packPrices = getInitialPackPrices(product.category);
    let customSizes: CustomSizePrice[] = [];
    
    const { data: existingPrices } = await supabase
      .from("product_pack_prices")
      .select("pack_size, price, is_hidden")
      .eq("product_id", product.id);
    
    if (existingPrices) {
      // Separate predefined pack sizes from custom sizes
      const predefinedSizes = PACK_SIZES_BY_CATEGORY[product.category].map(s => s.value);
      
      packPrices = packPrices.map(p => {
        const existing = existingPrices.find(ep => ep.pack_size === p.pack_size);
        return existing 
          ? { ...p, price: existing.price.toString(), is_hidden: existing.is_hidden ?? false } 
          : p;
      });
      
      // Get custom sizes (those not in predefined list)
      customSizes = existingPrices
        .filter(ep => !predefinedSizes.includes(ep.pack_size))
        .map(ep => ({
          id: crypto.randomUUID(),
          size: ep.pack_size,
          price: ep.price.toString(),
          is_hidden: ep.is_hidden ?? false,
        }));
    }
    
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      size: product.size || "",
      category: product.category,
      store_id: product.store_id,
      image_url: product.image_url || "",
      in_stock: product.in_stock ?? true,
      is_hidden: product.is_hidden ?? false,
      packPrices,
      customSizes,
    });
    setImagePreview(product.image_url || null);
    setDialogOpen(true);
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 10MB for processing)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setProcessingStatus("Initializing...");

    try {
      // Process image: remove background and add white background
      const processedBlob = await processProductImage(file, (status) => {
        setProcessingStatus(status);
      });

      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const filePath = `products/${fileName}`;

      setProcessingStatus("Uploading...");

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(filePath, processedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('store-images')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
      
      toast({
        title: "Success",
        description: "Image processed and uploaded successfully",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process and upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setProcessingStatus("");
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQuickUploadClick = (productId: string) => {
    setUploadingProductId(productId);
    quickUploadRef.current?.click();
  };

  const handleQuickImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadingProductId) {
      setUploadingProductId(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      });
      setUploadingProductId(null);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 10MB",
        variant: "destructive",
      });
      setUploadingProductId(null);
      return;
    }

    toast({
      title: "Processing image",
      description: "Removing background and optimizing...",
    });

    try {
      // Process image: remove background and add white background
      const processedBlob = await processProductImage(file, (status) => {
        console.log('Processing:', status);
      });

      // Generate unique filename
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.jpg`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(filePath, processedBlob, {
          contentType: 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('store-images')
        .getPublicUrl(filePath);

      // Update product in database
      const { error: updateError } = await supabase
        .from('products')
        .update({ image_url: publicUrl })
        .eq('id', uploadingProductId);

      if (updateError) {
        throw updateError;
      }

      // Refresh products list
      fetchProducts();
      
      toast({
        title: "Success",
        description: "Product image processed and updated",
      });
    } catch (error: any) {
      console.error('Quick upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process and upload image",
        variant: "destructive",
      });
    } finally {
      setUploadingProductId(null);
      // Reset file input
      if (quickUploadRef.current) {
        quickUploadRef.current.value = '';
      }
    }
  };

  const handleOpenDelete = (product: Product) => {
    setDeletingProduct(product);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.store_id) {
      toast({
        title: "Validation Error",
        description: "Please select a store",
        variant: "destructive",
      });
      return;
    }

    if (!formData.price || isNaN(parseFloat(formData.price))) {
      toast({
        title: "Validation Error",
        description: "Valid price is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const productData = {
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      price: parseFloat(formData.price),
      size: formData.size.trim() || null,
      category: formData.category,
      store_id: formData.store_id,
      image_url: formData.image_url.trim() || null,
      in_stock: formData.in_stock,
      is_hidden: formData.is_hidden,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update product",
          variant: "destructive",
        });
      } else {
        // Save pack prices and custom sizes
        await savePackPrices(editingProduct.id);
        toast({
          title: "Success",
          description: "Product updated successfully",
        });
        setDialogOpen(false);
        fetchProducts();
      }
    } else {
      const { data: newProduct, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create product",
          variant: "destructive",
        });
      } else {
        // Save pack prices and custom sizes
        if (newProduct) {
          await savePackPrices(newProduct.id);
        }
        toast({
          title: "Success",
          description: "Product created successfully",
        });
        setDialogOpen(false);
        fetchProducts();
      }
    }

    setSaving(false);
  };

  const savePackPrices = async (productId: string) => {
    // Delete existing prices for this product
    await supabase
      .from("product_pack_prices")
      .delete()
      .eq("product_id", productId);
    
    // Combine predefined pack prices and custom sizes
    // Include entries with price OR that are hidden (to track hidden state)
    const predefinedPrices = formData.packPrices
      .filter(p => (p.price && !isNaN(parseFloat(p.price))) || p.is_hidden)
      .map(p => ({
        product_id: productId,
        pack_size: p.pack_size,
        price: p.price ? parseFloat(p.price) : 0,
        is_hidden: p.is_hidden,
      }));
    
    const customPrices = formData.customSizes
      .filter(cs => cs.size.trim() && ((cs.price && !isNaN(parseFloat(cs.price))) || cs.is_hidden))
      .map(cs => ({
        product_id: productId,
        pack_size: cs.size.trim(),
        price: cs.price ? parseFloat(cs.price) : 0,
        is_hidden: cs.is_hidden,
      }));
    
    const allPrices = [...predefinedPrices, ...customPrices];
    
    if (allPrices.length > 0) {
      await supabase
        .from("product_pack_prices")
        .insert(allPrices);
    }
  };

  const updatePackPrice = (packSize: string, field: "price" | "is_hidden", value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      packPrices: prev.packPrices.map(p =>
        p.pack_size === packSize ? { ...p, [field]: value } : p
      ),
    }));
  };

  const handleCategoryChange = (category: ProductCategory) => {
    setFormData(prev => ({
      ...prev,
      category,
      packPrices: getInitialPackPrices(category),
    }));
  };

  const addCustomSize = () => {
    setFormData(prev => ({
      ...prev,
      customSizes: [
        ...prev.customSizes,
        { id: crypto.randomUUID(), size: "", price: "", is_hidden: false }
      ],
    }));
  };

  const updateCustomSize = (id: string, field: "size" | "price" | "is_hidden", value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      customSizes: prev.customSizes.map(cs =>
        cs.id === id ? { ...cs, [field]: value } : cs
      ),
    }));
  };

  const removeCustomSize = (id: string) => {
    setFormData(prev => ({
      ...prev,
      customSizes: prev.customSizes.filter(cs => cs.id !== id),
    }));
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", deletingProduct.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
      fetchProducts();
    }

    setDeleteDialogOpen(false);
    setDeletingProduct(null);
  };

  const handleToggleHidden = async (product: Product) => {
    const { error } = await supabase
      .from("products")
      .update({ is_hidden: !product.is_hidden })
      .eq("id", product.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update product visibility",
        variant: "destructive",
      });
    } else {
      fetchProducts();
    }
  };

  const getStoreName = (storeId: string) => {
    return stores.find((s) => s.id === storeId)?.name || "Unknown Store";
  };

  const filteredProducts = products.filter((product) => {
    const matchesStore = selectedStore === "all" || product.store_id === selectedStore;
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    return matchesStore && matchesCategory && matchesSearch;
  });

  // Group products by name
  const groupedProducts = useMemo(() => {
    const groups: Record<string, { name: string; category: string; image_url: string | null; products: Product[] }> = {};
    filteredProducts.forEach((p) => {
      const key = p.name.toLowerCase().trim();
      if (!groups[key]) {
        groups[key] = { name: p.name, category: p.category, image_url: p.image_url, products: [] };
      }
      groups[key].products.push(p);
    });
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [filteredProducts]);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const handleInlinePriceChange = (productId: string, value: string) => {
    setInlineEditing((prev) => ({ ...prev, [productId]: value }));
  };

  const handleInlinePriceSave = async (productId: string) => {
    const newPrice = parseFloat(inlineEditing[productId]);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    setSavingInline(productId);
    const { error } = await supabase.from("products").update({ price: newPrice }).eq("id", productId);
    if (error) toast({ title: "Error", description: "Failed to update price", variant: "destructive" });
    else {
      toast({ title: "Price updated" });
      setInlineEditing((prev) => { const n = { ...prev }; delete n[productId]; return n; });
      fetchProducts();
    }
    setSavingInline(null);
  };

  const handleInlinePackPriceChange = (packId: string, value: string) => {
    setInlinePackEditing((prev) => ({ ...prev, [packId]: value }));
  };

  const handleInlinePackPriceSave = async (packPrice: ProductPackPrice) => {
    const newPrice = parseFloat(inlinePackEditing[packPrice.id]);
    if (isNaN(newPrice) || newPrice < 0) {
      toast({ title: "Invalid price", variant: "destructive" });
      return;
    }
    setSavingPackInline(packPrice.id);
    const { error } = await supabase.from("product_pack_prices").update({ price: newPrice }).eq("id", packPrice.id);
    if (error) toast({ title: "Error", description: "Failed to update pack price", variant: "destructive" });
    else {
      toast({ title: "Pack price updated" });
      setInlinePackEditing((prev) => { const n = { ...prev }; delete n[packPrice.id]; return n; });
      fetchPackPrices();
    }
    setSavingPackInline(null);
  };

  const handleTogglePackHidden = async (packPrice: ProductPackPrice) => {
    const { error } = await supabase.from("product_pack_prices").update({ is_hidden: !packPrice.is_hidden }).eq("id", packPrice.id);
    if (error) toast({ title: "Error", description: "Failed to update visibility", variant: "destructive" });
    else fetchPackPrices();
  };

  const fetchPackPrices = async () => {
    const { data, error } = await supabase
      .from("product_pack_prices")
      .select("*")
      .order("pack_size");
    if (!error && data) {
      const map: Record<string, ProductPackPrice[]> = {};
      data.forEach((pp: any) => {
        if (!map[pp.product_id]) map[pp.product_id] = [];
        map[pp.product_id].push(pp as ProductPackPrice);
      });
      setPackPricesMap(map);
    }
  };

  return (
    <>
      {/* Hidden file input for quick uploads */}
      <input
        ref={quickUploadRef}
        type="file"
        accept="image/*"
        onChange={handleQuickImageUpload}
        className="hidden"
      />
      
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Products</CardTitle>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedStore} onValueChange={setSelectedStore}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filter by store" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading products...</div>
          ) : groupedProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Add your first product!
            </div>
          ) : (
            <div className="space-y-2">
              {groupedProducts.map((group) => {
                const isExpanded = expandedGroups.has(group.name);
                return (
                  <div key={group.name} className="border rounded-lg overflow-hidden">
                    {/* Product Header */}
                    <div
                      className="flex items-center gap-3 p-3 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-colors"
                      onClick={() => toggleGroup(group.name)}
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                      
                      {/* Product Image */}
                      <div className="flex-shrink-0">
                        {group.image_url ? (
                          <div className="w-10 h-10 rounded overflow-hidden border border-border bg-background">
                            <img src={group.image_url} alt={group.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }} />
                          </div>
                        ) : (
                          <div className="w-10 h-10 rounded border border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">{group.name}</h3>
                          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded capitalize">{group.category}</span>
                          <span className="text-xs text-muted-foreground">
                            {group.products.length} store{group.products.length > 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Store Rows */}
                    {isExpanded && (
                      <div className="divide-y border-t">
                        {group.products.map((product) => (
                          <div
                            key={product.id}
                            className={`flex items-center gap-3 px-4 py-3 pl-12 ${product.is_hidden ? "opacity-50 bg-muted/30" : "bg-background"}`}
                          >
                            <StoreIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{getStoreName(product.store_id)}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {product.size && (
                                  <span className="text-xs bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">{product.size}</span>
                                )}
                                {product.is_hidden && (
                                  <span className="text-xs bg-destructive/10 text-destructive px-1.5 py-0.5 rounded">Hidden</span>
                                )}
                                {!product.in_stock && (
                                  <span className="text-xs bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded">Out of Stock</span>
                                )}
                              </div>
                            </div>

                            {/* Inline Price */}
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs text-muted-foreground">$</span>
                              <Input
                                type="number"
                                step="0.01"
                                className="w-24 h-8 text-sm"
                                value={inlineEditing[product.id] ?? product.price.toFixed(2)}
                                onChange={(e) => handleInlinePriceChange(product.id, e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleInlinePriceSave(product.id); }}
                              />
                              {inlineEditing[product.id] !== undefined && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8"
                                  disabled={savingInline === product.id}
                                  onClick={() => handleInlinePriceSave(product.id)}
                                >
                                  <Save className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleHidden(product)} title={product.is_hidden ? "Show" : "Hide"}>
                                {product.is_hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(product)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleOpenDelete(product)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            {groupedProducts.length} product{groupedProducts.length !== 1 ? "s" : ""} · {filteredProducts.length} total entries
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update the product details below." : "Fill in the product details below."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="store">Store *</Label>
              <Select
                value={formData.store_id}
                onValueChange={(value) => setFormData({ ...formData, store_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store" />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Budweiser"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="12.99"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Input
                  id="size"
                  value={formData.size}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                  placeholder="6 pack, 750ml, etc."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value: ProductCategory) => handleCategoryChange(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Pack Pricing Section - shows for beer, wine, spirits */}
            {PACK_SIZES_BY_CATEGORY[formData.category].length > 0 && (
              <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
                <Label className="text-base font-semibold">
                  {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Pack Sizes
                </Label>
                <p className="text-sm text-muted-foreground">Set prices and visibility for each pack size. Toggle off to hide from customers.</p>
                <div className="space-y-3">
                  {PACK_SIZES_BY_CATEGORY[formData.category].map((size) => {
                    const packPrice = formData.packPrices.find(p => p.pack_size === size.value);
                    const isHidden = packPrice?.is_hidden ?? false;
                    return (
                      <div key={size.value} className={`flex items-center gap-3 p-2 rounded-lg ${isHidden ? 'bg-destructive/10' : ''}`}>
                        <div className="flex items-center gap-2 min-w-[100px]">
                          <Switch
                            id={`hide-${size.value}`}
                            checked={!isHidden}
                            onCheckedChange={(checked) => updatePackPrice(size.value, "is_hidden", !checked)}
                          />
                          <Label 
                            htmlFor={`hide-${size.value}`} 
                            className={`text-sm font-medium ${isHidden ? 'text-muted-foreground line-through' : ''}`}
                          >
                            {size.label}
                          </Label>
                        </div>
                        <Input
                          id={`pack-${size.value}`}
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={packPrice?.price || ""}
                          onChange={(e) => updatePackPrice(size.value, "price", e.target.value)}
                          className="h-9 flex-1"
                          disabled={isHidden}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Custom Size/Price Section */}
            <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-semibold">Additional Sizes & Prices</Label>
                  <p className="text-sm text-muted-foreground mt-1">Add custom size variants with different prices</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomSize}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Size
                </Button>
              </div>
              
              {formData.customSizes.length > 0 && (
                <div className="space-y-3">
                  {formData.customSizes.map((cs) => (
                    <div key={cs.id} className={`flex items-center gap-2 p-2 rounded-lg ${cs.is_hidden ? 'bg-destructive/10' : ''}`}>
                      <Switch
                        checked={!cs.is_hidden}
                        onCheckedChange={(checked) => updateCustomSize(cs.id, "is_hidden", !checked)}
                      />
                      <div className="flex-1">
                        <Input
                          placeholder="Size (e.g., 1L, 375ml)"
                          value={cs.size}
                          onChange={(e) => updateCustomSize(cs.id, "size", e.target.value)}
                          className={`h-9 ${cs.is_hidden ? 'opacity-50' : ''}`}
                          disabled={cs.is_hidden}
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Price"
                          value={cs.price}
                          onChange={(e) => updateCustomSize(cs.id, "price", e.target.value)}
                          className={`h-9 ${cs.is_hidden ? 'opacity-50' : ''}`}
                          disabled={cs.is_hidden}
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-destructive hover:text-destructive"
                        onClick={() => removeCustomSize(cs.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              
              {formData.customSizes.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No additional sizes added yet</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description..."
              />
            </div>
            {/* Image Upload Section */}
            <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
              <Label className="text-base font-semibold">Product Image</Label>
              
              {/* Image Preview */}
              {imagePreview ? (
                <div className="relative w-full">
                  <div className="relative aspect-square w-32 rounded-lg overflow-hidden border border-border bg-background">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/placeholder.svg';
                      }}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-32 h-32 rounded-lg border-2 border-dashed border-muted-foreground/25 bg-background">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}

              {/* Upload Button */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Image
                      </>
                    )}
                  </Button>
                  <span className="text-xs text-muted-foreground">Max 10MB • Auto background removal</span>
                </div>
                {processingStatus && (
                  <p className="text-xs text-primary animate-pulse">{processingStatus}</p>
                )}
              </div>

              {/* Manual URL Input */}
              <div className="space-y-1">
                <Label htmlFor="image_url" className="text-xs text-muted-foreground">
                  Or enter image URL manually
                </Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => {
                    setFormData({ ...formData, image_url: e.target.value });
                    setImagePreview(e.target.value || null);
                  }}
                  placeholder="https://..."
                  className="h-9"
                />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  id="in_stock"
                  checked={formData.in_stock}
                  onCheckedChange={(checked) => setFormData({ ...formData, in_stock: checked })}
                />
                <Label htmlFor="in_stock">In Stock</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="is_hidden"
                  checked={formData.is_hidden}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
                />
                <Label htmlFor="is_hidden">Hidden</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : editingProduct ? "Update" : "Add Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default ProductManagement;
