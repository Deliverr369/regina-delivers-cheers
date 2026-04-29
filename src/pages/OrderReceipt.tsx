import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, MapPin, Clock, CalendarClock, Receipt, Printer, RotateCcw, CreditCard, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useReorder } from "@/hooks/useReorder";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import OrderTimeline from "@/components/OrderTimeline";

const statusConfig: Record<string, { bg: string; label: string }> = {
  pending: { bg: "bg-amber-500", label: "Pending" },
  confirmed: { bg: "bg-blue-500", label: "Confirmed" },
  preparing: { bg: "bg-orange-500", label: "Preparing" },
  out_for_delivery: { bg: "bg-violet-500", label: "Out for Delivery" },
  delivered: { bg: "bg-success", label: "Delivered" },
  cancelled: { bg: "bg-destructive", label: "Cancelled" },
};

const fmtMoney = (n: number | null | undefined) =>
  `$${Number(n || 0).toFixed(2)}`;

const OrderReceipt = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { reorder } = useReorder();
  const printRef = useRef<HTMLDivElement>(null);

  const { data: order, isLoading } = useQuery({
    queryKey: ["order-receipt", id],
    queryFn: async () => {
      if (!id || !user) return null;
      const { data, error } = await supabase
        .from("orders")
        .select(`*, stores (name, address, phone), order_items (*)`)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !!user,
  });

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
  }, [authLoading, user, navigate]);

  const handlePrint = () => window.print();

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center py-20">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <h1 className="font-display text-2xl font-bold mb-2">Order not found</h1>
            <p className="text-muted-foreground mb-6">
              We couldn't find that order in your history.
            </p>
            <Link to="/orders">
              <Button className="rounded-full">Back to orders</Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const status = statusConfig[order.status || "pending"];
  const items = (order.order_items || []) as any[];
  const itemsTotal = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);
  const subtotal = Number(order.subtotal ?? itemsTotal);
  const deliveryFee = Number((order as any).delivery_fee || 0);
  const convenienceFee = Number((order as any).convenience_fee || 0);
  const tax = Number(order.tax || 0);
  const discount = Number((order as any).discount_amount || 0);
  const total = Number(order.total || 0);
  const isCod = ((order as any).payment_method || "") === "cod";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-20 pb-16 print:pt-0 print:pb-0">
        {/* Top bar — hidden on print */}
        <div className="container mx-auto px-4 max-w-3xl pt-6 print:hidden">
          <Link
            to="/orders"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to orders
          </Link>
        </div>

        <div className="container mx-auto px-4 max-w-3xl">
          <div
            ref={printRef}
            className="bg-card rounded-2xl border border-border p-6 sm:p-8 print:border-0 print:rounded-none print:p-0"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-5 w-5 text-primary" />
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    Receipt
                  </h1>
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  Order #{order.id.slice(0, 8).toUpperCase()}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(order.created_at).toLocaleString("en-CA", {
                    year: "numeric", month: "long", day: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <Badge className={`${status.bg} text-white text-xs font-medium px-3 py-1`}>
                {status.label}
              </Badge>
            </div>

            {/* Tracking */}
            <div className="mb-6">
              <OrderTimeline status={order.status as any} />
            </div>

            {/* Store + Delivery info */}
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl bg-secondary/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">
                  Store
                </p>
                <p className="text-sm font-semibold text-foreground">
                  {order.stores?.name || "—"}
                </p>
                {order.stores?.address && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {order.stores.address}
                  </p>
                )}
                {order.stores?.phone && (
                  <p className="text-xs text-muted-foreground">
                    {order.stores.phone}
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-secondary/40 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1.5 font-semibold">
                  Delivery
                </p>
                <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {order.delivery_address}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {order.delivery_city || "Regina"}
                  {order.delivery_postal_code ? `, ${order.delivery_postal_code}` : ""}
                </p>
                {(order as any).delivery_type === "scheduled" && (order as any).delivery_scheduled_at ? (
                  <p className="text-xs text-foreground mt-2 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    {new Date((order as any).delivery_scheduled_at).toLocaleDateString(undefined, {
                      weekday: "short", month: "short", day: "numeric",
                    })}
                    {(order as any).delivery_window && <> · {(order as any).delivery_window}</>}
                  </p>
                ) : (
                  <p className="text-xs text-foreground mt-2 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    ASAP delivery
                  </p>
                )}
                {order.delivery_instructions && (
                  <p className="text-[11px] italic text-muted-foreground mt-1">
                    “{order.delivery_instructions}”
                  </p>
                )}
              </div>
            </div>

            {/* Items */}
            <div className="mb-6">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2 font-semibold">
                Items ({items.length})
              </p>
              <div className="rounded-xl border border-border overflow-hidden">
                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 ${
                      idx !== items.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {item.quantity}×
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {item.product_name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {fmtMoney(item.price)} each
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-foreground tabular-nums">
                      {fmtMoney(Number(item.price) * Number(item.quantity))}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="rounded-xl bg-secondary/40 p-4 mb-6 space-y-1.5 text-sm">
              <Row label="Subtotal" value={fmtMoney(subtotal)} />
              {deliveryFee > 0 && (
                <Row label="Delivery fee" value={fmtMoney(deliveryFee)} />
              )}
              {convenienceFee > 0 && (
                <Row label="Service fee" value={fmtMoney(convenienceFee)} />
              )}
              {tax > 0 && <Row label="Tax (SK)" value={fmtMoney(tax)} />}
              {discount > 0 && (
                <Row
                  label={`Discount${order.promo_code ? ` (${order.promo_code})` : ""}`}
                  value={`−${fmtMoney(discount)}`}
                  className="text-success"
                />
              )}
              <Separator className="my-2" />
              <div className="flex items-baseline justify-between">
                <span className="font-display text-base font-bold text-foreground">
                  Total
                </span>
                <span className="font-display text-xl font-bold text-primary tabular-nums">
                  {fmtMoney(total)}
                </span>
              </div>
            </div>

            {/* Payment */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
              {isCod ? (
                <>
                  <Banknote className="h-3.5 w-3.5" /> Paid by cash on delivery
                </>
              ) : (
                <>
                  <CreditCard className="h-3.5 w-3.5" /> Paid by card
                  {(order as any).payment_status && (
                    <span className="capitalize">
                      · {(order as any).payment_status.replace(/_/g, " ")}
                    </span>
                  )}
                </>
              )}
            </div>

            <p className="text-[10px] text-muted-foreground text-center">
              Thanks for ordering with us — Regina, SK
            </p>
          </div>

          {/* Actions — hidden on print */}
          <div className="mt-5 flex flex-wrap gap-2 justify-end print:hidden">
            <Button
              variant="outline"
              className="rounded-full gap-2"
              onClick={handlePrint}
            >
              <Printer className="h-4 w-4" />
              Print / save PDF
            </Button>
            <Button
              className="rounded-full gap-2"
              onClick={() => reorder(order as any)}
            >
              <RotateCcw className="h-4 w-4" />
              Reorder these items
            </Button>
          </div>
        </div>
      </main>
      <div className="print:hidden">
        <Footer />
      </div>
    </div>
  );
};

const Row = ({
  label,
  value,
  className = "",
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div className={`flex items-baseline justify-between ${className}`}>
    <span className="text-muted-foreground">{label}</span>
    <span className="font-medium tabular-nums">{value}</span>
  </div>
);

export default OrderReceipt;
