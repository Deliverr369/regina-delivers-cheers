import { useState, useMemo, useEffect } from "react";
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
import { useInfiniteQuery } from "@tanstack/react-query";
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

/** Pretty label for a raw category id (e.g. "ciders_seltzers" → "Ciders & Seltzers"). */
const categoryLabel = (id?: string | null) => {
  if (!id) return "";
  const match = categories.find((c) => c.id === id.toLowerCase());
  if (match) return match.name;
  return id.replace(/_/g, " & ").replace(/\b\w/g, (m) => m.toUpperCase());
};

/** Catalog names sometimes carry a stray leading dash/space. */
const cleanName = (name?: string | null) => (name || "").replace(/^[\s\-–—]+/, "").trim();

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [openProductId, setOpenProductId] = useState<string | null>(null);
  const { toast } = useToast();
  const { addToCart } = useCart();

  const activeCategory = searchParams.get("category") || "all";
  const sortBy = searchParams.get("sort") || "name";

  // Debounce the search box so typing doesn't fire a request per keystroke
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const PAGE_SIZE = 200;

  // The catalogue is grouped, filtered and sorted in the database and streamed
  // one page at a time — the browser never downloads the whole catalogue.
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["public-catalog", activeCategory, debouncedSearch, sortBy],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const { data, error } = await supabase.rpc("get_public_catalog", {
        _category: activeCategory,
        _search: debouncedSearch || null,
        _sort: sortBy,
        _limit: PAGE_SIZE,
        _offset: pageParam as number,
      });
      if (error) throw error;
      return (data ?? []) as any[];
    },
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length < PAGE_SIZE ? undefined : allPages.length * PAGE_SIZE,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });

  const filteredProducts = useMemo(
    () =>
      (data?.pages.flat() ?? []).map((product: any) => ({
        product,
        storeCount: Number(product.store_count) || 1,
      })),
    [data]
  );

  // Load the next page as the shopper nears the bottom of the grid
  useEffect(() => {
    const onScroll = () => {
      if (!hasNextPage || isFetchingNextPage) return;
      const nearBottom =
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1200;
      if (nearBottom) fetchNextPage();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  const getProductSizes = (product: any): any[] =>
    Array.isArray(product?.pack_prices) ? product.pack_prices : [];

  const getSelectedPrice = (product: any) => {
    const sizes = getProductSizes(product);
    const selectedSize = selectedSizes[product.id];
    if (selectedSize) {
      const match = sizes.find((s: any) => s.pack_size === selectedSize);
      if (match) return Number(match.price);
    }
    if (sizes.length > 0) return Number(sizes[0].price);
    return Number(product.price);
  };

  const getSelectedSizeLabel = (product: any) => {
    const sizes = getProductSizes(product);
    if (sizes.length === 0) return null;
    return selectedSizes[product.id] || sizes[0]?.pack_size;
  };

  const handleAddToCart = (product: any) => {
    const price = getSelectedPrice(product);
    const sizeLabel = getSelectedSizeLabel(product);
    addToCart({
      id: product.id,
      name: sizeLabel ? `${product.name} (${sizeLabel})` : product.name,
      price,
      image: product.image_url || "",
      storeId: product.store_id || "",
      storeName: product.store_name || "",
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
                const sizes = getProductSizes(product);
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