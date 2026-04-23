import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import catLiquor from "@/assets/cat-liquor.png";
import catSmoke from "@/assets/cat-smoke.png";
import catPharmacy from "@/assets/cat-pharmacy.png";
import catPet from "@/assets/cat-pet.png";
import catTakeout from "@/assets/cat-takeout.png";
import catGrocery from "@/assets/cat-grocery.png";

const categories = [
  {
    id: "liquor",
    name: "Liquor Stores",
    description: "Wine, Beer & Spirits",
    image: catLiquor,
    halo: "bg-rose-100",
    to: "/stores?category=liquor",
  },
  {
    id: "smokes",
    name: "Smoke & Vape",
    description: "Cigarettes, Vapes & More",
    image: catSmoke,
    halo: "bg-purple-100",
    to: "/products?category=smokes",
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    description: "Health & Wellness",
    image: catPharmacy,
    halo: "bg-teal-100",
    to: "/stores?category=pharmacy",
  },
  {
    id: "pet",
    name: "Pet Supplies",
    description: "Food, Toys & More",
    image: catPet,
    halo: "bg-orange-100",
    to: "/products?category=pet_supplies",
  },
  {
    id: "takeout",
    name: "Takeout",
    description: "Food & Beverages",
    image: catTakeout,
    halo: "bg-amber-100",
    to: "/stores?category=takeout",
  },
  {
    id: "grocery",
    name: "Grocery Stores",
    description: "Fresh Groceries & Essentials",
    image: catGrocery,
    halo: "bg-emerald-100",
    to: "/stores?category=grocery",
  },
];

const CategoriesSection = () => {
  return (
    <section className="section-padding bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-3">
            Shop by Category
          </h2>
          <p className="text-muted-foreground text-base max-w-lg mx-auto">
            Everything you need, delivered fast across Regina
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-7 max-w-6xl mx-auto">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={category.to}
              className="group relative flex flex-col items-center justify-between rounded-3xl bg-card border border-border/60 hover:border-primary hover:shadow-[0_0_0_1px_hsl(var(--primary)/0.4),0_20px_40px_-20px_hsl(var(--primary)/0.35)] transition-all duration-300 p-6 md:p-8 text-center min-h-[280px] md:min-h-[320px]"
            >
              {/* Illustration with halo */}
              <div className="relative flex items-center justify-center w-full h-32 md:h-40 mb-4">
                <div className={`absolute w-28 h-28 md:w-36 md:h-36 rounded-full ${category.halo} opacity-70`} />
                <img
                  src={category.image}
                  alt={category.name}
                  width={512}
                  height={512}
                  loading="lazy"
                  className="relative w-32 h-32 md:w-40 md:h-40 object-contain group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Text */}
              <div className="flex-1 flex flex-col items-center">
                <h3 className="font-display text-lg md:text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {category.name}
                </h3>
                <p className="text-muted-foreground text-sm md:text-base mb-4">
                  {category.description}
                </p>
              </div>

              {/* Arrow button */}
              <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center text-foreground/60 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
                <ChevronRight className="h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
