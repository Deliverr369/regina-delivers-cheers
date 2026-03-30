import { Link } from "react-router-dom";
import { Beer, Wine, Martini, Cigarette, ArrowRight } from "lucide-react";

const categories = [
  {
    id: "beer",
    name: "Beer",
    description: "Domestic, imported & craft",
    icon: Beer,
    emoji: "🍺",
    gradient: "from-amber-500/20 to-amber-600/5",
    iconColor: "text-beer bg-beer/15",
    image: "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=500&auto=format",
  },
  {
    id: "wine",
    name: "Wine",
    description: "Red, white, rosé & sparkling",
    icon: Wine,
    emoji: "🍷",
    gradient: "from-rose-500/20 to-rose-600/5",
    iconColor: "text-wine bg-wine/15",
    image: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=500&auto=format",
  },
  {
    id: "spirits",
    name: "Spirits",
    description: "Vodka, whisky, rum & more",
    icon: Martini,
    emoji: "🥃",
    gradient: "from-violet-500/20 to-violet-600/5",
    iconColor: "text-spirits bg-spirits/15",
    image: "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=500&auto=format",
  },
  {
    id: "smokes",
    name: "Smokes & More",
    description: "Cigarettes, cigars & tobacco",
    icon: Cigarette,
    emoji: "🚬",
    gradient: "from-slate-500/20 to-slate-600/5",
    iconColor: "text-muted-foreground bg-muted",
    image: "https://images.unsplash.com/photo-1527192491265-7e15c55b1ed2?w=500&auto=format",
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
            Browse our wide selection from Regina's top liquor stores
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/products?category=${category.id}`}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border card-hover"
            >
              {/* Image */}
              <div className="aspect-[4/3] overflow-hidden relative">
                <img
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${category.iconColor} mb-3`}>
                  <category.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-bold text-white mb-0.5">
                  {category.name}
                </h3>
                <p className="text-white/60 text-sm mb-3">
                  {category.description}
                </p>
                <div className="flex items-center gap-1.5 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Shop Now</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
