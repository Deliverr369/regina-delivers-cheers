import { useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, ChevronDown, Plus, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/hooks/useCart";
import { useQuery } from "@tanstack/react-query";
import { safeImageUrl } from "@/lib/image-url";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductDetailModal from "@/components/ProductDetailModal";
import { SEO } from "@/components/seo/SEO";
import { VirtualizedProductGrid } from "@/components/VirtualizedProductGrid";

const categories = [
  { id: "all", name: "All Products" },
  { id: "beer", name: "Beer" },
  { id: "wine", name: "Wine" },
  { id: "spirits", name: "Spirits" },
  { id: "ciders_seltzers", name: "Ciders & Seltzers" },
  { id: "smokes", name: "Smokes" },
  { id: "grocery", name: "Grocery" },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const { addToCart } = useCart();

  const activeCategory = searchParams.get("category") || "all";
  const sortBy = searchParams.get("sort") || "name";

  // Fetch a large table in parallel pages: the first page reports the exact
  // total, the remaining pages are then requested all at once.
  const fetchAllPaged = async (
    table: "products" | "product_pack_prices",
    columns: string,
    applyFilters: (q: any) => any
  ) => {
    const batchSize = 1000;
    const page = async (from: number) => {
      const { data, error, count } = await applyFilters(
        (supabase.from(table) as any).select(columns, { count: from === 0 ? "exact" : undefined })
      ).range(from, from + batchSize - 1);
      if (error) throw error;
      return { rows: (data ?? []) as any[], count: count ?? null };
    };
    const first = await page(0);
    const total = first.count ?? first.rows.length;
    if (total <= batchSize) return first.rows;
    const offsets: number[] = [];
    for (let from = batchSize; from < total; from += batchSize) offsets.push(from);
    const rest = await Promise.all(offsets.map((from) => page(from)));
    return rest.reduce((acc, r) => acc.concat(r.rows), first.rows);
  };

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: () =>
      fetchAllPaged(
        "products",
        `id, name, price, category, image_url, size, in_stock, stores (id, name)`,
        (q) => q.eq("in_stock", true)
      ),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const { data: packPrices = [] } = useQuery({
    queryKey: ["all-pack-prices"],
    queryFn: () =>
      fetchAllPaged("product_pack_prices", "product_id, pack_size, price, is_hidden", (q) =>
        q.eq("is_hidden", false)
      ),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  // Extract leading numeric pack count for sorting (e.g. "24 Cans" -> 24, "750ml" -> 750)
  const getPackSortValue = (packSize: string): number => {
    const match = String(packSize || "").match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Map pack prices by product_id, sorted largest -> smallest
  const packPriceMap = useMemo(() => {
    const map = new Map<string, any[]>();
    packPrices.forEach((pp: any) => {
      const list = map.get(pp.product_id) || [];
      list.push(pp);
      map.set(pp.product_id, list);
    });
    map.forEach((list) => {
      list.sort((a, b) => getPackSortValue(b.pack_size) - getPackSortValue(a.pack_size));
    });
    return map;
  }, [packPrices]);

  // Deduplicate products by name+category, keeping lowest price
  const deduplicatedProducts = useMemo(() => {
    const map = new Map<string, { product: typeof products[0]; storeCount: number }>();
    products.forEach((p) => {
      const key = `${p.name.toLowerCase().trim()}::${p.category}`;
      const existing = map.get(key);
      if (!existing) {
        map.set(key, { product: p, storeCount: 1 });
      } else {
        existing.storeCount++;
        if (Number(p.price) < Number(existing.product.price)) {
          existing.product = p;
        }
      }
    });
    return Array.from(map.values());
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return deduplicatedProducts
      .filter(({ product }) => {
        const matchesCategory = activeCategory === "all" || product.category === activeCategory;
        const matchesSearch = product.name.toLowerCase().includes(q);
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === "price-low") return Number(a.product.price) - Number(b.product.price);
        if (sortBy === "price-high") return Number(b.product.price) - Number(a.product.price);
        return a.product.name.localeCompare(b.product.name);
      });
  }, [deduplicatedProducts, activeCategory, searchQuery, sortBy]);

  const handleCategoryChange = (category: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (category === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", category);
    }
    setSearchParams(newParams);
  };

  const handleSortChange = (sort: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("sort", sort);
    setSearchParams(newParams);
  };

  const getProductSizes = (productId: string) => {
    return packPriceMap.get(productId) || [];
  };

  const getSelectedPrice = (product: any) => {
    const sizes = getProductSizes(product.id);
    const selectedSize = selectedSizes[product.id];
    if (selectedSize) {
      const match = sizes.find((s: any) => s.pack_size === selectedSize);
      if (match) return Number(match.price);
    }
    if (sizes.length > 0) return Number(sizes[0].price);
    return Number(product.price);
  };

  const getSelectedSizeLabel = (product: any) => {
    const sizes = getProductSizes(product.id);
    if (sizes.length === 0) return null;
    return selectedSizes[product.id] || sizes[0]?.pack_size;
  };

  const handleAddToCart = (product: typeof products[0]) => {
    const price = getSelectedPrice(product);
    const sizeLabel = getSelectedSizeLabel(product);
    addToCart({
      id: product.id,
      name: sizeLabel ? `${product.name} (${sizeLabel})` : product.name,
      price,
      image: product.image_url || "",
      storeId: product.stores?.id || "",
      storeName: product.stores?.name || "",
    });
    toast({
      title: "Added to cart",
      description: `${product.name} has been added to your cart`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Beer, Wine, Spirits & Smokes — Shop All | Deliverr Regina"
        description="Shop the full Deliverr catalogue of beer, wine, spirits, ciders, seltzers and tobacco. Same-day delivery in Regina, Saskatchewan."
        canonical="https://regina-delivers-cheers.lovable.app/products"
      />
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              All Products
            </h1>
            <p className="text-muted-foreground">
              Browse {filteredProducts.length} products from Regina's liquor stores
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col lg:flex-row gap-4 mb-8">
            {/* Category Tabs */}
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleCategoryChange(cat.id)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            <div className="flex gap-4 lg:ml-auto">
              <div className="relative flex-1 lg:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Filter className="h-4 w-4" />
                    Sort
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleSortChange("name")}>
                    Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("price-low")}>
                    Price: Low to High
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSortChange("price-high")}>
                    Price: High to Low
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Products Grid — virtualized so only on-screen cards are rendered */}
          {!isLoading && (
            <VirtualizedProductGrid
              items={filteredProducts}
              getKey={({ product }) => product.id}
              renderItem={({ product, storeCount }) => {
                const sizes = getProductSizes(product.id);
                const currentSize = selectedSizes[product.id] || sizes[0]?.pack_size;
                const displayPrice = getSelectedPrice(product);

                return (
                  <div
                    className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all flex flex-col cursor-pointer group h-full"
                    onClick={() => setOpenProductId(product.id)}
                  >
                    <div className="aspect-square overflow-hidden">
                      <img 
                        src={safeImageUrl(product.image_url) || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format&fm=jpg"} 
                        alt={product.name} 
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </div>
                    <div className="p-3 flex flex-col flex-1">
                      <Badge variant="secondary" className="text-xs mb-2 capitalize w-fit">
                        {product.category}
                      </Badge>
                      <h4 className="font-medium text-foreground text-sm mb-1 line-clamp-2">{product.name}</h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {storeCount > 1 ? `Available at ${storeCount} stores` : product.stores?.name}
                      </p>
                      
                      {/* Size Selection Chips */}
                      {sizes.length > 1 && (
                        <div className="flex flex-wrap gap-1 mb-2" onClick={(e) => e.stopPropagation()}>
                          {sizes.map((s: any) => (
                            <button
                              key={`${product.id}-${s.pack_size}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSizes(prev => ({ ...prev, [product.id]: s.pack_size }));
                              }}
                              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                                currentSize === s.pack_size
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border hover:border-primary/50"
                              }`}
                            >
                              {s.pack_size}
                            </button>
                          ))}
                        </div>
                      )}
                      {sizes.length === 1 && (
                        <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full w-fit mb-2">
                          {sizes[0].pack_size}
                        </span>
                      )}

                      <div className="flex items-center justify-between mt-auto">
                        <span className="font-bold text-primary">${displayPrice.toFixed(2)}</span>
                        <Button
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No products found.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />

      <ProductDetailModal
        productId={openProductId}
        open={!!openProductId}
        onOpenChange={(open) => !open && setOpenProductId(null)}
      />
    </div>
  );
};

export default Products;