import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search, Filter, ChevronDown, Plus, ShoppingCart } from "lucide-react";
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
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const allProducts = [
  // Beer
  { id: "b1", name: "Budweiser 24 Pack", price: 42.99, category: "beer", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=300&auto=format" },
  { id: "b2", name: "Kokanee 15 Pack", price: 28.99, category: "beer", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=300&auto=format" },
  { id: "b3", name: "Corona Extra 12 Pack", price: 24.99, category: "beer", store: "Warehouse Spirits", storeId: "2", image: "https://images.unsplash.com/photo-1600857062241-98e5dba7f214?w=300&auto=format" },
  { id: "b4", name: "Heineken 12 Pack", price: 26.99, category: "beer", store: "Crown & Cork", storeId: "3", image: "https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=300&auto=format" },
  { id: "b5", name: "Stella Artois 12 Pack", price: 27.99, category: "beer", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=300&auto=format" },
  { id: "b6", name: "Bud Light 24 Pack", price: 39.99, category: "beer", store: "Warehouse Spirits", storeId: "2", image: "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=300&auto=format" },
  // Wine
  { id: "w1", name: "Barefoot Cabernet Sauvignon", price: 12.99, category: "wine", store: "Crown & Cork", storeId: "3", image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&auto=format" },
  { id: "w2", name: "Yellow Tail Chardonnay", price: 11.99, category: "wine", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1474722883778-792e7990302f?w=300&auto=format" },
  { id: "w3", name: "Apothic Red Blend", price: 14.99, category: "wine", store: "Crown & Cork", storeId: "3", image: "https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=300&auto=format" },
  { id: "w4", name: "Kendall-Jackson Pinot Noir", price: 18.99, category: "wine", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=300&auto=format" },
  // Spirits
  { id: "s1", name: "Smirnoff Vodka 750ml", price: 24.99, category: "spirits", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=300&auto=format" },
  { id: "s2", name: "Jack Daniel's 750ml", price: 34.99, category: "spirits", store: "Warehouse Spirits", storeId: "2", image: "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=300&auto=format" },
  { id: "s3", name: "Captain Morgan Spiced Rum 750ml", price: 28.99, category: "spirits", store: "Crown & Cork", storeId: "3", image: "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=300&auto=format" },
  { id: "s4", name: "Grey Goose Vodka 750ml", price: 44.99, category: "spirits", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1598085961120-39c2a8a76aa3?w=300&auto=format" },
  // Smokes
  { id: "sm1", name: "Marlboro Red King Size", price: 18.99, category: "smokes", store: "Regina Liquor World", storeId: "1", image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=300&auto=format" },
  { id: "sm2", name: "Canadian Classic Blue", price: 16.99, category: "smokes", store: "Warehouse Spirits", storeId: "2", image: "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=300&auto=format" },
];

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

  const filteredProducts = allProducts
    .filter((product) => {
      const matchesCategory = activeCategory === "all" || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "price-low") return a.price - b.price;
      if (sortBy === "price-high") return b.price - a.price;
      return a.name.localeCompare(b.name);
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

  const handleAddToCart = (product: typeof allProducts[0]) => {
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      storeId: product.storeId,
      storeName: product.store,
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

          {/* Products Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredProducts.map((product, index) => (
              <div
                key={product.id}
                className="bg-card rounded-xl border border-border overflow-hidden hover:shadow-lg transition-all animate-fade-in"
                style={{ animationDelay: `${index * 0.03}s` }}
              >
                <div className="aspect-square overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover hover:scale-105 transition-transform" />
                </div>
                <div className="p-3">
                  <Badge variant="secondary" className="text-xs mb-2 capitalize">
                    {product.category}
                  </Badge>
                  <h4 className="font-medium text-foreground text-sm mb-1 line-clamp-2">{product.name}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{product.store}</p>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-primary">${product.price.toFixed(2)}</span>
                    <Button size="sm" className="h-8 w-8 p-0" onClick={() => handleAddToCart(product)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredProducts.length === 0 && (
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