import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Minus, Plus, ShoppingCart, ExternalLink, Loader2 } from "lucide-react";
import { useCart } from "@/hooks/useCart";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ProductJsonLd } from "@/components/seo/ProductJsonLd";
import PriceDisclaimer from "@/components/PriceDisclaimer";
import { safeImageUrl } from "@/lib/image-url";
import { useIsNative } from "@/hooks/useIsNative";

interface ProductDetailModalProps {
  productId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When true, hides the "View full page" link (e.g. when already on detail page) */
  hideFullPageLink?: boolean;
}

const getPackSortValue = (packSize: string): number => {
  const match = String(packSize || "").match(/(\d+(?:\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
};

const ProductDetailModal = ({ productId, open, onOpenChange, hideFullPageLink }: ProductDetailModalProps) => {
  const { addToCart } = useCart();
  const { toast } = useToast();
  const isNative = useIsNative();
  const [selectedPackSize, setSelectedPackSize] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [descExpanded, setDescExpanded] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product-detail", productId],
    queryFn: async () => {
      if (!productId) return null;
      const { data, error } = await supabase
        .from("products")
        .select(`*, stores (id, name)`)
        .eq("id", productId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!productId && open,
  });

  const { data: packPrices = [] } = useQuery({
    queryKey: ["product-pack-prices", productId],
    queryFn: async () => {
      if (!productId) return [];
      const { data, error } = await supabase
        .from("product_pack_prices")
        .select("*")
        .eq("product_id", productId)
        .eq("is_hidden", false);
      if (error) throw error;
      return (data || []).sort((a, b) => getPackSortValue(b.pack_size) - getPackSortValue(a.pack_size));
    },
    enabled: !!productId && open,
  });

  // Auto-select largest pack when data arrives
  useEffect(() => {
    if (packPrices.length > 0 && !selectedPackSize) {
      setSelectedPackSize(packPrices[0].pack_size);
    }
  }, [packPrices, selectedPackSize]);

  // Reset on close / product change
  useEffect(() => {
    if (!open) {
      setSelectedPackSize(null);
      setQuantity(1);
      setDescExpanded(false);
    }
  }, [open, productId]);

  const currentPrice = useMemo(() => {
    if (!product) return 0;
    if (selectedPackSize) {
      const match = packPrices.find((p) => p.pack_size === selectedPackSize);
      if (match) return Number(match.price);
    }
    if (packPrices.length > 0) return Number(packPrices[0].price);
    return Number(product.price);
  }, [product, packPrices, selectedPackSize]);

  const totalPrice = currentPrice * quantity;

  const [specialInstructions, setSpecialInstructions] = useState("");
  const isFood = product?.category === "takeout";

  // Reset instructions when product changes / modal closes
  useEffect(() => {
    if (!open) setSpecialInstructions("");
  }, [open, productId]);

  const handleAddToCart = () => {
    if (!product) return;
    const sizeLabel = selectedPackSize || packPrices[0]?.pack_size;
    const trimmedNote = specialInstructions.trim();
    const noteSuffix = trimmedNote ? ` — Note: ${trimmedNote}` : "";
    for (let i = 0; i < quantity; i++) {
      addToCart({
        id: product.id,
        name: `${sizeLabel ? `${product.name} (${sizeLabel})` : product.name}${noteSuffix}`,
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {isLoading || !product ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* SEO injection while modal is open */}
            <ProductJsonLd
              name={product.name}
              description={product.seo_description || product.description || undefined}
              image={product.image_url || undefined}
              category={product.category}
              price={currentPrice}
              size={selectedPackSize || product.size || undefined}
              sku={product.id}
              inStock={product.in_stock !== false}
            />

            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle className="text-2xl font-display font-bold">{product.name}</DialogTitle>
              {(product.stores as any)?.name && (
                <p className="text-sm text-muted-foreground">From {(product.stores as any).name}</p>
              )}
            </DialogHeader>

            <div className="px-6 py-6 space-y-6">
              {/* Image */}
              <div className="aspect-square max-h-80 mx-auto rounded-lg overflow-hidden bg-muted/30 flex items-center justify-center">
                <img
                  src={safeImageUrl(product.image_url) || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=600&auto=format&fm=jpg"}
                  alt={product.name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Pack price options */}
              {packPrices.length > 0 && (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                    <span className="font-semibold text-sm">Price Options:</span>
                    <span className="text-xs text-muted-foreground">Required*</span>
                  </div>
                  <div className="divide-y divide-border">
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
                          <span className="font-bold text-foreground">${Number(pp.price).toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Single price (no pack options) */}
              {packPrices.length === 0 && (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-primary">${currentPrice.toFixed(2)}</span>
                  {product.size && <span className="text-muted-foreground">/ {product.size}</span>}
                </div>
              )}

              <p className="text-xs text-muted-foreground italic">
                *Prices displayed do not include any taxes or fees.
              </p>

              {/* AI-generated rich description */}
              {(product.seo_description || product.description) && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <h3 className="font-semibold text-sm text-foreground">About this product</h3>
                  <p
                    className={`text-sm text-muted-foreground leading-relaxed whitespace-pre-line ${
                      isNative && !descExpanded ? "line-clamp-3" : ""
                    }`}
                  >
                    {product.seo_description || product.description}
                  </p>
                  {isNative && (product.seo_description || product.description || "").length > 160 && (
                    <button
                      type="button"
                      onClick={() => setDescExpanded((v) => !v)}
                      className="text-xs font-semibold text-primary"
                    >
                      {descExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                </div>
              )}

              {/* Category badge */}
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="capitalize">{product.category}</Badge>
                {product.subcategory && (
                  <Badge variant="outline" className="capitalize">{product.subcategory}</Badge>
                )}
              </div>

              {!hideFullPageLink && (
                <Link
                  to={`/product/${product.id}`}
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  onClick={() => onOpenChange(false)}
                >
                  View full product page <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>

            {/* Special instructions for food */}
            {isFood && (
              <div className="px-6 pb-4 space-y-2 border-t border-border pt-4">
                <Label htmlFor="special-instructions" className="text-sm font-semibold">
                  Special instructions <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="special-instructions"
                  placeholder="e.g. No onions, extra sauce, well done…"
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 250))}
                  className="min-h-[70px] resize-none"
                  maxLength={250}
                />
                <p className="text-xs text-muted-foreground text-right">{specialInstructions.length}/250</p>
              </div>
            )}

            {/* Sticky add-to-cart footer (safe-area aware on iOS) */}
            <div
              className={`sticky bottom-0 bg-background border-t border-border px-6 py-4 flex items-center gap-4 ${
                isNative ? "pb-safe-plus" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className={isNative ? "h-11 w-11 rounded-full" : "h-9 w-9"}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className={`text-center font-semibold ${isNative ? "w-7" : "w-8 font-medium"}`}>{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  className={isNative ? "h-11 w-11 rounded-full" : "h-9 w-9"}
                  onClick={() => setQuantity((q) => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button
                className={`flex-1 gap-2 font-bold shadow-md ${isNative ? "h-12 text-base rounded-full" : "h-11"}`}
                onClick={handleAddToCart}
              >
                <ShoppingCart className="h-4 w-4" />
                Add to Cart
                <span className="ml-auto font-bold">${totalPrice.toFixed(2)}</span>
              </Button>
            </div>
            <PriceDisclaimer variant="subtle" className="mt-3" />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProductDetailModal;
