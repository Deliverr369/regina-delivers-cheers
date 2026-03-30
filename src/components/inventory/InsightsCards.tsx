import { Package, ImageOff, DollarSign, EyeOff, AlertTriangle } from "lucide-react";

interface Props {
  insights: {
    total: number;
    missingImages: number;
    missingPrices: number;
    outOfStock: number;
    inactive: number;
  };
  onFilter: (status: string) => void;
  activeStatus: string;
}

const cards = [
  { key: "all", label: "Total Products", icon: Package, color: "text-primary" },
  { key: "missing_image", label: "Missing Images", icon: ImageOff, color: "text-amber-500" },
  { key: "missing_price", label: "Missing Prices", icon: DollarSign, color: "text-orange-500" },
  { key: "out_of_stock", label: "Out of Stock", icon: AlertTriangle, color: "text-destructive" },
  { key: "inactive", label: "Hidden", icon: EyeOff, color: "text-muted-foreground" },
];

const InsightsCards = ({ insights, onFilter, activeStatus }: Props) => {
  const counts: Record<string, number> = {
    all: insights.total,
    missing_image: insights.missingImages,
    missing_price: insights.missingPrices,
    out_of_stock: insights.outOfStock,
    inactive: insights.inactive,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {cards.map(({ key, label, icon: Icon, color }) => {
        const isActive = activeStatus === key;
        return (
          <button
            key={key}
            onClick={() => onFilter(isActive ? "all" : key)}
            className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
              isActive
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border/50 bg-card hover:border-border hover:shadow-sm"
            }`}
          >
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${
              isActive ? "bg-primary/10" : "bg-muted/50"
            }`}>
              <Icon className={`h-4.5 w-4.5 ${isActive ? "text-primary" : color}`} />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{counts[key]}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default InsightsCards;
