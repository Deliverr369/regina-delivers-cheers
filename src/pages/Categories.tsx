import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { ChevronDown, MapPin, ArrowLeft, X } from "lucide-react";
import catLiquor from "@/assets/cat-liquor.png";
import catSmoke from "@/assets/cat-smoke.png";
import catPharmacy from "@/assets/cat-pharmacy.png";
import catPet from "@/assets/cat-pet.png";
import catTakeout from "@/assets/cat-takeout.png";
import catGrocery from "@/assets/cat-grocery.png";

const categories = [
  { id: "liquor", name: "Liquor Stores", image: catLiquor, halo: "bg-rose-100", to: "/stores?category=liquor" },
  { id: "smokes", name: "Smoke & Vape", image: catSmoke, halo: "bg-purple-100", to: "/products?category=smokes" },
  { id: "pharmacy", name: "Pharmacy", image: catPharmacy, halo: "bg-teal-100", to: "/stores?category=pharmacy" },
  { id: "pet", name: "Pet Supplies", image: catPet, halo: "bg-orange-100", to: "/products?category=pet_supplies" },
  { id: "takeout", name: "Takeout", image: catTakeout, halo: "bg-amber-100", to: "/stores?category=takeout" },
  { id: "grocery", name: "Grocery Stores", image: catGrocery, halo: "bg-emerald-100", to: "/stores?category=grocery" },
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

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 pt-6 pb-10 max-w-2xl">
          <button
            onClick={() => navigate("/")}
            className="p-2 -ml-2 mb-4 rounded-full hover:bg-white/10 transition"
            aria-label="Back"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>

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

          <h1 className="text-2xl md:text-3xl font-semibold mt-8 leading-snug">
            Where would you like to shop today?
          </h1>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-x-5 gap-y-7 pb-10">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.to}
              className="flex flex-col items-center group focus:outline-none"
            >
              <div className="relative aspect-square w-full max-w-[180px] rounded-full bg-white shadow-lg flex items-center justify-center transition-transform group-hover:scale-105 group-active:scale-95">
                <div className={`absolute w-24 h-24 rounded-full ${cat.halo} opacity-70`} />
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="relative w-28 h-28 object-contain"
                  loading="lazy"
                />
              </div>
              <span className="mt-3 text-sm md:text-base font-semibold text-foreground text-center">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>

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
