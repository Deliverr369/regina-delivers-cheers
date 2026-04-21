import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface PriceDisclaimerProps {
  className?: string;
  variant?: "default" | "subtle" | "inline";
}

/**
 * Reusable notice clarifying that displayed prices are estimates based on
 * current store pricing and the final charge will be adjusted to match the
 * actual in-store price once our shopper completes the purchase.
 */
const PriceDisclaimer = ({ className, variant = "default" }: PriceDisclaimerProps) => {
  if (variant === "inline") {
    return (
      <p className={cn("text-[11px] text-muted-foreground leading-relaxed", className)}>
        <span className="font-semibold text-foreground">Note:</span> Prices shown reflect current store pricing and will be readjusted to the exact in-store price once our shopper completes your purchase.
      </p>
    );
  }

  if (variant === "subtle") {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg bg-muted/50 border border-border/60 px-3 py-2 text-[11px] text-muted-foreground leading-relaxed",
          className
        )}
      >
        <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
        <span>
          <span className="font-semibold text-foreground">Estimated price.</span> Final charge is adjusted to the actual store price once our shopper completes your purchase.
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl bg-muted/60 border border-border/60 p-3 text-xs text-muted-foreground leading-relaxed",
        className
      )}
    >
      <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary/80" />
      <p>
        <span className="font-semibold text-foreground">Heads up:</span> Prices shown are based on current store pricing. Your final charge will be readjusted to match the exact in-store price once our shopper completes your purchase.
      </p>
    </div>
  );
};

export default PriceDisclaimer;
