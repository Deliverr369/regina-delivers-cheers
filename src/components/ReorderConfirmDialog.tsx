import { useEffect, useState } from "react";
import { Loader2, AlertTriangle, RotateCcw, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useReorder } from "@/hooks/useReorder";

interface OrderItemRow {
  id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
}

interface OrderRow {
  id: string;
  store_id: string | null;
  stores?: { name?: string | null } | null;
  order_items?: OrderItemRow[];
}

interface PreviewItem {
  key: string;
  name: string;
  quantity: number;
  originalPrice: number;
  currentPrice: number | null;
  available: boolean;
}

const fmtMoney = (n: number) => `$${Number(n || 0).toFixed(2)}`;

interface Props {
  order: OrderRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ReorderConfirmDialog = ({ order, open, onOpenChange }: Props) => {
  const { reorder } = useReorder();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PreviewItem[]>([]);

  useEffect(() => {
    if (!open || !order) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const orderItems = order.order_items ?? [];
      const ids = orderItems
        .map((i) => i.product_id)
        .filter((id): id is string => !!id);

      const { data: live } = await supabase
        .from("products")
        .select("id, price, in_stock, is_hidden")
        .in(
          "id",
          ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]
        );

      if (cancelled) return;
      const liveMap = new Map((live ?? []).map((p) => [p.id, p]));

      const preview: PreviewItem[] = orderItems.map((item, idx) => {
        const l = item.product_id ? liveMap.get(item.product_id) : null;
        const available = !!l && !l.is_hidden && l.in_stock !== false;
        return {
          key: item.id ?? `${idx}-${item.product_name}`,
          name: item.product_name,
          quantity: item.quantity,
          originalPrice: Number(item.price),
          currentPrice: l ? Number(l.price) : null,
          available,
        };
      });
      setItems(preview);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, order]);

  const availableItems = items.filter((i) => i.available);
  const unavailableCount = items.length - availableItems.length;
  const estimatedSubtotal = availableItems.reduce(
    (s, i) => s + (i.currentPrice ?? 0) * i.quantity,
    0
  );

  const handleConfirm = async () => {
    if (!order) return;
    onOpenChange(false);
    await reorder(order);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <RotateCcw className="h-5 w-5 text-primary" />
            Reorder these items?
          </DialogTitle>
          <DialogDescription>
            Review what will be added to your cart from{" "}
            <span className="font-medium text-foreground">
              {order?.stores?.name ?? "this order"}
            </span>
            . Prices may have changed since your last order.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="rounded-xl border border-border max-h-72 overflow-y-auto">
              {items.map((item, idx) => {
                const priceChanged =
                  item.available &&
                  item.currentPrice !== null &&
                  Math.abs(item.currentPrice - item.originalPrice) > 0.001;
                return (
                  <div
                    key={item.key}
                    className={`flex items-start gap-3 p-3 ${
                      idx !== items.length - 1 ? "border-b border-border" : ""
                    } ${!item.available ? "opacity-60" : ""}`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        item.available
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.quantity}×
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {item.name}
                      </p>
                      {!item.available ? (
                        <p className="text-[11px] text-destructive flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="h-3 w-3" />
                          Unavailable — will be skipped
                        </p>
                      ) : priceChanged ? (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {fmtMoney(item.originalPrice)} →{" "}
                          <span className="text-foreground font-medium">
                            {fmtMoney(item.currentPrice!)}
                          </span>{" "}
                          each
                        </p>
                      ) : (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {fmtMoney(item.currentPrice ?? item.originalPrice)} each
                        </p>
                      )}
                    </div>
                    {item.available && item.currentPrice !== null && (
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {fmtMoney(item.currentPrice * item.quantity)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 text-sm">
              {unavailableCount > 0 && (
                <div className="flex items-center gap-2 text-xs text-destructive">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {unavailableCount} item{unavailableCount === 1 ? "" : "s"} no
                  longer available
                </div>
              )}
              {availableItems.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  {availableItems.length} item
                  {availableItems.length === 1 ? "" : "s"} ready to add
                </div>
              )}
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="text-muted-foreground">Estimated subtotal</span>
                <span className="font-display text-lg font-bold text-primary tabular-nums">
                  {fmtMoney(estimatedSubtotal)}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Delivery fees and taxes are calculated at checkout.
              </p>
            </div>
          </>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            className="rounded-full gap-2"
            onClick={handleConfirm}
            disabled={loading || availableItems.length === 0}
          >
            <RotateCcw className="h-4 w-4" />
            Add {availableItems.length || ""} to cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReorderConfirmDialog;
