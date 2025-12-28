import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star, Clock, Search, Filter, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const allStores = [
  {
    id: "1",
    name: "Regina Liquor World",
    address: "2341 Victoria Ave E, Regina",
    rating: 4.8,
    reviews: 234,
    deliveryTime: "25-35 min",
    deliveryFee: "Free",
    isOpen: true,
    categories: ["Beer", "Wine", "Spirits", "Smokes"],
    image: "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format",
  },
  {
    id: "2",
    name: "Warehouse Spirits",
    address: "1955 11th Ave, Regina",
    rating: 4.6,
    reviews: 189,
    deliveryTime: "30-40 min",
    deliveryFee: "$2.99",
    isOpen: true,
    categories: ["Beer", "Wine", "Spirits"],
    image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&auto=format",
  },
  {
    id: "3",
    name: "Crown & Cork",
    address: "4501 Gordon Rd, Regina",
    rating: 4.9,
    reviews: 312,
    deliveryTime: "35-45 min",
    deliveryFee: "Free",
    isOpen: true,
    categories: ["Wine", "Spirits"],
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format",
  },
  {
    id: "4",
    name: "The Liquor Barn",
    address: "789 Albert St, Regina",
    rating: 4.5,
    reviews: 156,
    deliveryTime: "20-30 min",
    deliveryFee: "$1.99",
    isOpen: true,
    categories: ["Beer", "Smokes"],
    image: "https://images.unsplash.com/photo-1574015974293-817f0ebebb74?w=500&auto=format",
  },
  {
    id: "5",
    name: "Prairie Wines & Spirits",
    address: "1234 Broad St, Regina",
    rating: 4.7,
    reviews: 203,
    deliveryTime: "30-40 min",
    deliveryFee: "Free",
    isOpen: false,
    categories: ["Wine", "Spirits"],
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&auto=format",
  },
  {
    id: "6",
    name: "Capital City Liquor",
    address: "567 Rochdale Blvd, Regina",
    rating: 4.4,
    reviews: 98,
    deliveryTime: "25-35 min",
    deliveryFee: "$2.49",
    isOpen: true,
    categories: ["Beer", "Wine", "Spirits", "Smokes"],
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format",
  },
];

const Stores = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");

  const filteredStores = allStores
    .filter((store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "delivery") return a.deliveryTime.localeCompare(b.deliveryTime);
      return 0;
    });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">
              Liquor Stores in Regina
            </h1>
            <p className="text-muted-foreground">
              Browse and order from {allStores.length} local stores
            </p>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Sort by
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSortBy("rating")}>
                  Highest Rated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("delivery")}>
                  Fastest Delivery
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Stores Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store, index) => (
              <Link
                key={store.id}
                to={`/stores/${store.id}`}
                className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border animate-fade-in"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={store.image}
                    alt={store.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-4 left-4 flex gap-2">
                    {store.isOpen ? (
                      <Badge className="bg-success text-white">Open Now</Badge>
                    ) : (
                      <Badge variant="secondary">Closed</Badge>
                    )}
                    {store.deliveryFee === "Free" && (
                      <Badge className="bg-primary text-primary-foreground">Free Delivery</Badge>
                    )}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-display text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                    {store.name}
                  </h3>
                  
                  <div className="flex items-center gap-2 text-muted-foreground mb-3">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{store.address}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {store.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="text-xs">
                        {cat}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        <span className="font-medium text-foreground">{store.rating}</span>
                      </div>
                      <span className="text-muted-foreground text-sm">({store.reviews})</span>
                    </div>
                    
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm">{store.deliveryTime}</span>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredStores.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No stores found matching your search.</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Stores;