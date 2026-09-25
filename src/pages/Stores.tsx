import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Star, Clock, Search, Filter, ChevronDown, ChevronRight, Truck, Store, Home, Tag } from "lucide-react";
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
import { useStoreOpenNow } from "@/hooks/useStoreOpenNow";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEO } from "@/components/seo/SEO";
import tabLiquor from "@/assets/tab-liquor.webp";
import tabSmoke from "@/assets/tab-smoke.webp";
import tabTakeout from "@/assets/tab-takeout.webp";
import tabPharmacy from "@/assets/tab-pharmacy.webp";
import tabPet from "@/assets/tab-pet.webp";
import tabGrocery from "@/assets/tab-grocery.webp";

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "delivery", label: "Fastest Delivery" },
  { value: "fee", label: "Lowest Fee" },
  { value: "name", label: "Name A-Z" },
];

const Stores = () => {
  const [searchParams] = useSearchParams();
  const isNative = useIsNative();
  const { isOpen: isStoreOpen } = useStoreOpenNow();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [showOpenOnly, setShowOpenOnly] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [activeTab, setActiveTab] = useState<"liquor" | "smoke" | "pharmacy" | "takeout" | "pet" | "grocery">("liquor");
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsCanScrollRight, setTabsCanScrollRight] = useState(false);

  const updateTabsScrollCue = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setTabsCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  };

  // iOS-only: always reset category scroll to the very first tab on mount
  useEffect(() => {
    if (isNative && tabsScrollRef.current) {
      tabsScrollRef.current.scrollLeft = 0;
    }
  }, [isNative]);

  // Keep the "more categories" scroll cue in sync with mount/resize
  useEffect(() => {
    updateTabsScrollCue();
    window.addEventListener("resize", updateTabsScrollCue);
    return () => window.removeEventListener("resize", updateTabsScrollCue);
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
    { id: "liquor" as const, label: "Liquor", icon: tabLiquor },
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

  const GROCERY_IDS: string[] = [
    "a995b76a-8803-48de-b113-71e5c2dc76c7", // Walmart
    "caca1d1d-b3d2-4d9a-958f-c82b28a07733", // Your Independent Grocer
    "9ac0c80e-7c15-43ad-945f-614db9f92e58", // M&M Food Market
    "a74d6912-0e46-4c31-8a93-3dbfbfca6526", // No Frills
    "b38a57c1-507f-4431-938b-5b0fc3cee1be", // Real Canadian Superstore
  ];

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
    .filter((store) => !showOpenOnly || isStoreOpen(store.id, store.is_open))
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
      <SEO
        title="Liquor Stores in Regina | Order for Delivery | Deliverr"
        description="Browse Regina's top liquor, smoke, pharmacy, pet and grocery stores. Order online for fast same-day delivery across Regina, SK."
        canonical="https://regina-delivers-cheers.lovable.app/stores"
      />
      <Header />
      
      <main className={`pb-16 ${isNative ? "pt-header bg-background" : "pt-20"}`}>
        {isNative ? (
          <>
            {/* iOS: Coral brand header (address + category icons) */}
            <div className="bg-primary text-primary-foreground">
              {/* Address row */}
              {deliveryAddress ? (
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryAddress("");
                    localStorage.removeItem("delivery_address");
                  }}
                  className="w-full px-4 pt-3 pb-2 flex items-center gap-2 text-left active:opacity-80"
                >
                  <Home className="h-3.5 w-3.5 shrink-0 opacity-90" />
                  <span className="text-[11px] font-bold tracking-wider opacity-90">HOME</span>
                  <span className="opacity-60">·</span>
                  <span className="flex-1 text-[13px] font-medium truncate">
                    {deliveryAddress}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-90 shrink-0" />
                </button>
              ) : (
                <div className="px-4 pt-3 pb-2 flex items-center gap-2 text-[13px] opacity-90">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Set your delivery address</span>
                </div>
              )}

              {/* Category icons - horizontal scroll, all 6 tappable */}
              <div
                ref={tabsScrollRef}
                className="flex items-stretch overflow-x-auto gap-0.5 px-3 pb-2 pt-1"
                style={{ scrollbarWidth: "none" }}
              >
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className="group flex flex-col items-center gap-0.5 min-w-[56px] py-1 px-0.5 active:opacity-80"
                    >
                      <div
                        className={`h-10 w-10 rounded-xl flex items-center justify-center transition-all ${
                          isActive
                            ? "bg-white shadow-md ring-2 ring-white/60"
                            : "bg-white/95"
                        }`}
                      >
                        <img
                          src={tab.icon}
                          alt=""
                          loading="lazy"
                          width={512}
                          height={512}
                          className="h-7 w-7 object-contain"
                        />
                      </div>
                      <span
                        className={`text-[9px] leading-tight text-center whitespace-nowrap ${
                          isActive ? "font-bold" : "font-semibold opacity-90"
                        }`}
                      >
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* iOS: Promo banner */}
            <div className="px-4 pt-3">
              <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/15 px-4 py-3 flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-foreground leading-tight">FREE DELIVERY</p>
                  <p className="text-[11.5px] text-muted-foreground leading-tight mt-0.5">On orders over $100</p>
                </div>
                <Tag className="h-4 w-4 text-primary/70 ml-auto shrink-0" />
              </div>
            </div>

            {/* iOS: Section title */}
            <div className="px-4 pt-4 pb-1">
              <h1 className="text-[17px] font-display font-bold text-foreground">
                {activeTab === "liquor" && "Featured Liquor Stores"}
                {activeTab === "smoke" && "Smoke & Vape"}
                {activeTab === "pharmacy" && "Pharmacies"}
                {activeTab === "takeout" && "Takeout"}
                {activeTab === "pet" && "Pet Supplies"}
                {activeTab === "grocery" && "Grocery Stores"}
              </h1>
              <p className="text-[11.5px] text-muted-foreground mt-0.5">
                {tabFilteredStores.length === 0
                  ? "Coming soon to Regina"
                  : `${tabFilteredStores.length} ${tabFilteredStores.length === 1 ? "spot" : "spots"} delivering near you`}
              </p>
            </div>
          </>
        ) : (
          <>
            {/* Delivery Address Banner (web) */}
            {deliveryAddress && (
              <div className="bg-primary/10 border-b border-primary/20">
                <div className="container mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-sm min-w-0 flex-1">
                    <MapPin className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap">Delivering to</span>
                    <span className="font-medium text-foreground truncate">{deliveryAddress}</span>
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
            {/* Category Tabs (web) */}
            <div className="bg-background border-b border-border">
              <div className="container mx-auto px-4 relative">
                <div
                  ref={tabsScrollRef}
                  onScroll={updateTabsScrollCue}
                  className="flex items-stretch overflow-x-auto no-scrollbar snap-x justify-start md:justify-center gap-1 sm:gap-8 md:gap-12 py-1.5 sm:py-4 -mx-4 px-4 sm:mx-0 sm:px-0"
                >
                  {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className="group relative flex flex-col items-center gap-0.5 sm:gap-2 pt-1 pb-2 sm:pt-1.5 sm:pb-3 min-w-[56px] sm:min-w-[140px] shrink-0 snap-start"
                      >
                        <img
                          src={tab.icon}
                          alt=""
                          loading="lazy"
                          width={512}
                          height={512}
                          className={`object-contain transition-transform duration-300 h-9 w-9 sm:h-24 sm:w-24 ${isActive ? "scale-105" : "group-hover:scale-105 opacity-90"}`}
                        />
                        <span
                          className={`font-display whitespace-nowrap transition-colors text-[10px] sm:text-lg ${
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
                {/* Scroll cue: right-edge fade + chevron when more categories exist */}
                {tabsCanScrollRight && (
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:hidden bg-gradient-to-l from-background via-background/80 to-transparent flex items-center justify-end pr-1">
                    <ChevronRight className="h-4 w-4 text-muted-foreground animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Page Header (web) */}
            <div className="bg-muted/30 border-b border-border/60">
                <div className="container mx-auto px-4 py-4 sm:py-10 md:py-12">
                <h1 className="font-display font-bold text-foreground mb-1 sm:mb-2 text-xl sm:text-3xl md:text-[2.5rem] leading-tight tracking-tight">
                  {activeTab === "liquor" && "Liquor Stores in Regina"}
                  {activeTab === "smoke" && "Smoke and Vape in Regina"}
                  {activeTab === "pharmacy" && "Pharmacies in Regina"}
                  {activeTab === "takeout" && "Takeout in Regina"}
                  {activeTab === "pet" && "Pet Supplies in Regina"}
                  {activeTab === "grocery" && "Grocery Stores in Regina"}
                </h1>
                <p className="text-muted-foreground text-xs sm:text-[15px] leading-relaxed">
                  {`Browse and order from ${tabFilteredStores.length} local ${tabFilteredStores.length === 1 ? "restaurant" : tabFilteredStores.length === 0 ? "spots" : activeTab === "takeout" ? "restaurants" : "stores"}`}
                </p>
              </div>
            </div>
          </>
        )}

        <div className={isNative ? "px-4 py-3" : "container mx-auto px-4 py-3 sm:py-8"}>
          {/* Search and Filters */}
          <div className={`flex gap-2 mb-3 sm:mb-8 ${isNative ? "flex-row items-center" : "flex-col sm:flex-row sm:items-center sm:gap-3"}`}>
            <div className="relative flex-1 min-w-0">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground ${isNative ? "h-4 w-4" : "h-[18px] w-[18px]"}`} />
              <Input
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={
                  isNative
                    ? "pl-10 h-9 rounded-xl text-sm"
                    : "pl-10 h-10 sm:pl-11 sm:h-11 rounded-lg sm:rounded-xl text-[15px] bg-card border-border/70 shadow-sm focus-visible:ring-primary/30 focus-visible:border-primary/40 transition-shadow"
                }
              />
            </div>

            <div className="flex gap-2 shrink-0 overflow-x-auto no-scrollbar">
              <Button
                variant={showOpenOnly ? "default" : "outline"}
                size="sm"
                className={`rounded-full text-xs transition-all ${
                  isNative
                    ? "h-9 px-3"
                    : `h-9 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm shadow-sm ${showOpenOnly ? "" : "bg-card hover:bg-muted/60 border-border/70"}`
                }`}
                onClick={() => setShowOpenOnly(!showOpenOnly)}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${showOpenOnly ? "bg-primary-foreground" : "bg-success"}`} />
                Open Now
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`gap-1 text-xs rounded-full transition-all ${
                      isNative
                        ? "h-9 px-3"
                        : "h-9 sm:h-11 px-3 sm:px-4 text-xs sm:text-sm gap-1.5 bg-card hover:bg-muted/60 border-border/70 shadow-sm"
                    }`}
                  >
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
            <div className={`grid gap-2 sm:gap-6 ${isNative ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card rounded-lg sm:rounded-2xl overflow-hidden border border-border/60 shadow-sm animate-pulse flex sm:block p-2 sm:p-0 gap-3">
                  <div className="h-20 w-20 sm:h-48 sm:w-full rounded-md sm:rounded-none bg-muted shrink-0" />
                  <div className="p-2 sm:p-5 space-y-3 flex-1">
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
            <div className={`grid gap-2.5 sm:gap-6 ${isNative ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"}`}>
              {filteredStores.map((store) => {
                const isComingSoon =
                  store.id === "194b9050-c0b3-4d8a-af11-bb74a480c431" ||
                  store.name.toLowerCase().includes("costco liquor");
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
                  to={isComingSoon ? "#" : `/stores/${store.id}`}
                  onClick={(event) => {
                    if (isComingSoon) event.preventDefault();
                  }}
                  aria-disabled={isComingSoon}
                  tabIndex={isComingSoon ? -1 : undefined}
                  className={`group bg-card overflow-hidden flex flex-row sm:flex-col h-full p-2 sm:p-0 gap-3 sm:gap-0 transition-all duration-200 ease-out ${
                    isComingSoon ? "grayscale opacity-55 cursor-not-allowed" : ""
                  } ${
                    isNative
                       ? "rounded-lg shadow-sm border border-border"
                      : `rounded-2xl border border-border/60 shadow-[0_6px_16px_rgba(0,0,0,0.06)] ${isComingSoon ? "" : "hover:shadow-[0_14px_30px_rgba(0,0,0,0.10)] hover:-translate-y-1 hover:border-border"}`
                  }`}
                >
                  {/* Hero - storefront photo (liquor) or brand logo (others) */}
                  <div className={`relative overflow-hidden shrink-0 h-[88px] w-[88px] sm:h-48 sm:w-full rounded-md sm:rounded-none ${useStorefrontLayout && heroSrc ? "" : "bg-[hsl(var(--primary-soft))] flex items-center justify-center p-2 sm:p-4"}`}>
                    {useStorefrontLayout && heroSrc ? (
                      <>
                        <img
                          src={heroSrc}
                          alt={`${store.name} storefront`}
                          loading="lazy"
                          className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
                      </>
                    ) : (
                      <img
                        src={store.image_url || "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=500&auto=format"}
                        alt={store.name}
                        loading="lazy"
                        className={`transition-transform duration-500 group-hover:scale-[1.04] ${
                          store.image_url?.includes(".png")
                            ? "max-h-28 max-w-[55%] object-contain"
                            : "w-full h-full object-cover"
                        }`}
                      />
                    )}
                    <div className="absolute top-1 left-1 sm:top-3 sm:left-3 flex gap-2">
                      {isComingSoon ? (
                        <Badge variant="secondary" className="rounded px-1.5 py-0.5 sm:rounded-full sm:px-3 sm:py-1 text-[9px] sm:text-[11px] font-bold border border-border bg-background text-foreground shadow-sm">
                          Coming soon
                        </Badge>
                      ) : isStoreOpen(store.id, store.is_open) ? (
                        <Badge className="rounded bg-background/95 text-success border border-success/30 px-1.5 py-0.5 sm:rounded-full sm:px-2.5 text-[9px] sm:text-[11px] font-bold shadow-md hover:bg-background/95">
                          <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-success" />
                          Open
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="rounded sm:rounded-full text-[9px] sm:text-[11px] font-semibold px-1.5 sm:px-2.5 py-0.5 bg-background/90 text-muted-foreground border border-border/60 backdrop-blur-sm">
                          Closed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Content - overlapping logo only for liquor storefront layout (web) */}
                  <div className={`relative flex-1 flex flex-col min-w-0 py-0.5 pr-1 sm:p-5 ${useStorefrontLayout && heroSrc && !isNative ? "sm:pt-7" : ""}`}>
                    {useStorefrontLayout && heroSrc && store.image_url && !isNative && (
                      <div className="absolute -top-8 left-5 h-16 w-16 rounded-2xl bg-card border border-border/70 shadow-md hidden sm:flex items-center justify-center overflow-hidden">
                        <img
                          src={store.image_url}
                          alt={`${store.name} logo`}
                          className="max-h-12 max-w-12 object-contain"
                        />
                      </div>
                    )}
                    <h3 className={`font-display font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 sm:truncate text-sm leading-tight mb-1 sm:text-[19px] sm:leading-snug sm:mb-2 ${useStorefrontLayout && heroSrc && !isNative ? "sm:pl-20" : ""}`}>
                      {store.name}
                    </h3>

                    {isComingSoon && (
                      <span className="hidden sm:inline-flex mb-3 min-h-9 items-center justify-center rounded-md border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground">
                        Coming soon
                      </span>
                    )}

                    <div className="flex items-center justify-between gap-2 mt-auto text-[11px] text-muted-foreground sm:pt-3 sm:border-t sm:border-border/60">
                      <div className="flex items-center gap-1">
                        <Star className="fill-gold text-gold h-3 w-3 sm:h-[15px] sm:w-[15px]" />
                        <span className="font-semibold text-foreground text-[11px] sm:text-sm">{store.rating}</span>
                        <span className="hidden sm:inline text-muted-foreground/80 text-xs font-medium">({store.reviews_count})</span>
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground text-[10px] sm:gap-1.5 sm:text-[13px] font-medium whitespace-nowrap">
                        <Clock className="h-3 w-3 sm:h-[14px] sm:w-[14px]" />
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
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Store className="h-8 w-8 text-muted-foreground" />
              </div>
              {tabFilteredStores.length === 0 ? (
                <>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">Coming soon to Regina</h3>
                  <p className="text-muted-foreground text-sm px-6">
                    We're working hard to bring this category to Deliverr. Check back soon!
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-display text-lg font-bold text-foreground mb-1">No stores found</h3>
                  <p className="text-muted-foreground text-sm">Try adjusting your search or filters</p>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {!isNative && <Footer />}
    </div>
  );
};

export default Stores;
