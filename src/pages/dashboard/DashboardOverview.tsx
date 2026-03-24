import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingCart, Users, Store, DollarSign } from "lucide-react";
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
    return <div className="text-muted-foreground">Loading dashboard...</div>;
  }

  const statCards = [
    { title: "Total Orders", value: stats.orders, icon: ShoppingCart, color: "text-blue-600" },
    { title: "Total Revenue", value: `$${stats.revenue.toFixed(2)}`, icon: DollarSign, color: "text-green-600" },
    { title: "Registered Users", value: stats.users, icon: Users, color: "text-purple-600" },
    { title: "Active Stores", value: stats.stores, icon: Store, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Overview</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium text-foreground text-sm">{order.id.slice(0, 8)}...</p>
                    <p className="text-xs text-muted-foreground">{order.delivery_address}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-foreground">${Number(order.total).toFixed(2)}</p>
                    <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                      {order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;
