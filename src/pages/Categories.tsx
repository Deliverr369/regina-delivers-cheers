import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronDown, MapPin, ArrowLeft, X } from "lucide-react";
import { Wine, ShoppingBasket, UtensilsCrossed, Cigarette, Pill, PawPrint } from "lucide-react";

type Category = {
  key: string;
  label: string;
  icon: typeof Wine;
  iconBg: string;
  iconColor: string;
  to: string;
  enabled: boolean;
};

const categories: Category[] = [
  { key: "liquor", label: "Liquor stores", icon: Wine, iconBg: "bg-rose-50", iconColor: "text-rose-500", to: "/stores", enabled: true },
  { key: "grocery", label: "Grocery stores", icon: ShoppingBasket, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", to: "/stores?category=grocery", enabled: false },
  { key: "takeout", label: "Takeout", icon: UtensilsCrossed, iconBg: "bg-amber-50", iconColor: "text-amber-600", to: "/stores?category=takeout", enabled: false },
  { key: "smoke", label: "Smoke shops", icon: Cigarette, iconBg: "bg-slate-100", iconColor: "text-slate-600", to: "/stores?category=smoke", enabled: false },
  { key: "pharmacy", label: "Pharmacy", icon: Pill, iconBg: "bg-sky-50", iconColor: "text-sky-600", to: "/stores?category=pharmacy", enabled: false },
  { key: "pets", label: "Pet supplies", icon: PawPrint, iconBg: "bg-violet-50", iconColor: "text-violet-600", to: "/stores?category=pets", enabled: false },
];

const Categories = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [address, setAddress] = useState("");
  const [showTip, setShowTip] = useState(true);

  useEffect(() => {
    const fromQuery = searchParams.get("address");
    const stored = localStorage.getItem("delivery_address");
    setAddress(fromQuery || stored || "");
  }, [searchParams]);

  const handlePick = (cat: Category) => {
    if (!cat.enabled) return;
    navigate(cat.to);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Coral header */}
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 pt-6 pb-10 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate("/")}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition"
              aria-label="Back"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          </div>

          <button
            onClick={() => navigate("/")}
            className="flex items-start gap-2 text-left w-full group"
          >
            <MapPin className="h-5 w-5 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold tracking-wide opacity-90">HOME</div>
              <div className="text-sm font-semibold truncate uppercase opacity-95">
                {address || "Add your delivery address"}
              </div>
            </div>
            <ChevronDown className="h-5 w-5 mt-1 shrink-0 opacity-90 group-hover:opacity-100" />
          </button>

          <h1 className="text-2xl md:text-3xl font-semibold mt-8 mb-2 leading-snug">
            Where would you like to shop today?
          </h1>
        </div>
      </div>

      {/* Category circles grid */}
      <div className="container mx-auto px-4 -mt-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-x-6 gap-y-8 pb-10">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.key}
                onClick={() => handlePick(cat)}
                disabled={!cat.enabled}
                className="flex flex-col items-center group focus:outline-none"
              >
                <div
                  className={`relative aspect-square w-full max-w-[180px] rounded-full bg-white shadow-lg flex items-center justify-center transition-transform ${
                    cat.enabled ? "group-hover:scale-105 group-active:scale-95" : "opacity-60"
                  }`}
                >
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${cat.iconBg}`}>
                    <Icon className={`h-12 w-12 ${cat.iconColor}`} strokeWidth={1.5} />
                  </div>
                  {!cat.enabled && (
                    <span className="absolute top-2 right-2 bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      SOON
                    </span>
                  )}
                </div>
                <span className="mt-3 text-sm md:text-base font-semibold text-foreground text-center">
                  {cat.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* How it works tip */}
        {showTip && (
          <div className="bg-teal-600 text-white rounded-lg p-5 mb-10 relative">
            <button
              onClick={() => setShowTip(false)}
              className="absolute top-3 right-3 p-1 rounded hover:bg-white/10"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
            <h3 className="text-lg font-semibold mb-3">It's very simple to use</h3>
            <ol className="space-y-2 text-sm">
              {[
                "Select a store & add or type in your items",
                "Confirm your order & pay online securely",
                "Our shopper shops for & delivers your items",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
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
