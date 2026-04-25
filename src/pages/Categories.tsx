import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChevronRight, MapPin, Menu, MessageSquare, X } from "lucide-react";
import catLiquor from "@/assets/cat-liquor.png";
import catSmoke from "@/assets/cat-smoke.png";
import catPharmacy from "@/assets/cat-pharmacy.png";
import catPet from "@/assets/cat-pet.png";
import catTakeout from "@/assets/cat-takeout.png";
import catGrocery from "@/assets/cat-grocery.png";

const categories = [
  { id: "liquor", name: "Liquor", image: catLiquor, to: "/stores?category=liquor" },
  { id: "smokes", name: "Smoke & Vape", image: catSmoke, to: "/products?category=smokes" },
  { id: "pharmacy", name: "Pharmacy", image: catPharmacy, to: "/stores?category=pharmacy" },
  { id: "pet", name: "Pet", image: catPet, to: "/products?category=pet_supplies" },
  { id: "takeout", name: "Takeout", image: catTakeout, to: "/stores?category=takeout" },
  { id: "grocery", name: "Grocery", image: catGrocery, to: "/stores?category=grocery" },
];

const Categories = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [address, setAddress] = useState("");
  const [showTip, setShowTip] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("address");
    const stored = localStorage.getItem("delivery_address");
    setAddress(fromQuery || stored || "");
  }, [searchParams]);

  // Always reset horizontal category scroll to the first item on mount
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <div className="bg-background border-b border-border/60">
        <div className="container mx-auto px-4 py-3 max-w-2xl flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <button
            className="p-1.5 -mr-1.5 rounded-lg hover:bg-muted transition"
            aria-label="Chat"
          >
            <MessageSquare className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Clean single-line address pill */}
      <div className="container mx-auto px-4 pt-3 max-w-2xl">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2.5 w-full bg-muted/60 hover:bg-muted rounded-xl px-3.5 py-2.5 transition text-left"
        >
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-[13px] text-muted-foreground shrink-0">Delivering to:</span>
          <span className="text-[13px] font-medium text-foreground truncate flex-1">
            {address || "Add your address"}
          </span>
          <span className="text-xs font-semibold text-primary shrink-0">Change</span>
        </button>
      </div>

      {/* Section heading */}
      <div className="container mx-auto px-4 pt-5 pb-2 max-w-2xl">
        <h1 className="text-base font-semibold text-foreground">Shop by category</h1>
      </div>

      {/* Horizontal category row */}
      <div className="w-full">
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto px-4 pb-3 scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.to}
              className="snap-start shrink-0 flex flex-col items-center group focus:outline-none w-[72px]"
            >
              <div className="w-[60px] h-[60px] rounded-2xl bg-card border border-border/60 shadow-sm flex items-center justify-center transition-all group-hover:shadow-md group-hover:border-primary/30 group-active:scale-95">
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="w-[68%] h-[68%] object-contain"
                  loading="lazy"
                />
              </div>
              <span className="mt-1.5 text-[11px] font-medium text-foreground text-center leading-tight line-clamp-2">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured big tiles (2-col, compact) */}
      <div className="container mx-auto px-4 pt-2 max-w-2xl flex-1">
        <div className="grid grid-cols-2 gap-3 pb-6">
          {categories.slice(0, 4).map((cat) => (
            <Link
              key={`tile-${cat.id}`}
              to={cat.to}
              className="group flex items-center gap-3 bg-card border border-border/60 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-primary/30 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                <img src={cat.image} alt={cat.name} className="w-[75%] h-[75%] object-contain" loading="lazy" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{cat.name}</div>
                <div className="text-[11px] text-muted-foreground">Shop now</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </Link>
          ))}
        </div>

        {showTip && (
          <div className="bg-card border border-border/60 rounded-xl p-4 mb-6 relative shadow-sm">
            <button
              onClick={() => setShowTip(false)}
              className="absolute top-2.5 right-2.5 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-sm font-semibold text-foreground mb-2.5">How it works</h3>
            <ol className="space-y-2 text-[13px] text-muted-foreground">
              {[
                "Select a store & add your items",
                "Confirm your order & pay securely",
                "Our shopper delivers to your door",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
