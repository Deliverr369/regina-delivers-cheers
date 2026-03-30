import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Users, Store, DollarSign, TrendingUp, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DashboardOverview = () => {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, users: 0, stores: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      const [ordersRes, profilesRes, storesRes, recentRes] = await Promise.all([
        supabase.from("orders").select("id, total"),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("stores").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, total, status, created_at, delivery_address").order("created_at", { ascending: false }).limit(5),
      ]);

      const orders = ordersRes.data || [];
      const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

      setStats({
        orders: orders.length,
        revenue,
        users: profilesRes.count || 0,
        stores: storesRes.count || 0,
      });
      setRecentOrders(recentRes.data || []);
      setLoading(false);
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { title: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-primary", bg: "bg-primary/10", trend: "+12%" },
    { title: "Total Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", trend: "+8%" },
    { title: "Registered Users", value: stats.users, icon: Users, color: "text-violet-600", bg: "bg-violet-50", trend: "+5%" },
    { title: "Active Stores", value: stats.stores, icon: Store, color: "text-amber-600", bg: "bg-amber-50", trend: "—" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    confirmed: "bg-blue-100 text-blue-800",
    preparing: "bg-indigo-100 text-indigo-800",
    out_for_delivery: "bg-violet-100 text-violet-800",
    delivered: "bg-emerald-100 text-emerald-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-foreground">Dashboard Overview</h2>
        <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening with Deliverr.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="pt-5 pb-4 px-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <TrendingUp className="h-3 w-3 text-emerald-600" />
                <span className="text-xs text-muted-foreground">{stat.trend} from last month</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingCart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="min-w-0">
                      <p className="font-mono text-sm font-medium text-foreground">#{order.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.delivery_address}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <Badge className={`${statusColors[order.status || "pending"]} text-[10px] font-medium capitalize border-0`}>
                        {(order.status || "pending").replace(/_/g, " ")}
                      </Badge>
                      <p className="font-semibold text-foreground text-sm">${Number(order.total).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Avg Order Value", value: stats.orders > 0 ? `$${(stats.revenue / stats.orders).toFixed(2)}` : "$0.00" },
                { label: "Stores Active", value: `${stats.stores}` },
                { label: "Pending Orders", value: recentOrders.filter(o => o.status === "pending").length.toString() },
                { label: "Total Customers", value: stats.users.toString() },
              ].map((item) => (
                <div key={item.label} className="p-3 rounded-xl bg-muted/40 text-center">
                  <p className="text-lg font-bold text-foreground">{item.value}</p>
                  <p className="text-[11px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardOverview;
