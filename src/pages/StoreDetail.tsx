import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { MapPin, Star, Clock, ArrowLeft, Plus, Minus, ShoppingCart, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PACK_SIZES_BY_CATEGORY = {
  beer: [
    { value: "1-tall", label: "1 Tall Can", multiplier: 1 },
    { value: "6-pack", label: "6 Pack", multiplier: 6 },
    { value: "8-pack", label: "8 Pack", multiplier: 8 },
    { value: "15-pack", label: "15 Pack", multiplier: 15 },
    { value: "24-pack", label: "24 Pack", multiplier: 24 },
    { value: "36-pack", label: "36 Pack", multiplier: 36 },
    { value: "48-pack", label: "48 Pack", multiplier: 48 },
  ],
  wine: [
    { value: "single-bottle", label: "Single Bottle", multiplier: 1 },
    { value: "2-pack", label: "2-Pack", multiplier: 2 },
    { value: "case-6", label: "Case of 6", multiplier: 6 },
    { value: "case-12", label: "Case of 12", multiplier: 12 },
  ],
  spirits: [
    { value: "single-bottle", label: "Single Bottle", multiplier: 1 },
    { value: "2-pack", label: "2-Pack", multiplier: 2 },
    { value: "case-6", label: "Case of 6", multiplier: 6 },
  ],
  smokes: [] as { value: string; label: string; multiplier: number }[],
};

interface PackPrice {
  product_id: string;
  pack_size: string;
  price: number;
  is_hidden: boolean;
}

// Smokes subcategories for filtering
const SMOKES_SUBCATEGORIES = [
  { value: "all", label: "All" },
  { value: "cigarettes", label: "Cigarettes" },
  { value: "cigars", label: "Cigars" },
  { value: "vapes", label: "Vapes" },
  { value: "rolling", label: "Rolling Tobacco" },
  { value: "pouches", label: "Nicotine Pouches" },
  { value: "accessories", label: "Accessories" },
];

// Helper to detect subcategory from product name
const getSmokesSubcategory = (productName: string): string => {
  const name = productName.toLowerCase();
  if (name.includes("cigarette") || name.includes("marlboro") || name.includes("camel") || name.includes("newport") || name.includes("american spirit") || name.includes("pall mall") || name.includes("winston") || name.includes("l&m") || name.includes("lucky strike")) return "cigarettes";
  if (name.includes("cigar") || name.includes("backwood") || name.includes("swisher") || name.includes("black & mild") || name.includes("phillies") || name.includes("dutch") || name.includes("garcia vega") || name.includes("white owl")) return "cigars";
  if (name.includes("vape") || name.includes("juul") || name.includes("stlth") || name.includes("vuse") || name.includes("elf bar") || name.includes("lost mary") || name.includes("hyde") || name.includes("pod") || name.includes("e-liquid") || name.includes("disposable")) return "vapes";
  if (name.includes("rolling") || name.includes("drum") || name.includes("top ") || name.includes("bugler") || name.includes("zig-zag") || name.includes("raw ") || name.includes("papers") || name.includes("filter") || name.includes("rizla") || name.includes("elements")) return "rolling";
  if (name.includes("pouch") || name.includes("zyn") || name.includes("velo") || name.includes("on!") || name.includes("nicotine pouch") || name.includes("snus")) return "pouches";
  if (name.includes("lighter") || name.includes("case") || name.includes("grinder") || name.includes("ashtray") || name.includes("holder") || name.includes("cutter") || name.includes("humidor")) return "accessories";
  return "cigarettes"; // default
};

const StoreDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedPackSizes, setSelectedPackSizes] = useState<Record<string, string>>({});
  const [smokesSubcategory, setSmokesSubcategory] = useState<string>("all");

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ["store", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["products", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", id)
        .eq("in_stock", true);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch pack prices for products with pack options
  const productsWithPacks = products.filter(p => PACK_SIZES_BY_CATEGORY[p.category].length > 0);
  const productIdsWithPacks = productsWithPacks.map(p => p.id);
  const { data: packPrices = [] } = useQuery<PackPrice[]>({
    queryKey: ["product_pack_prices", productIdsWithPacks],
    queryFn: async () => {
      if (productIdsWithPacks.length === 0) return [];
      const { data, error } = await supabase
        .from("product_pack_prices")
        .select("product_id, pack_size, price, is_hidden")
        .in("product_id", productIdsWithPacks);
      
      if (error) throw error;
      return (data || []) as PackPrice[];
    },
    enabled: productIdsWithPacks.length > 0,
  });

  // Helper to get available (non-hidden) pack sizes for a product
  const getAvailablePackSizes = (productId: string, category: keyof typeof PACK_SIZES_BY_CATEGORY) => {
    const baseSizes = PACK_SIZES_BY_CATEGORY[category];
    const productPackPrices = packPrices.filter(pp => pp.product_id === productId);
    
    // Filter out sizes that are explicitly hidden
    return baseSizes.filter(size => {
      const packPrice = productPackPrices.find(pp => pp.pack_size === size.value);
      // If there's no entry for this size, it's visible by default
      // If there's an entry, check if it's hidden
      return !packPrice?.is_hidden;
    });
  };

  const productsByCategory = {
    beer: products
      .filter((p) => p.category === "beer")
      .sort((a, b) => {
        const aIs24 = a.size === "24-pack" ? 0 : 1;
        const bIs24 = b.size === "24-pack" ? 0 : 1;
        return aIs24 - bIs24 || a.name.localeCompare(b.name);
      }),
    wine: products.filter((p) => p.category === "wine"),
    spirits: products.filter((p) => p.category === "spirits"),
    smokes: products.filter((p) => p.category === "smokes"),
  };

  // Get categories that have products
  const availableCategories = Object.entries(productsByCategory)
    .filter(([_, items]) => items.length > 0)
    .map(([category]) => category);
  
  // Get default tab (first category with products)
  const defaultCategory = availableCategories.length > 0 ? availableCategories[0] : "beer";

  const getQuantity = (productId: string) => quantities[productId] || 0;

  const updateQuantity = (productId: string, delta: number) => {
    setQuantities((prev) => ({
      ...prev,
      [productId]: Math.max(0, (prev[productId] || 0) + delta),
    }));
  };

  const handleAddToCart = (product: typeof products[0]) => {
    const qty = getQuantity(product.id);
    if (qty === 0) {
      updateQuantity(product.id, 1);
    }
    const category = product.category as keyof typeof PACK_SIZES_BY_CATEGORY;
    const packSizes = PACK_SIZES_BY_CATEGORY[category];
    const defaultSize = packSizes.length > 0 ? packSizes[0].value : "single";
    const selectedSize = selectedPackSizes[product.id] || defaultSize;
    const packSize = packSizes.find(p => p.value === selectedSize);
    
    // Check for stored price first, then fall back to multiplier calculation
    const storedPrice = packPrices.find(
      bp => bp.product_id === product.id && bp.pack_size === selectedSize
    );
    
    const displayPrice = storedPrice 
      ? Number(storedPrice.price)
      : packSize 
        ? Number(product.price) * packSize.multiplier 
        : Number(product.price);
    
    const displayName = packSize && packSize.multiplier !== 1
      ? `${product.name} (${packSize.label})`
      : product.name;

    addToCart({
      id: `${product.id}-${packSize?.value || "single"}`,
      name: displayName,
      price: displayPrice,
      image: product.image_url || "",
      storeId: store?.id || "",
      storeName: store?.name || "",
    });
    toast({
      title: "Added to cart",
      description: `${displayName} has been added to your cart`,
    });
  };

  const getPackSizesForProduct = (product: typeof products[0]) => {
    const category = product.category as keyof typeof PACK_SIZES_BY_CATEGORY;
    return getAvailablePackSizes(product.id, category);
  };

  const getSelectedPackSize = (product: typeof products[0]) => {
    const availableSizes = getPackSizesForProduct(product);
    const defaultSize = availableSizes.length > 0 ? availableSizes[0].value : "single";
    const currentSelection = selectedPackSizes[product.id];
    
    // Ensure selected size is still available
    if (currentSelection && availableSizes.some(s => s.value === currentSelection)) {
      return currentSelection;
    }
    return defaultSize;
  };

  const setPackSize = (productId: string, value: string) => {
    setSelectedPackSizes(prev => ({ ...prev, [productId]: value }));
  };

  const getDisplayPrice = (product: typeof products[0]) => {
    const category = product.category as keyof typeof PACK_SIZES_BY_CATEGORY;
    const availableSizes = getPackSizesForProduct(product);
    
    if (availableSizes.length === 0) return Number(product.price);
    
    const selectedSize = getSelectedPackSize(product);
    
    // Check for stored price first
    const storedPrice = packPrices.find(
      bp => bp.product_id === product.id && bp.pack_size === selectedSize && !bp.is_hidden
    );
    
    if (storedPrice) {
      return Number(storedPrice.price);
    }
    
    // Fall back to multiplier calculation
    const packSize = availableSizes.find(p => p.value === selectedSize);
    return Number(product.price) * (packSize?.multiplier || 1);
  };

  const ProductCard = ({ product }: { product: typeof products[0] }) => (
    <div className="group bg-card rounded-xl border border-border overflow-hidden hover:shadow-xl hover:border-primary/20 transition-all duration-300">
      <div className="aspect-square overflow-hidden bg-muted/30 relative">
        <img 
          src={product.image_url || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format"} 
          alt={product.name} 
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" 
        />
        {product.size && (
          <span className="absolute top-2 right-2 bg-background/90 backdrop-blur-sm text-foreground text-xs font-semibold px-2 py-1 rounded-full border border-border shadow-sm">
            {product.size}
          </span>
        )}
      </div>
      <div className="p-4">
        <h4 className="font-medium text-foreground mb-1 line-clamp-2">{product.name}</h4>
        
        {/* Pack size selector - shows for beer, wine, spirits */}
        {getPackSizesForProduct(product).length > 0 && (
          <div className="mb-3">
            <Select
              value={getSelectedPackSize(product)}
              onValueChange={(value) => setPackSize(product.id, value)}
            >
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {getPackSizesForProduct(product).map((size) => {
                  const storedPrice = packPrices.find(
                    bp => bp.product_id === product.id && bp.pack_size === size.value && !bp.is_hidden
                  );
                  const sizePrice = storedPrice
                    ? Number(storedPrice.price)
                    : Number(product.price) * size.multiplier;
                  return (
                    <SelectItem key={size.value} value={size.value} className="text-xs">
                      <span className="flex items-center justify-between gap-4 w-full">
                        <span>{size.label}</span>
                        <span className="text-primary font-semibold">${sizePrice.toFixed(2)}</span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}
        
        <p className="text-xl font-bold text-primary mb-4">${getDisplayPrice(product).toFixed(2)}</p>
        
        <div className="flex items-center gap-2">
          {getQuantity(product.id) > 0 ? (
            <div className="flex items-center gap-2 flex-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, -1)}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="font-medium w-8 text-center">{getQuantity(product.id)}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => updateQuantity(product.id, 1)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button className="flex-1" onClick={() => handleAddToCart(product)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold mb-4">Store not found</h1>
            <Link to="/stores">
              <Button>Back to Stores</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20">
        {/* Store Header */}
        <div className="relative h-64 md:h-80">
          <img
            src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800&auto=format"}
            alt={store.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8">
            <div className="container mx-auto">
              <Link to="/stores" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to stores
              </Link>
              
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-3xl md:text-4xl font-bold text-white">
                      {store.name}
                    </h1>
                    {store.is_open && (
                      <Badge className="bg-success text-white">Open</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-white/80">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {store.address}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {store.hours}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-white">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 fill-gold text-gold" />
                    <span className="font-bold">{store.rating}</span>
                    <span className="text-white/70">({store.reviews_count})</span>
                  </div>
                  <div className="text-white/70">
                    {store.delivery_time} • {Number(store.delivery_fee) === 0 ? "Free" : `$${Number(store.delivery_fee).toFixed(2)}`} delivery
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Products */}
        <div className="container mx-auto px-4 py-8">
          {productsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue={defaultCategory} className="w-full">
              <TabsList className="mb-8 w-full justify-center overflow-x-auto h-auto p-2 gap-2 bg-muted/50 rounded-xl">
                {availableCategories.includes("beer") && (
                  <TabsTrigger value="beer" className="text-lg font-semibold px-8 py-3.5 gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all">🍺 Beer ({productsByCategory.beer.length})</TabsTrigger>
                )}
                {availableCategories.includes("wine") && (
                  <TabsTrigger value="wine" className="text-lg font-semibold px-8 py-3.5 gap-2 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all">🍷 Wine ({productsByCategory.wine.length})</TabsTrigger>
                )}
                {availableCategories.includes("spirits") && (
                  <TabsTrigger value="spirits" className="text-lg font-semibold px-8 py-3.5 gap-2 data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all">🥃 Spirits ({productsByCategory.spirits.length})</TabsTrigger>
                )}
                {availableCategories.includes("smokes") && (
                  <TabsTrigger value="smokes" className="text-lg font-semibold px-8 py-3.5 gap-2 data-[state=active]:bg-slate-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg transition-all">🚬 Smokes ({productsByCategory.smokes.length})</TabsTrigger>
                )}
              </TabsList>

              {Object.entries(productsByCategory)
                .filter(([category]) => availableCategories.includes(category))
                .map(([category, items]) => (
                <TabsContent key={category} value={category}>
                  {category === "smokes" && items.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {SMOKES_SUBCATEGORIES.map((sub) => {
                        const count = sub.value === "all" 
                          ? items.length 
                          : items.filter(p => getSmokesSubcategory(p.name) === sub.value).length;
                        if (sub.value !== "all" && count === 0) return null;
                        return (
                          <Button
                            key={sub.value}
                            variant={smokesSubcategory === sub.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSmokesSubcategory(sub.value)}
                            className="rounded-full"
                          >
                            {sub.label} ({count})
                          </Button>
                        );
                      })}
                    </div>
                  )}
                  {items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {(category === "smokes" && smokesSubcategory !== "all"
                        ? items.filter(p => getSmokesSubcategory(p.name) === smokesSubcategory)
                        : items
                      ).map((product) => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      No products available in this category
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default StoreDetail;