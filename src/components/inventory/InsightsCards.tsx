import {
  Package, ImageOff, DollarSign, EyeOff, AlertTriangle, ArrowLeftRight,
} from "lucide-react";

interface Props {
  insights: {
    total: number;
    missingImages: number;
    missingPrices: number;
    outOfStock: number;
    inactive: number;
    priceInconsistencies: number;
  };
  onFilter: (status: string) => void;
  activeStatus: string;
}

const cards = [
  { key: "all", label: "Total Products", icon: Package, bgActive: "bg-primary/10", iconColor: "text-primary", bgIdle: "bg-primary/5" },
  { key: "missing_image", label: "Missing Images", icon: ImageOff, bgActive: "bg-amber-500/10", iconColor: "text-amber-500", bgIdle: "bg-amber-500/5" },
  { key: "missing_price", label: "No Pricing", icon: DollarSign, bgActive: "bg-orange-500/10", iconColor: "text-orange-500", bgIdle: "bg-orange-500/5" },
  { key: "out_of_stock", label: "Out of Stock", icon: AlertTriangle, bgActive: "bg-destructive/10", iconColor: "text-destructive", bgIdle: "bg-destructive/5" },
  { key: "inactive", label: "Hidden", icon: EyeOff, bgActive: "bg-muted", iconColor: "text-muted-foreground", bgIdle: "bg-muted/50" },
  { key: "price_inconsistency", label: "Price Variance", icon: ArrowLeftRight, bgActive: "bg-violet-500/10", iconColor: "text-violet-500", bgIdle: "bg-violet-500/5" },
];

const InsightsCards = ({ insights, onFilter, activeStatus }: Props) => {
  const counts: Record<string, number> = {
    all: insights.total,
    missing_image: insights.missingImages,
    missing_price: insights.missingPrices,
    out_of_stock: insights.outOfStock,
    inactive: insights.inactive,
    price_inconsistency: insights.priceInconsistencies,
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
      {cards.map(({ key, label, icon: Icon, bgActive, iconColor, bgIdle }) => {
        const isActive = activeStatus === key;
        const count = counts[key] || 0;
        return (
          <button
            key={key}
            onClick={() => onFilter(isActive ? "all" : key)}
            className={`group relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left overflow-hidden ${
              isActive
                ? "border-primary/30 bg-card shadow-sm ring-1 ring-primary/10"
                : "border-border/40 bg-card hover:border-border hover:shadow-sm"
            }`}
          >
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              isActive ? bgActive : bgIdle
            }`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none tabular-nums">{count}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</p>
            </div>
            {isActive && (
              <div className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default InsightsCards;
