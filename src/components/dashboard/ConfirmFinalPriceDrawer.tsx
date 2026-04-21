import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface OrderItemRow {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  estimated_price: number | null;
  final_price: number | null;
}

interface OrderRow {
  id: string;
  user_id: string;
  subtotal: number;
  tax: number;
  delivery_fee: number | null;
  total: number;
  estimated_subtotal: number | null;
  estimated_total: number | null;
  final_subtotal: number | null;
  final_total: number | null;
  authorized_amount: number | null;
  stripe_payment_intent_id: string | null;
  payment_status: string | null;
}

interface Props {
  orderId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCaptured?: () => void;
}

export function ConfirmFinalPriceDrawer({ orderId, open, onOpenChange, onCaptured }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItemRow[]>([]);
  const [finalPrices, setFinalPrices] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !orderId) return;
    void loadOrder(orderId);
  }, [open, orderId]);

  const loadOrder = async (id: string) => {
    setLoading(true);
    const [orderRes, itemsRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", id).maybeSingle(),
      supabase.from("order_items").select("*").eq("order_id", id),
    ]);
    if (orderRes.error || !orderRes.data) {
      toast({ title: "Error", description: "Failed to load order", variant: "destructive" });
      setLoading(false);
      return;
    }
    setOrder(orderRes.data as OrderRow);
    const its = (itemsRes.data || []) as OrderItemRow[];
    setItems(its);
    const initial: Record<string, string> = {};
    its.forEach((it) => {
      const v = it.final_price ?? it.estimated_price ?? it.price;
      initial[it.id] = String(Number(v).toFixed(2));
    });
    setFinalPrices(initial);
    setLoading(false);
  };

  const computeFinalSubtotal = () =>
    items.reduce((sum, it) => {
      const p = parseFloat(finalPrices[it.id] || "0");
      return sum + (isNaN(p) ? 0 : p) * it.quantity;
    }, 0);

  const finalSubtotal = computeFinalSubtotal();
  const taxRate = order && order.subtotal > 0 ? Number(order.tax) / Number(order.subtotal) : 0.11;
  const newTax = finalSubtotal * taxRate;
  const deliveryFee = Number(order?.delivery_fee || 0);
  const newTotal = finalSubtotal + newTax + deliveryFee;
  const authorized = Number(order?.authorized_amount || 0);
  const exceedsAuth = authorized > 0 && newTotal > authorized;
  const estimated = Number(order?.estimated_total || order?.total || 0);
  const variancePct = estimated > 0 ? ((newTotal - estimated) / estimated) * 100 : 0;

  const isCod = !order?.stripe_payment_intent_id;

  const handleCapture = async () => {
    if (!order) return;
    if (!isCod && exceedsAuth) {
      toast({
        title: "Cannot capture",
        description: "Final total exceeds authorized amount. Customer re-approval needed.",
        variant: "destructive",
      });
      return;
    }
    setCapturing(true);
    try {
      // Persist final prices and adjustments
      const adjustments: any[] = [];
      for (const it of items) {
        const newPrice = parseFloat(finalPrices[it.id] || "0");
        const oldPrice = Number(it.estimated_price ?? it.price);
        if (newPrice !== oldPrice) {
          adjustments.push({
            order_id: order.id,
            order_item_id: it.id,
            field: "item_price",
            old_value: oldPrice,
            new_value: newPrice,
          });
        }
        await supabase.from("order_items").update({ final_price: newPrice }).eq("id", it.id);
      }
      if (adjustments.length > 0) {
        await supabase.from("order_price_adjustments").insert(adjustments);
      }

      await supabase
        .from("orders")
        .update({
          final_subtotal: finalSubtotal,
          final_total: newTotal,
          tax: newTax,
          total: newTotal,
          ...(isCod ? { payment_status: "captured" } : {}),
        })
        .eq("id", order.id);

      if (!isCod) {
        // Card: capture via Stripe edge function
        const { data, error } = await supabase.functions.invoke("capture-payment", {
          body: { orderId: order.id, environment: "sandbox" },
        });
        if (error || (data && data.error)) {
          throw new Error(error?.message || data?.error || "Capture failed");
        }
        toast({ title: "Payment captured", description: `Charged $${newTotal.toFixed(2)} to customer.` });
      } else {
        toast({ title: "Final price saved", description: `Collect $${newTotal.toFixed(2)} cash from customer.` });
      }
      onCaptured?.();
      onOpenChange(false);
    } catch (e) {
      toast({
        title: isCod ? "Save failed" : "Capture failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCapturing(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Confirm Final Price</SheetTitle>
          <SheetDescription>
            Adjust item prices to match what was actually purchased, then capture the payment.
          </SheetDescription>
        </SheetHeader>

        {loading || !order ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Status banner */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="font-mono text-xs">#{order.id.slice(0, 8)}</Badge>
              <Badge className="bg-blue-100 text-blue-800 border-0 capitalize">
                {order.payment_status || "pending"}
              </Badge>
              {order.payment_status === "captured" && (
                <Badge className="bg-emerald-100 text-emerald-800 border-0 gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Captured
                </Badge>
              )}
            </div>

            {/* Authorization summary */}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Estimated total</span><span>${estimated.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Authorized hold</span><span className="font-medium">${authorized.toFixed(2)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>New final total</span>
                <span className={exceedsAuth ? "text-destructive" : "text-foreground"}>${newTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Variance vs estimate</span>
                <span className={variancePct > 0 ? "text-amber-600" : "text-emerald-600"}>
                  {variancePct >= 0 ? "+" : ""}{variancePct.toFixed(1)}%
                </span>
              </div>
            </div>

            {exceedsAuth && (
              <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Exceeds authorized amount</p>
                  <p className="text-xs mt-0.5">Reduce items or contact customer for re-authorization before capturing.</p>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Line items</Label>
              {items.map((it) => {
                const orig = Number(it.estimated_price ?? it.price);
                const cur = parseFloat(finalPrices[it.id] || "0");
                const changed = !isNaN(cur) && cur !== orig;
                return (
                  <div key={it.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{it.product_name}</p>
                      <p className="text-xs text-muted-foreground">Qty {it.quantity} · est ${orig.toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={finalPrices[it.id] || ""}
                        onChange={(e) => setFinalPrices((p) => ({ ...p, [it.id]: e.target.value }))}
                        className={`w-24 h-9 text-right ${changed ? "border-amber-500" : ""}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div className="rounded-lg border p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${finalSubtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${newTax.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Delivery</span><span>${deliveryFee.toFixed(2)}</span></div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base"><span>Total to charge</span><span>${newTotal.toFixed(2)}</span></div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={capturing}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCapture}
                disabled={capturing || exceedsAuth || order.payment_status === "captured" || !order.stripe_payment_intent_id}
              >
                {capturing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Capturing…</>
                ) : (
                  <>Confirm & Capture ${newTotal.toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
