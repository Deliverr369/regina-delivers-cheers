import { BarChart3, ShoppingCart, Users, Store, Package, Megaphone, Clock, LogOut, Home, ImagePlus, Boxes } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";

const mainMenu = [
  { title: "Overview", url: "/dashboard", icon: BarChart3 },
  { title: "Orders", url: "/dashboard/orders", icon: ShoppingCart },
  { title: "Products", url: "/dashboard/products", icon: Package },
];

const storeMenu = [
  { title: "Stores", url: "/dashboard/stores", icon: Store },
  { title: "Store Hours", url: "/dashboard/store-hours", icon: Clock },
];

const contentMenu = [
  { title: "Users", url: "/dashboard/users", icon: Users },
  { title: "Promo Banners", url: "/dashboard/banners", icon: Megaphone },
  { title: "Bulk Images", url: "/dashboard/bulk-images", icon: ImagePlus },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const renderMenu = (items: typeof mainMenu) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton asChild isActive={isActive(item.url)}>
            <NavLink
              to={item.url}
              end
              className="hover:bg-muted/50 rounded-lg transition-colors"
              activeClassName="bg-primary/10 text-primary font-medium"
            >
              <item.icon className="mr-2 h-4 w-4" />
              {!collapsed && <span>{item.title}</span>}
            </NavLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarContent className="pt-2">
        {!collapsed && (
          <div className="px-4 py-3 mb-2">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">D</span>
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">Deliverr</p>
                <p className="text-[11px] text-muted-foreground">Admin Panel</p>
              </div>
            </div>
          </div>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {!collapsed && "Main"}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderMenu(mainMenu)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {!collapsed && "Store Ops"}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderMenu(storeMenu)}</SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {!collapsed && "Content"}
          </SidebarGroupLabel>
          <SidebarGroupContent>{renderMenu(contentMenu)}</SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3 space-y-1">
        <Separator className="mb-2" />
        <Button variant="ghost" className="w-full justify-start text-sm h-9" size="sm" onClick={() => navigate("/")}>
          <Home className="h-4 w-4 mr-2" />
          {!collapsed && "Back to Site"}
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start text-sm h-9 text-destructive hover:text-destructive hover:bg-destructive/10"
          size="sm"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
