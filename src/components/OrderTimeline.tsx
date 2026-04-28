import { CheckCircle2, Clock, ShoppingBasket, Truck, PackageCheck, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

const STEPS: { key: Exclude<OrderStatus, "cancelled">; label: string; icon: typeof Clock }[] = [
  { key: "pending", label: "Placed", icon: Clock },
  { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
  { key: "preparing", label: "Shopping", icon: ShoppingBasket },
  { key: "out_for_delivery", label: "On the way", icon: Truck },
  { key: "delivered", label: "Delivered", icon: PackageCheck },
];

interface OrderTimelineProps {
  status: OrderStatus | string | null;
  compact?: boolean;
  className?: string;
}

const OrderTimeline = ({ status, compact = false, className }: OrderTimelineProps) => {
  const current = (status || "pending") as OrderStatus;

  if (current === "cancelled") {
    return (
      <div className={cn("flex items-center gap-2.5 rounded-xl bg-destructive/10 border border-destructive/20 p-3", className)}>
        <XCircle className="h-5 w-5 text-destructive shrink-0" />
        <div>
          <p className="text-sm font-semibold text-destructive">Order cancelled</p>
          <p className="text-[11px] text-destructive/80">This order is no longer being processed.</p>
        </div>
      </div>
    );
  }

  const currentIdx = STEPS.findIndex((s) => s.key === current);

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isUpcoming = idx > currentIdx;

          return (
            <div key={step.key} className="flex flex-col items-center flex-1 min-w-0 relative">
              {/* connector to previous */}
              {idx > 0 && (
                <div
                  className={cn(
                    "absolute top-3.5 right-1/2 h-[2px] w-full -translate-y-1/2",
                    idx <= currentIdx ? "bg-primary" : "bg-border"
                  )}
                  aria-hidden
                />
              )}
              <div
                className={cn(
                  "relative z-10 h-7 w-7 rounded-full border-2 flex items-center justify-center transition-colors",
                  isComplete && "bg-primary border-primary text-primary-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20 animate-pulse",
                  isUpcoming && "bg-background border-border text-muted-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </div>
              {!compact && (
                <span
                  className={cn(
                    "mt-1.5 text-[10px] font-medium text-center leading-tight px-0.5 truncate max-w-full",
                    (isComplete || isCurrent) ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default OrderTimeline;
