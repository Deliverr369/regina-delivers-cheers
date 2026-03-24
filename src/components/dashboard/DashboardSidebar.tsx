import { BarChart3, ShoppingCart, Users, Store, Package, Megaphone, Clock, LogOut, Home } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Overview", url: "/dashboard", icon: BarChart3 },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "Products", url: "/dashboard/products", icon: Package },
  { title: "Stores", url: "/dashboard/stores", icon: Store },
  { title: "Store Hours", url: "/dashboard/store-hours", icon: Clock },
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Promo Banners", url: "/dashboard/banners", icon: Megaphone },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{!collapsed && "Admin Dashboard"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <NavLink to={item.url} end className="hover:bg-muted/50" activeClassName="bg-muted text-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2 space-y-1">
        <Button variant="ghost" className="w-full justify-start" size="sm" onClick={() => navigate("/")}>
          <Home className="h-4 w-4 mr-2" />
          {!collapsed && "Back to Site"}
        </Button>
        <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
