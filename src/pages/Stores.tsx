import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Star, Clock, Search, Filter, ChevronDown, Truck, Store } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import tabLiquor from "@/assets/tab-liquor.png";
import tabSmoke from "@/assets/tab-smoke.png";
import tabTakeout from "@/assets/tab-takeout.png";

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "delivery", label: "Fastest Delivery" },
  { value: "fee", label: "Lowest Fee" },
  { value: "name", label: "Name A-Z" },
];

const Stores = () => {
  const [searchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"liquor" | "smoke" | "takeout">("liquor");

  const SEVEN_ELEVEN_ID = "7d8f97cc-0cf5-44dc-8569-26dbd7959372";
  const SHELL_ID = "97208ee6-3536-4a61-849f-3dcc3ec0e71b";
  const SMOKE_VAPE_IDS = [SEVEN_ELEVEN_ID, SHELL_ID];

  const tabs = [
    { id: "liquor" as const, label: "Liquor stores", icon: tabLiquor },
    { id: "smoke" as const, label: "Smoke & Vape", icon: tabSmoke },
    { id: "takeout" as const, label: "Takeout", icon: tabTakeout },
  ];

  useEffect(() => {
    const paramAddress = searchParams.get("address");
    const savedAddress = localStorage.getItem("delivery_address");
    const addr = paramAddress || savedAddress || "";
    setDeliveryAddress(addr);
    if (paramAddress && !savedAddress) {
      localStorage.setItem("delivery_address", paramAddress);
    }
  }, [searchParams]);

  const { data: stores = [], isLoading } = useQuery({
    queryKey: ["stores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .order("rating", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const tabFilteredStores = stores.filter((store) => {
    if (activeTab === "smoke") return SMOKE_VAPE_IDS.includes(store.id);
    if (activeTab === "takeout") return false;
    return !SMOKE_VAPE_IDS.includes(store.id);
  });

  const filteredStores = tabFilteredStores
    .filter((store) =>
      store.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      store.address.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter((store) => !showOpenOnly || store.is_open)
    .sort((a, b) => {
      if (sortBy === "rating") return (b.rating || 0) - (a.rating || 0);
      if (sortBy === "delivery") return (a.delivery_time || "").localeCompare(b.delivery_time || "");
      if (sortBy === "fee") return (Number(a.delivery_fee) || 0) - (Number(b.delivery_fee) || 0);
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return 0;
    });

  const currentSort = sortOptions.find(s => s.value === sortBy);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-20 pb-16">
        {/* Delivery Address Banner */}
        {deliveryAddress && (
          <div className="bg-primary/10 border-b border-primary/20">
            <div className="container mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0" />
                <span className="text-muted-foreground">Delivering to:</span>
                <span className="font-medium text-foreground truncate max-w-[300px] md:max-w-none">{deliveryAddress}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => {
                  setDeliveryAddress("");
                  localStorage.removeItem("delivery_address");
                }}
              >
                Change
              </Button>
            </div>
          </div>
        )}
        {/* Category Tabs */}
        <div className="bg-background border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-stretch justify-center gap-6 sm:gap-12 overflow-x-auto py-4">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="group relative flex flex-col items-center gap-2 pt-2 pb-3 min-w-[110px] sm:min-w-[140px]"
                  >
                    <img
                      src={tab.icon}
                      alt=""
                      loading="lazy"
                      width={512}
                      height={512}
                      className={`h-20 w-20 sm:h-24 sm:w-24 object-contain transition-transform duration-300 ${
                        isActive ? "scale-105" : "group-hover:scale-105 opacity-90"
                      }`}
                    />
                    <span
                      className={`font-display text-base sm:text-lg whitespace-nowrap transition-colors ${
                        isActive
                          ? "font-bold text-primary"
                          : "font-semibold text-foreground/80 group-hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </span>
                    <span
                      className={`absolute -bottom-px left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary transition-all duration-300 ${
                        isActive ? "w-16 opacity-100" : "w-0 opacity-0"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Page Header */}
        <div className="bg-secondary/50 border-b border-border">
          <div className="container mx-auto px-4 py-8 md:py-10">
            <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-1.5">
              {activeTab === "liquor" && "Liquor Stores in Regina"}
              {activeTab === "smoke" && "Smoke and Vape in Regina"}
              {activeTab === "takeout" && "Takeout in Regina"}
            </h1>
            <p className="text-muted-foreground">
              {activeTab === "takeout"
                ? "Coming soon — restaurant takeout delivery"
                : `Browse and order from ${tabFilteredStores.length} local ${tabFilteredStores.length === 1 ? "store" : "stores"}`}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={showOpenOnly ? "default" : "outline"}
                size="sm"
                className="rounded-full h-10 px-4 text-sm"
                onClick={() => setShowOpenOnly(!showOpenOnly)}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${showOpenOnly ? "bg-primary-foreground" : "bg-success"}`} />
                Open Now
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-10 px-4 text-sm">
                    <Filter className="h-3.5 w-3.5" />
                    {currentSort?.label}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {sortOptions.map((opt) => (
                    <DropdownMenuItem key={opt.value} onClick={() => setSortBy(opt.value)}>
                      {opt.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border animate-pulse">
                  <div className="h-44 bg-muted" />
                  <div className="p-5 space-y-3">
                    <div className="h-5 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2" />
                    <div className="h-4 bg-muted rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stores Grid */}
          {!isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStores.map((store) => (
                <Link
                  key={store.id}
                  to={`/stores/${store.id}`}
                  className="group bg-card rounded-2xl overflow-hidden border border-border card-hover"
                >
                  {/* Image/Logo */}
                  <div className="relative h-44 overflow-hidden bg-gradient-to-br from-secondary/60 to-muted/40 flex items-center justify-center">
                    <img
                      src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format"}
                      alt={store.name}
                      className={`transition-transform duration-500 group-hover:scale-105 ${
                        store.image_url?.includes('.png')
                          ? 'max-h-24 max-w-[55%] object-contain'
                          : 'w-full h-full object-cover'
                      }`}
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {store.is_open ? (
                        <Badge className="bg-success text-white text-xs font-medium shadow-sm">Open</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-medium bg-background/90 backdrop-blur-sm">Closed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="font-display text-lg font-bold text-foreground mb-1.5 group-hover:text-primary transition-colors">
                      {store.name}
                    </h3>
                    

                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <Star className="h-4 w-4 fill-gold text-gold" />
                        <span className="font-semibold text-foreground text-sm">{store.rating}</span>
                        <span className="text-muted-foreground text-xs">({store.reviews_count})</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-muted-foreground text-sm">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {store.delivery_time}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!isLoading && filteredStores.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold text-foreground mb-1">No stores found</h3>
              <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Stores;
