import { useState, useEffect, useRef } from "react";
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
import { useIsNative } from "@/hooks/useIsNative";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import tabLiquor from "@/assets/tab-liquor.png";
import tabSmoke from "@/assets/tab-smoke.png";
import tabTakeout from "@/assets/tab-takeout.png";
import tabPharmacy from "@/assets/tab-pharmacy.png";
import tabPet from "@/assets/tab-pet.png";
import tabGrocery from "@/assets/tab-grocery.png";

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "delivery", label: "Fastest Delivery" },
  { value: "fee", label: "Lowest Fee" },
  { value: "name", label: "Name A-Z" },
];

const Stores = () => {
  const [searchParams] = useSearchParams();
  const isNative = useIsNative();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"liquor" | "smoke" | "pharmacy" | "takeout" | "pet" | "grocery">("liquor");
  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // iOS-only: always reset category scroll to the very first tab on mount
  useEffect(() => {
    if (isNative && tabsScrollRef.current) {
      tabsScrollRef.current.scrollLeft = 0;
    }
  }, [isNative]);

  const SEVEN_ELEVEN_ID = "7d8f97cc-0cf5-44dc-8569-26dbd7959372";
  const SHELL_ID = "97208ee6-3536-4a61-849f-3dcc3ec0e71b";
  const SMOKE_VAPE_IDS = [SEVEN_ELEVEN_ID, SHELL_ID];
  const PHARMACY_IDS = [
    "862492f3-afd1-48a0-bca0-463b38e9652a", // Shoppers Drug Mart
    "f8475958-335b-410b-906b-8795898cc19d", // Rexall
    "2e4f3a01-a5c2-4780-ad04-7a288f90b864", // London Drugs
  ];
  const PET_IDS = [
    "c7592e95-851f-4eaf-a8de-8fbe8337cafe", // PetSmart
  ];
  const TAKEOUT_IDS = [
    "ae44e7e4-1b47-4936-a2df-c92bcf17d9a7", // A&W
    "4e1b49ec-6588-4b4b-b439-d94a845029a9", // McDonald's
    "b14b2c6d-ef00-4bb0-a5b4-aacc4b1bb27a", // Burger King
    "5f7deea5-2c47-49de-a817-78f610d5ddde", // Dairy Queen
    "4eaa6199-6fff-4a8d-ae70-59a2c62d1de6", // Five Guys
  ];

  const tabs = [
    { id: "liquor" as const, label: "Liquor stores", icon: tabLiquor },
    { id: "smoke" as const, label: "Smoke & Vape", icon: tabSmoke },
    { id: "pharmacy" as const, label: "Pharmacy", icon: tabPharmacy },
    { id: "takeout" as const, label: "Takeout", icon: tabTakeout },
    { id: "pet" as const, label: "Pet Supplies", icon: tabPet },
    { id: "grocery" as const, label: "Grocery", icon: tabGrocery },
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

  const GROCERY_IDS: string[] = [];

  const tabFilteredStores = stores.filter((store) => {
    if (activeTab === "smoke") return SMOKE_VAPE_IDS.includes(store.id);
    if (activeTab === "pharmacy") return PHARMACY_IDS.includes(store.id);
    if (activeTab === "pet") return PET_IDS.includes(store.id);
    if (activeTab === "takeout") return TAKEOUT_IDS.includes(store.id);
    if (activeTab === "grocery") return GROCERY_IDS.includes(store.id);
    return !SMOKE_VAPE_IDS.includes(store.id) && !PHARMACY_IDS.includes(store.id) && !PET_IDS.includes(store.id) && !TAKEOUT_IDS.includes(store.id) && !GROCERY_IDS.includes(store.id);
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
      
      <main className={`pb-16 ${isNative ? "pt-16 safe-top" : "pt-20"}`}>
        {/* Delivery Address Banner */}
        {deliveryAddress && (
          isNative ? (
            // iOS: compact single-line bar, neutral background
            <div className="bg-muted/50 border-b border-border">
              <div className="px-4 py-2 flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="flex-1 text-[13px] font-medium text-foreground truncate">
                  {deliveryAddress}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryAddress("");
                    localStorage.removeItem("delivery_address");
                  }}
                  className="text-[12px] font-semibold text-primary shrink-0 px-1"
                >
                  Change
                </button>
              </div>
            </div>
          ) : (
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
          )
        )}
        {/* Category Tabs */}
        <div className="bg-background border-b border-border">
          <div className={isNative ? "px-2" : "container mx-auto px-4"}>
            <div
              ref={tabsScrollRef}
              className={`flex items-stretch overflow-x-auto ${
                isNative
                  ? "justify-start gap-2 py-2"
                  : "justify-center gap-6 sm:gap-12 py-4"
              }`}
            >
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`group relative flex flex-col items-center ${
                      isNative
                        ? "gap-1 pt-1 pb-2 min-w-[72px]"
                        : "gap-2 pt-2 pb-3 min-w-[110px] sm:min-w-[140px]"
                    }`}
                  >
                    <img
                      src={tab.icon}
                      alt=""
                      loading="lazy"
                      width={512}
                      height={512}
                      className={`object-contain transition-transform duration-300 ${
                        isNative ? "h-12 w-12" : "h-20 w-20 sm:h-24 sm:w-24"
                      } ${isActive ? "scale-105" : "group-hover:scale-105 opacity-90"}`}
                    />
                    <span
                      className={`font-display whitespace-nowrap transition-colors ${
                        isNative ? "text-[11px]" : "text-base sm:text-lg"
                      } ${
                        isActive
                          ? "font-bold text-primary"
                          : "font-semibold text-foreground/80 group-hover:text-foreground"
                      }`}
                    >
                      {tab.label}
                    </span>
                    <span
                      className={`absolute -bottom-px left-1/2 -translate-x-1/2 h-[3px] rounded-full bg-primary transition-all duration-300 ${
                        isActive ? (isNative ? "w-8 opacity-100" : "w-16 opacity-100") : "w-0 opacity-0"
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
          <div className={isNative ? "px-4 py-3" : "container mx-auto px-4 py-8 md:py-10"}>
            <h1 className={`font-display font-bold text-foreground mb-1.5 ${isNative ? "text-lg" : "text-3xl md:text-4xl"}`}>
              {activeTab === "liquor" && "Liquor Stores in Regina"}
              {activeTab === "smoke" && "Smoke and Vape in Regina"}
              {activeTab === "pharmacy" && "Pharmacies in Regina"}
              {activeTab === "takeout" && "Takeout in Regina"}
              {activeTab === "pet" && "Pet Supplies in Regina"}
              {activeTab === "grocery" && "Grocery Stores in Regina"}
            </h1>
            <p className={`text-muted-foreground ${isNative ? "text-xs" : ""}`}>
              {`Browse and order from ${tabFilteredStores.length} local ${tabFilteredStores.length === 1 ? "restaurant" : tabFilteredStores.length === 0 ? "spots" : activeTab === "takeout" ? "restaurants" : "stores"}`}
            </p>
          </div>
        </div>

        <div className={isNative ? "px-4 py-4" : "container mx-auto px-4 py-6"}>
          {/* Search and Filters */}
          <div className={`flex gap-2 mb-4 ${isNative ? "flex-row items-center" : "flex-col sm:flex-row gap-3 mb-6"}`}>
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={isNative ? "pl-10 h-9 rounded-xl text-sm" : "pl-10 h-10"}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={showOpenOnly ? "default" : "outline"}
                size="sm"
                className={`rounded-full px-3 text-xs ${isNative ? "h-9" : "h-10 px-4 text-sm"}`}
                onClick={() => setShowOpenOnly(!showOpenOnly)}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${showOpenOnly ? "bg-primary-foreground" : "bg-success"}`} />
                Open Now
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className={`gap-1 px-3 text-xs ${isNative ? "h-9 rounded-full" : "h-10 px-4 text-sm gap-1.5"}`}>
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
            <div className={`grid gap-3 ${isNative ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"}`}>
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
            <div className={`grid gap-3 ${isNative ? "grid-cols-2" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"}`}>
              {filteredStores.map((store) => {
                const heroPerStore: Record<string, string> = {
                  "194b9050-c0b3-4d8a-af11-bb74a480c431": "/images/stores/costco-storefront.png", // Costco
                  "25e9b4a8-850a-4d26-9aad-54c9eb2f183a": "/images/stores/superstore-storefront.png", // Superstore
                  "334b6260-b35b-404b-9645-b1bfe0fcd667": "/images/stores/willowpark-storefront.png", // Willow Park
                  "f01dc982-5e14-4ffa-b873-e7b369a44ca4": "/images/stores/coop-storefront.png", // Co-op
                  "27d251bc-7047-4065-b16c-03b12d67d3c7": "/images/stores/sobeys-storefront.png", // Sobeys Liquor
                };
                const useStorefrontLayout = activeTab === "liquor";
                const heroSrc = useStorefrontLayout ? heroPerStore[store.id] : null;

                return (
                <Link
                  key={store.id}
                  to={`/stores/${store.id}`}
                  className={`group bg-card overflow-hidden border border-border card-hover ${isNative ? "rounded-xl shadow-sm" : "rounded-2xl"}`}
                >
                  {/* Hero - storefront photo (liquor) or brand logo (others) */}
                  <div className={`relative overflow-hidden ${isNative ? "h-28" : "h-44"} ${useStorefrontLayout && heroSrc ? "" : "bg-gradient-to-br from-secondary/60 to-muted/40 flex items-center justify-center"}`}>
                    {useStorefrontLayout && heroSrc ? (
                      <>
                        <img
                          src={heroSrc}
                          alt={`${store.name} storefront`}
                          loading="lazy"
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </>
                    ) : (
                      <img
                        src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format"}
                        alt={store.name}
                        loading="lazy"
                        className={`transition-transform duration-500 group-hover:scale-105 ${
                          store.image_url?.includes(".png")
                            ? "max-h-24 max-w-[55%] object-contain"
                            : "w-full h-full object-cover"
                        }`}
                      />
                    )}
                    <div className="absolute top-3 left-3 flex gap-2">
                      {store.is_open ? (
                        <Badge className="bg-success text-white text-xs font-medium shadow-sm">Open</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs font-medium bg-background/90 backdrop-blur-sm">Closed</Badge>
                      )}
                    </div>
                  </div>

                  {/* Content - overlapping logo only for liquor storefront layout (web) */}
                  <div className={`relative ${isNative ? "p-3" : "p-5"} ${useStorefrontLayout && heroSrc && !isNative ? "pt-7" : ""}`}>
                    {useStorefrontLayout && heroSrc && store.image_url && !isNative && (
                      <div className="absolute -top-8 left-5 h-16 w-16 rounded-2xl bg-card border border-border shadow-md flex items-center justify-center overflow-hidden">
                        <img
                          src={store.image_url}
                          alt={`${store.name} logo`}
                          className="max-h-12 max-w-12 object-contain"
                        />
                      </div>
                    )}
                    <h3 className={`font-display font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate ${
                      isNative
                        ? "text-sm"
                        : `text-lg mb-1.5 ${useStorefrontLayout && heroSrc ? "pl-20" : ""}`
                    }`}>
                      {store.name}
                    </h3>

                    <div className={`flex items-center gap-2 ${isNative ? "text-xs text-muted-foreground" : "justify-between pt-3 mt-2 border-t border-border"}`}>
                      <div className="flex items-center gap-1">
                        <Star className={`fill-gold text-gold ${isNative ? "h-3 w-3" : "h-4 w-4"}`} />
                        <span className={`font-semibold text-foreground ${isNative ? "text-xs" : "text-sm"}`}>{store.rating}</span>
                        {!isNative && <span className="text-muted-foreground text-xs">({store.reviews_count})</span>}
                      </div>
                      {isNative && <span aria-hidden>•</span>}
                      <div className={`flex items-center gap-1 text-muted-foreground ${isNative ? "text-xs" : "gap-3 text-sm"}`}>
                        <Clock className={isNative ? "h-3 w-3" : "h-3.5 w-3.5"} />
                        {store.delivery_time}
                      </div>
                    </div>
                  </div>
                </Link>
                );
              })}
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

      {!isNative && <Footer />}
    </div>
  );
};

export default Stores;
