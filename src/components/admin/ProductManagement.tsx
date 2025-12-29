import { useEffect, useState, useRef } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Search, Upload, X, Image as ImageIcon } from "lucide-react";
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
}

const getInitialPackPrices = (category: ProductCategory): PackPrice[] => {
  return PACK_SIZES_BY_CATEGORY[category].map((size) => ({
    pack_size: size.value,
    price: "",
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const quickUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStores();
    fetchProducts();
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
    
    // Fetch existing pack prices if category has pack sizes
    let packPrices = getInitialPackPrices(product.category);
    if (PACK_SIZES_BY_CATEGORY[product.category].length > 0) {
      const { data: existingPrices } = await supabase
        .from("product_pack_prices")
        .select("pack_size, price")
        .eq("product_id", product.id);
      
      if (existingPrices) {
        packPrices = packPrices.map(p => {
          const existing = existingPrices.find(ep => ep.pack_size === p.pack_size);
          return existing ? { ...p, price: existing.price.toString() } : p;
        });
      }
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(filePath, file);

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
        description: "Image uploaded successfully",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image under 5MB",
        variant: "destructive",
      });
      setUploadingProductId(null);
      return;
    }

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `products/${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(filePath, file);

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
        description: "Product image updated",
      });
    } catch (error: any) {
      console.error('Quick upload error:', error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload image",
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
        // Save pack prices if category supports them
        if (PACK_SIZES_BY_CATEGORY[formData.category].length > 0) {
          await savePackPrices(editingProduct.id);
        }
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
        // Save pack prices if category supports them
        if (PACK_SIZES_BY_CATEGORY[formData.category].length > 0 && newProduct) {
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
    
    // Insert new prices (only for non-empty values)
    const pricesToInsert = formData.packPrices
      .filter(p => p.price && !isNaN(parseFloat(p.price)))
      .map(p => ({
        product_id: productId,
        pack_size: p.pack_size,
        price: parseFloat(p.price),
      }));
    
    if (pricesToInsert.length > 0) {
      await supabase
        .from("product_pack_prices")
        .insert(pricesToInsert);
    }
  };

  const updatePackPrice = (packSize: string, price: string) => {
    setFormData(prev => ({
      ...prev,
      packPrices: prev.packPrices.map(p =>
        p.pack_size === packSize ? { ...p, price } : p
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
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No products found. Add your first product!
            </div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    product.is_hidden ? "opacity-60 bg-muted/50" : ""
                  }`}
                >
                  {/* Product Image with Quick Upload */}
                  <div className="flex-shrink-0 mr-4 relative group">
                    {product.image_url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-border bg-background relative">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/placeholder.svg';
                          }}
                        />
                        {/* Quick upload overlay */}
                        <div 
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                          onClick={() => handleQuickUploadClick(product.id)}
                        >
                          {uploadingProductId === product.id ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Upload className="h-4 w-4 text-white" />
                          )}
                        </div>
                      </div>
                    ) : (
                      <div 
                        className="w-14 h-14 rounded-lg border border-dashed border-muted-foreground/25 bg-muted/50 flex items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                        onClick={() => handleQuickUploadClick(product.id)}
                      >
                        {uploadingProductId === product.id ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <Upload className="h-5 w-5 text-muted-foreground/50 hover:text-primary" />
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">{product.name}</h3>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                        {product.category}
                      </span>
                      {product.size && (
                        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                          {product.size}
                        </span>
                      )}
                      {product.is_hidden && (
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                          Hidden
                        </span>
                      )}
                      {!product.in_stock && (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded">
                          Out of Stock
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      ${product.price.toFixed(2)} • {getStoreName(product.store_id)}
                    </p>
                    {product.description && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">{product.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleHidden(product)}
                      title={product.is_hidden ? "Show Product" : "Hide Product"}
                    >
                      {product.is_hidden ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDelete(product)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredProducts.length} of {products.length} products
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
                  {formData.category.charAt(0).toUpperCase() + formData.category.slice(1)} Pack Prices
                </Label>
                <p className="text-sm text-muted-foreground">Set prices for different pack sizes. Leave empty to use base price with multiplier.</p>
                <div className="grid grid-cols-2 gap-3">
                  {PACK_SIZES_BY_CATEGORY[formData.category].map((size) => {
                    const packPrice = formData.packPrices.find(p => p.pack_size === size.value);
                    return (
                      <div key={size.value} className="space-y-1">
                        <Label htmlFor={`pack-${size.value}`} className="text-xs text-muted-foreground">
                          {size.label}
                        </Label>
                        <Input
                          id={`pack-${size.value}`}
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={packPrice?.price || ""}
                          onChange={(e) => updatePackPrice(size.value, e.target.value)}
                          className="h-9"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
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
                    <>Uploading...</>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Image
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">Max 5MB</span>
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
