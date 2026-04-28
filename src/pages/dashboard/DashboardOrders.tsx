import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingCart, Search, Filter, DollarSign, ArrowRight, CalendarClock, Clock, CheckCircle2, ShoppingBasket, Truck, PackageCheck, XCircle, Radio, Store as StoreIcon } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ConfirmFinalPriceDrawer } from "@/components/dashboard/ConfirmFinalPriceDrawer";
import OrderTimeline from "@/components/OrderTimeline";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Layers } from "lucide-react";

type OrderStatus = Database["public"]["Enums"]["order_status"];

interface Order {
  id: string;
  user_id: string;
  status: OrderStatus | null;
  total: number;
  subtotal: number;
  tax: number;
  delivery_fee: number | null;
  delivery_address: string;
  delivery_city: string | null;
  payment_method: string | null;
  created_at: string;
  payment_status: string | null;
  authorized_amount: number | null;
  estimated_total: number | null;
  final_total: number | null;
  stripe_payment_intent_id: string | null;
  delivery_type?: string | null;
  delivery_scheduled_at?: string | null;
  delivery_window?: string | null;
  store_id: string | null;
  stores?: { id: string; name: string } | null;
}

interface StoreOption {
  id: string;
  name: string;
}

const STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  out_for_delivery: "bg-violet-100 text-violet-800 border-violet-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusIcon = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ShoppingBasket,
  out_for_delivery: Truck,
  delivered: PackageCheck,
  cancelled: XCircle,
} as const;

const STAT_CARDS: { key: OrderStatus | "active"; label: string; tone: string }[] = [
  { key: "active", label: "Active", tone: "text-primary" },
  { key: "pending", label: "Pending", tone: "text-amber-600" },
  { key: "confirmed", label: "Confirmed", tone: "text-blue-600" },
  { key: "preparing", label: "Preparing", tone: "text-indigo-600" },
  { key: "out_for_delivery", label: "On the way", tone: "text-violet-600" },
  { key: "delivered", label: "Delivered", tone: "text-emerald-600" },
];

const nextStatus = (s: OrderStatus | null): OrderStatus | null => {
  if (!s) return "confirmed";
  const idx = STATUS_FLOW.indexOf(s);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
};

const PAYMENT_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All payments" },
  { value: "pending", label: "Pending" },
  { value: "authorized", label: "Authorized" },
  { value: "captured", label: "Captured" },
  { value: "refunded", label: "Refunded" },
  { value: "failed", label: "Failed" },
];

const DashboardOrders = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("active");
  const [storeFilter, setStoreFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [splitOnly, setSplitOnly] = useState<boolean>(false);
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [confirmOrderId, setConfirmOrderId] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [groupIntentId, setGroupIntentId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
    fetchStores();
  }, []);

  // Realtime: any change to any order triggers a refetch.
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchOrders()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("*, stores ( id, name )")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch orders", variant: "destructive" });
    } else {
      setOrders((data as unknown as Order[]) || []);
    }
    setLoading(false);
  };

  const fetchStores = async () => {
    const { data } = await supabase
      .from("stores")
      .select("id, name")
      .order("name", { ascending: true });
    setStores((data as StoreOption[]) || []);
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);

    if (error) {
      toast({ title: "Error", description: "Failed to update order status", variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Order moved to ${newStatus.replace(/_/g, " ")}.` });
      // Optimistic update — realtime will reconcile
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));
    }
  };

  const advance = async (order: Order) => {
    const next = nextStatus(order.status);
    if (!next) return;
    setAdvancingId(order.id);
    try {
      await updateStatus(order.id, next);
    } finally {
      setAdvancingId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { active: 0, pending: 0, confirmed: 0, preparing: 0, out_for_delivery: 0, delivered: 0, cancelled: 0 };
    for (const o of orders) {
      const s = (o.status || "pending") as string;
      c[s] = (c[s] || 0) + 1;
      if (s !== "delivered" && s !== "cancelled") c.active += 1;
    }
    return c;
  }, [orders]);

  // Build a set of payment_intent_ids that appear on more than one order so
  // we can flag split orders (one checkout → multiple per-store orders share
  // the same intent).
  const splitIntentIds = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const o of orders) {
      const id = o.stripe_payment_intent_id;
      if (!id) continue;
      counts[id] = (counts[id] || 0) + 1;
    }
    return new Set(Object.entries(counts).filter(([, n]) => n > 1).map(([id]) => id));
  }, [orders]);

  const isSplit = (o: Order) => !!o.stripe_payment_intent_id && splitIntentIds.has(o.stripe_payment_intent_id);

  const filtered = orders.filter((o) => {
    const storeName = o.stores?.name || "";
    const matchSearch =
      search === "" ||
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.delivery_address.toLowerCase().includes(search.toLowerCase()) ||
      storeName.toLowerCase().includes(search.toLowerCase());
    const status = o.status || "pending";
    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "active"
          ? status !== "delivered" && status !== "cancelled"
          : status === statusFilter;
    const matchStore =
      storeFilter === "all"
        ? true
        : storeFilter === "unassigned"
          ? !o.store_id
          : o.store_id === storeFilter;
    const matchPayment =
      paymentFilter === "all" ? true : (o.payment_status || "pending") === paymentFilter;
    const matchSplit = !splitOnly || isSplit(o);
    return matchSearch && matchStatus && matchStore && matchPayment && matchSplit;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Order Management</h2>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-success animate-pulse" />
            Live — updates appear in real time
          </p>
        </div>
      </div>

      {/* Status count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {STAT_CARDS.map((card) => {
          const isSelected = statusFilter === card.key;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setStatusFilter(card.key)}
              className={`text-left rounded-xl border bg-card p-3 transition-all ${
                isSelected ? "border-primary shadow-sm shadow-primary/10 ring-1 ring-primary/30" : "border-border hover:border-primary/40"
              }`}
            >
              <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">{card.label}</p>
              <p className={`font-display text-2xl font-bold mt-0.5 ${card.tone}`}>{counts[card.key] || 0}</p>
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID, address, or store..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active only</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="preparing">Preparing</SelectItem>
            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={storeFilter} onValueChange={setStoreFilter}>
          <SelectTrigger className="w-52">
            <StoreIcon className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Stores" />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="all">All Stores</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {stores.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={paymentFilter} onValueChange={setPaymentFilter}>
          <SelectTrigger className="w-44">
            <DollarSign className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Payment" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant={splitOnly ? "default" : "outline"}
          size="sm"
          className="h-10 gap-1.5"
          onClick={() => setSplitOnly((v) => !v)}
          title="Show only orders that are part of a multi-store checkout"
        >
          <StoreIcon className="h-3.5 w-3.5" />
          Split orders
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
            {orders.filter((o) => isSplit(o)).length}
          </Badge>
        </Button>
      </div>

      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Orders ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No orders found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((order) => {
                const status = (order.status || "pending") as OrderStatus;
                const next = nextStatus(status);
                const StatusIcon = statusIcon[status as keyof typeof statusIcon] || Clock;
                return (
                  <div
                    key={order.id}
                    className="rounded-xl border border-border/70 bg-card p-4 hover:border-primary/30 hover:shadow-sm transition-all"
                  >
                    {/* Top row: ID, status, total, scheduled time */}
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm font-semibold text-foreground">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <Badge className={`${statusColors[status]} text-[10px] font-medium capitalize border`}>
                            <StatusIcon className="h-3 w-3 mr-1 inline" />
                            {status.replace(/_/g, " ")}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-medium gap-1 cursor-pointer hover:bg-secondary/80"
                            onClick={() => order.store_id && setStoreFilter(order.store_id)}
                            title={order.stores?.name ? `Filter by ${order.stores.name}` : "No store assigned"}
                          >
                            <StoreIcon className="h-3 w-3" />
                            {order.stores?.name || "Unassigned"}
                          </Badge>
                          {order.delivery_type === "scheduled" && order.delivery_scheduled_at && (
                            <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">
                              <CalendarClock className="h-3 w-3 mr-1 inline" />
                              {new Date(order.delivery_scheduled_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                              {order.delivery_window ? ` · ${order.delivery_window}` : ""}
                            </Badge>
                          )}
                          {isSplit(order) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] border-amber-400/60 bg-amber-50 text-amber-800 cursor-pointer hover:bg-amber-100"
                              title="Part of a multi-store checkout — click to view all orders in this group"
                              onClick={(e) => {
                                e.stopPropagation();
                                setGroupIntentId(order.stripe_payment_intent_id);
                              }}
                            >
                              <Layers className="h-3 w-3 mr-1 inline" />
                              Split group
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] capitalize ${
                              order.payment_status === "captured"
                                ? "border-emerald-400/60 bg-emerald-50 text-emerald-800"
                                : order.payment_status === "authorized"
                                  ? "border-blue-400/60 bg-blue-50 text-blue-800"
                                  : order.payment_status === "failed"
                                    ? "border-red-400/60 bg-red-50 text-red-800"
                                    : "border-amber-400/60 bg-amber-50 text-amber-800"
                            }`}
                          >
                            <DollarSign className="h-3 w-3 mr-0.5 inline" />
                            {order.payment_status || "pending"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5 truncate">
                          {order.delivery_address}{order.delivery_city ? `, ${order.delivery_city}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Placed {new Date(order.created_at).toLocaleString()} · {order.payment_method || "card"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-lg text-foreground">${Number(order.final_total ?? order.total).toFixed(2)}</p>
                        <p className="text-[11px] text-muted-foreground">
                          Sub ${Number(order.subtotal).toFixed(2)}
                          {Number(order.delivery_fee) > 0 && (
                            <> · Del ${Number(order.delivery_fee).toFixed(2)}</>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.authorized_amount
                            ? `Auth $${Number(order.authorized_amount).toFixed(2)} · `
                            : ""}
                          {order.payment_status || "pending"}
                        </p>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="mb-3 px-1">
                      <OrderTimeline status={status} />
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-2 flex-wrap pt-3 border-t border-border/60">
                      {next && status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="h-9 gap-1.5"
                          disabled={advancingId === order.id}
                          onClick={() => advance(order)}
                        >
                          Advance to {next.replace(/_/g, " ")}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      )}

                      {order.payment_status !== "captured" && status !== "cancelled" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-9"
                          onClick={() => { setConfirmOrderId(order.id); setConfirmOpen(true); }}
                        >
                          <DollarSign className="h-3.5 w-3.5 mr-1" />
                          {order.stripe_payment_intent_id ? "Confirm & Capture" : "Set final price"}
                        </Button>
                      )}

                      <div className="ml-auto">
                        <Select
                          value={status}
                          onValueChange={(val) => updateStatus(order.id, val as OrderStatus)}
                        >
                          <SelectTrigger className="w-[160px] h-9 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="confirmed">Confirmed</SelectItem>
                            <SelectItem value="preparing">Preparing</SelectItem>
                            <SelectItem value="out_for_delivery">Out for Delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmFinalPriceDrawer
        orderId={confirmOrderId}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onCaptured={fetchOrders}
      />
    </div>
  );
};

export default DashboardOrders;
