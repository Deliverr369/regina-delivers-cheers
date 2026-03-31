import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const categories = [
  { id: "all", name: "All Products" },
  { id: "beer", name: "Beer" },
  { id: "wine", name: "Wine" },
  { id: "spirits", name: "Spirits" },
  { id: "smokes", name: "Smokes" },
];

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const { addToCart } = useCart();

  const activeCategory = searchParams.get("category") || "all";
  const sortBy = searchParams.get("sort") || "name";

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["all-products"],
    queryFn: async () => {
      let allProducts: any[] = [];
      let from = 0;
      const batchSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select(`*, stores (id, name)`)
          .eq("in_stock", true)
          .range(from, from + batchSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allProducts = allProducts.concat(data);
        if (data.length < batchSize) break;
        from += batchSize;
      }
      return allProducts;
    },
  });

  // Deduplicate products by name+category, keeping lowest price
  const deduplicatedProducts = (() => {
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
  })();

  const filteredProducts = deduplicatedProducts
    .filter(({ product }) => {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return Number(a.product.price) - Number(b.product.price);
      if (sortBy === "price-high") return Number(b.product.price) - Number(a.product.price);
      return a.product.name.localeCompare(b.product.name);
    });

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

  const handleAddToCart = (product: typeof products[0]) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: Number(product.price),
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

          {/* Products Grid */}
          {!isLoading && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredProducts.map(({ product, storeCount }, index) => (
                <div
                  key={product.id}
                  className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 0.03}s` }}
                >
                  <div className="aspect-square overflow-hidden">
                    <img 
                      src={product.image_url || "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format"} 
                      alt={product.name} 
                      className="w-full h-full object-cover hover:scale-105 transition-transform" 
                    />
                  </div>
                  <div className="p-3">
                    <Badge variant="secondary" className="text-xs mb-2 capitalize">
                      {product.category}
                    </Badge>
                    <h4 className="font-medium text-foreground text-sm mb-1 line-clamp-2">{product.name}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {storeCount > 1 ? `Available at ${storeCount} stores` : product.stores?.name}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary">${Number(product.price).toFixed(2)}</span>
                      <Button size="sm" className="h-8 w-8 p-0" onClick={() => handleAddToCart(product)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No products found.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Products;