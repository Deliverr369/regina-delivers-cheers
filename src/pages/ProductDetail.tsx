import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Minus, Plus, ShoppingCart, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";

const getPackSortValue = (packSize: string): number => {
  const match = String(packSize || "").match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { toast } = useToast();
  const [selectedPackSize, setSelectedPackSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail-page", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select(`*, stores (id, name, address)`)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: packPrices = [] } = useQuery({
    queryKey: ["product-pack-prices-page", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("product_pack_prices")
        .select("*")
        .eq("product_id", id)
        .eq("is_hidden", false);
      if (error) throw error;
      return (data || []).sort((a, b) => getPackSortValue(b.pack_size) - getPackSortValue(a.pack_size));
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (packPrices.length > 0 && !selectedPackSize) {
      setSelectedPackSize(packPrices[0].pack_size);
    }
  }, [packPrices, selectedPackSize]);

  // Update document title for SEO
  useEffect(() => {
    if (product) {
      const title = product.seo_meta_title || `${product.name} | Regina Delivers Cheers`;
      document.title = title.slice(0, 60);
    }
    return () => {
      document.title = "Regina Delivers Cheers";
    };
  }, [product]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedPackSize) {
      const m = packPrices.find((p) => p.pack_size === selectedPackSize);
      if (m) return Number(m.price);
    }
    if (packPrices.length > 0) return Number(packPrices[0].price);
    return Number(product.price);
  }, [product, packPrices, selectedPackSize]);

  const handleAddToCart = () => {
    if (!product) return;
    const sizeLabel = selectedPackSize || packPrices[0]?.pack_size;
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: sizeLabel ? `${product.name} (${sizeLabel})` : product.name,
        price: currentPrice,
        image: product.image_url || "",
        storeId: (product.stores as any)?.id || product.store_id || "",
        storeName: (product.stores as any)?.name || "",
      });
    }
    toast({
      title: "Added to cart",
      description: `${quantity}× ${product.name}${sizeLabel ? ` (${sizeLabel})` : ""}`,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 pt-24 pb-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Product not found</h1>
          <Button onClick={() => navigate("/products")}>Back to Products</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const description = product.seo_description || product.description;
  const totalPrice = currentPrice * quantity;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <ProductJsonLd
        name={product.name}
        description={description || undefined}
        image={product.image_url || undefined}
        category={product.category}
        price={currentPrice}
        size={selectedPackSize || product.size || undefined}
        sku={product.id}
        inStock={product.in_stock !== false}
      />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <Link
            to="/products"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all products
          </Link>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image */}
            <div className="bg-card rounded-2xl border border-border p-8 flex items-center justify-center aspect-square">
              <img
                src={product.image_url || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800&auto=format"}
                alt={product.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Details */}
            <div className="space-y-6">
              <div>
                <div className="flex flex-wrap gap-2 mb-3">
                  <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                  {product.subcategory && (
                    <Badge variant="outline" className="capitalize">{product.subcategory}</Badge>
                  )}
                </div>
                <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {product.name}
                </h1>
                {(product.stores as any)?.name && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Available at {(product.stores as any).name}
                  </p>
                )}
              </div>

              {/* Pack price options */}
              {packPrices.length > 0 ? (
                <div className="rounded-xl border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-sm">Price Options:</span>
                    <span className="text-xs text-muted-foreground">Required*</span>
                  </div>
                  <div className="divide-y divide-border max-h-80 overflow-y-auto">
                    {packPrices.map((pp) => {
                      const isSelected = selectedPackSize === pp.pack_size;
                      return (
                        <button
                          key={pp.id}
                          onClick={() => setSelectedPackSize(pp.pack_size)}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/40 ${
                            isSelected ? "bg-primary/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-5 w-5 rounded-full flex items-center justify-center transition-colors ${
                                isSelected
                                  ? "bg-primary border-2 border-primary"
                                  : "border-2 border-muted-foreground/30"
                              }`}
                            >
                              {isSelected && (
                                <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm font-medium">{pp.pack_size}</span>
                          </div>
                          <span className="font-bold">${Number(pp.price).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-primary">${currentPrice.toFixed(2)}</span>
                  {product.size && <span className="text-muted-foreground">/ {product.size}</span>}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                *Prices displayed do not include any taxes or fees.
              </p>

              {/* Quantity + Add to cart */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 border border-border rounded-lg px-2 py-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center font-medium">{quantity}</span>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setQuantity((q) => q + 1)}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button className="flex-1 h-12 gap-2" onClick={handleAddToCart}>
                  <ShoppingCart className="h-4 w-4" />
                  Add to Cart
                  <span className="ml-auto font-bold">${totalPrice.toFixed(2)}</span>
                </Button>
              </div>

              {/* AI rich description */}
              {description && (
                <div className="pt-6 border-t border-border space-y-3">
                  <h2 className="font-display text-xl font-bold">About this product</h2>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                    {description}
                  </p>
                </div>
              )}

              {product.seo_keywords && product.seo_keywords.length > 0 && (
                <div className="pt-4">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Related searches:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {product.seo_keywords.slice(0, 6).map((kw: string) => (
                      <span key={kw} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductDetail;
