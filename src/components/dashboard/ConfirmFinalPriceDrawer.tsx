import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { stripeEnv } from "@/lib/stripeEnv";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

interface OrderRow {
  id: string;
  user_id: string;
  subtotal: number;
  tax: number;
  delivery_fee: number | null;
  convenience_fee: number | null;
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
  const [receipt, setReceipt] = useState<string>("");

  useEffect(() => {
    if (!open || !orderId) return;
    void loadOrder(orderId);
  }, [open, orderId]);

  const loadOrder = async (id: string) => {
    setLoading(true);
    const { data, error } = await supabase.from("orders").select("*").eq("id", id).maybeSingle();
    if (error || !data) {
      toast({ title: "Error", description: "Failed to load order", variant: "destructive" });
      setLoading(false);
      return;
    }
    const o = data as OrderRow;
    setOrder(o);
    // Default to the estimated store receipt (items + tax), which is what the
    // shopper will be replacing with the real till receipt amount.
    const estReceipt =
      o.final_subtotal != null
        ? Number(o.final_subtotal)
        : Number(o.estimated_subtotal ?? o.subtotal) + Number(o.tax || 0);
    setReceipt(estReceipt.toFixed(2));
    setLoading(false);
  };

  const deliveryFee = Number(order?.delivery_fee || 0);
  const convenienceFee = Number(order?.convenience_fee || 0);
  // Tip isn't stored separately — it's whatever the original total carried on
  // top of items + tax + fees. It stays exactly as the customer chose.
  const estimatedTotal = Number(order?.estimated_total || order?.total || 0);
  const tip = Math.max(
    0,
    Math.round(
      (estimatedTotal -
        (Number(order?.estimated_subtotal ?? order?.subtotal ?? 0) +
          Number(order?.tax || 0) +
          deliveryFee +
          convenienceFee)) *
        100,
    ) / 100,
  );

  const receiptAmount = (() => {
    const v = parseFloat(receipt);
    return isNaN(v) ? 0 : v;
  })();

  const newTotal = receiptAmount + deliveryFee + convenienceFee + tip;
  const authorized = Number(order?.authorized_amount || 0);
  const exceedsAuth = authorized > 0 && newTotal > authorized;
  const variancePct = estimatedTotal > 0 ? ((newTotal - estimatedTotal) / estimatedTotal) * 100 : 0;
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
      const oldTotal = Number(order.final_total ?? order.estimated_total ?? order.total);
      if (newTotal !== oldTotal) {
        await supabase.from("order_price_adjustments").insert([
          {
            order_id: order.id,
            field: "final_total",
            old_value: oldTotal,
            new_value: newTotal,
          },
        ]);
      }

      await supabase
        .from("orders")
        .update({
          final_subtotal: receiptAmount,
          final_total: newTotal,
          total: newTotal,
          ...(isCod ? { payment_status: "captured" } : {}),
        })
        .eq("id", order.id);

      if (!isCod) {
        const { data, error } = await supabase.functions.invoke("capture-payment", {
          body: { orderId: order.id, environment: stripeEnv },
        });
        if (error || (data && data.error)) {
          throw new Error(error?.message || data?.error || "Capture failed");
        }
        toast({ title: "Payment captured", description: `Charged $${newTotal.toFixed(2)} to customer.` });
      } else {
        toast({ title: "Final price saved", description: `Collect $${newTotal.toFixed(2)} from customer at the door.` });
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
            Enter the store receipt total (taxes included). Delivery, fees and the tip are added automatically.
          </SheetDescription>
        </SheetHeader>

        {loading || !order ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6 space-y-5">
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

            {/* Receipt entry */}
            <div className="rounded-lg border p-4 space-y-2">
              <Label htmlFor="receipt-total" className="text-sm font-medium">
                Store receipt total (taxes included)
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg text-muted-foreground">$</span>
                <Input
                  id="receipt-total"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  value={receipt}
                  onChange={(e) => setReceipt(e.target.value)}
                  className="h-12 text-lg font-semibold"
                  autoFocus
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Type exactly what the till receipt says — no need to change taxes.
              </p>
            </div>

            {!isCod && exceedsAuth && (
              <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Exceeds authorized amount</p>
                  <p className="text-xs mt-0.5">
                    Authorized hold is ${authorized.toFixed(2)}. Lower the receipt total or contact the customer for
                    re-authorization.
                  </p>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="rounded-lg border p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Receipt total (incl. tax)</span>
                <span>${receiptAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>${deliveryFee.toFixed(2)}</span>
              </div>
              {convenienceFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service fee</span>
                  <span>${convenienceFee.toFixed(2)}</span>
                </div>
              )}
              {tip > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Driver tip</span>
                  <span>${tip.toFixed(2)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Total to charge</span>
                <span className={!isCod && exceedsAuth ? "text-destructive" : "text-foreground"}>
                  ${newTotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {isCod ? "Pay at the door · estimate" : `Authorized hold $${authorized.toFixed(2)} · estimate`} $
                  {estimatedTotal.toFixed(2)}
                </span>
                <span className={variancePct > 0 ? "text-amber-600" : "text-emerald-600"}>
                  {variancePct >= 0 ? "+" : ""}
                  {variancePct.toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={capturing}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCapture}
                disabled={capturing || (!isCod && exceedsAuth) || order.payment_status === "captured"}
              >
                {capturing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> {isCod ? "Saving…" : "Capturing…"}</>
                ) : isCod ? (
                  <>Save final price ${newTotal.toFixed(2)}</>
                ) : (
                  <>Confirm &amp; Capture ${newTotal.toFixed(2)}</>
                )}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
