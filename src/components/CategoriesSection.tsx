import { Link } from "react-router-dom";
import { Beer, Wine, Martini, Cigarette, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  {
    id: "beer",
    name: "Beer",
    description: "Domestic, imported & craft beers",
    icon: Beer,
    color: "bg-beer/10 text-beer",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format",
  },
  {
    id: "wine",
    name: "Wine",
    description: "Red, white, rosé & sparkling",
    icon: Wine,
    color: "bg-wine/20 text-wine",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&auto=format",
  },
  {
    id: "spirits",
    name: "Spirits",
    description: "Vodka, whisky, rum & more",
    icon: Martini,
    color: "bg-spirits/20 text-spirits",
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format",
  },
  {
    id: "smokes",
    name: "Smokes",
    description: "Cigarettes, cigars & tobacco",
    icon: Cigarette,
    color: "bg-muted text-muted-foreground",
    image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=500&auto=format",
  },
];

const CategoriesSection = () => {
  return (
    <section className="py-24 bg-secondary">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="font-display text-3xl md:text-5xl font-bold text-foreground mb-4">
            Shop by Category
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Browse our wide selection of beverages and tobacco products from Regina's top liquor stores
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <Link
              key={category.id}
              to={`/products?category=${category.id}`}
              className="group relative overflow-hidden rounded-2xl bg-card shadow-lg hover:shadow-2xl transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${category.color} mb-4`}>
                  <category.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-1">
                  {category.name}
                </h3>
                <p className="text-white/70 text-sm mb-4">
                  {category.description}
                </p>
                <div className="flex items-center gap-2 text-primary group-hover:gap-4 transition-all">
                  <span className="text-sm font-medium">Shop Now</span>
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link to="/products">
            <Button size="lg" variant="outline" className="gap-2">
              View All Products
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;