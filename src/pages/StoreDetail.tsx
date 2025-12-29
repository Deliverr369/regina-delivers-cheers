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

const BEER_PACK_SIZES = [
  { value: "1-tall", label: "1 Tall Can", multiplier: 1 },
  { value: "6-pack", label: "6 Pack", multiplier: 6 },
  { value: "8-pack", label: "8 Pack", multiplier: 8 },
  { value: "15-pack", label: "15 Pack", multiplier: 15 },
  { value: "24-pack", label: "24 Pack", multiplier: 24 },
  { value: "36-pack", label: "36 Pack", multiplier: 36 },
  { value: "48-pack", label: "48 Pack", multiplier: 48 },
];

const StoreDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const { addToCart } = useCart();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedPackSizes, setSelectedPackSizes] = useState<Record<string, string>>({});

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

  // Fetch beer pack prices for all beer products
  const beerProductIds = products.filter(p => p.category === "beer").map(p => p.id);
  const { data: beerPackPrices = [] } = useQuery({
    queryKey: ["beer_pack_prices", beerProductIds],
    queryFn: async () => {
      if (beerProductIds.length === 0) return [];
      const { data, error } = await supabase
        .from("beer_pack_prices")
        .select("*")
        .in("product_id", beerProductIds);
      
      if (error) throw error;
      return data;
    },
    enabled: beerProductIds.length > 0,
  });

  const productsByCategory = {
    beer: products.filter((p) => p.category === "beer"),
    wine: products.filter((p) => p.category === "wine"),
    spirits: products.filter((p) => p.category === "spirits"),
    smokes: products.filter((p) => p.category === "smokes"),
  };

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
    const selectedSize = selectedPackSizes[product.id] || "1-tall";
    const packSize = product.category === "beer" 
      ? BEER_PACK_SIZES.find(p => p.value === selectedSize)
      : null;
    
    // Check for stored price first, then fall back to multiplier calculation
    const storedPrice = beerPackPrices.find(
      bp => bp.product_id === product.id && bp.pack_size === selectedSize
    );
    
    const displayPrice = storedPrice 
      ? Number(storedPrice.price)
      : packSize 
        ? Number(product.price) * packSize.multiplier 
        : Number(product.price);
    
    const displayName = packSize && packSize.value !== "1-tall"
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

  const getSelectedPackSize = (productId: string) => selectedPackSizes[productId] || "1-tall";

  const setPackSize = (productId: string, value: string) => {
    setSelectedPackSizes(prev => ({ ...prev, [productId]: value }));
  };

  const getDisplayPrice = (product: typeof products[0]) => {
    if (product.category !== "beer") return Number(product.price);
    
    const selectedSize = getSelectedPackSize(product.id);
    
    // Check for stored price first
    const storedPrice = beerPackPrices.find(
      bp => bp.product_id === product.id && bp.pack_size === selectedSize
    );
    
    if (storedPrice) {
      return Number(storedPrice.price);
    }
    
    // Fall back to multiplier calculation
    const packSize = BEER_PACK_SIZES.find(p => p.value === selectedSize);
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
        
        {/* Beer pack size selector */}
        {product.category === "beer" && (
          <div className="mb-3">
            <Select
              value={getSelectedPackSize(product.id)}
              onValueChange={(value) => setPackSize(product.id, value)}
            >
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="Select size" />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border z-50">
                {BEER_PACK_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value} className="text-xs">
                    {size.label}
                  </SelectItem>
                ))}
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
            <Tabs defaultValue="beer" className="w-full">
              <TabsList className="mb-8 w-full justify-start overflow-x-auto">
                <TabsTrigger value="beer">Beer ({productsByCategory.beer.length})</TabsTrigger>
                <TabsTrigger value="wine">Wine ({productsByCategory.wine.length})</TabsTrigger>
                <TabsTrigger value="spirits">Spirits ({productsByCategory.spirits.length})</TabsTrigger>
                <TabsTrigger value="smokes">Smokes ({productsByCategory.smokes.length})</TabsTrigger>
              </TabsList>

              {Object.entries(productsByCategory).map(([category, items]) => (
                <TabsContent key={category} value={category}>
                  {items.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {items.map((product) => (
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