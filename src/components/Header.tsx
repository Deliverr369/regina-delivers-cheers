import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, User, LogOut, Settings, LayoutDashboard, Package, Heart, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useIsNative } from "@/hooks/useIsNative";
import MobileDrawer from "@/components/MobileDrawer";
import NotificationsBell from "@/components/NotificationsBell";
import logo from "@/assets/deliverr-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartItems } = useCart();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const isNative = useIsNative();
  const navigate = useNavigate();

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const SHOP_LINKS = [
    { to: "/products", label: "Alcohol Delivery" },
    { to: "/products?category=beer", label: "Beer Delivery" },
    { to: "/products?category=wine", label: "Wine Delivery" },
    { to: "/products?category=spirits", label: "Liquor Delivery" },
    { to: "/products?category=grocery", label: "Grocery Delivery" },
    { to: "/products?category=smokes", label: "Smokes & Vape" },
  ];

  const AREA_LINKS = [
    { to: "/delivery/regina", label: "All of Regina" },
    { to: "/delivery/regina/downtown", label: "Downtown" },
    { to: "/delivery/regina/cathedral", label: "Cathedral" },
    { to: "/delivery/regina/harbour-landing", label: "Harbour Landing" },
    { to: "/delivery/regina/lakeview", label: "Lakeview" },
    { to: "/delivery/regina/eastview", label: "Eastview" },
    { to: "/delivery/regina/north-central", label: "North Central" },
    { to: "/delivery/regina/south-end", label: "South End" },
    { to: "/delivery/regina/east-end", label: "East End" },
    { to: "/delivery/regina/west-end", label: "West End" },
    { to: "/delivery/regina/uplands", label: "Uplands" },
    { to: "/delivery/regina/normanview", label: "Normanview" },
    { to: "/delivery/regina/albert-park", label: "Albert Park" },
    { to: "/delivery/regina/hillsdale", label: "Hillsdale" },
    { to: "/delivery/regina/whitmore-park", label: "Whitmore Park" },
    { to: "/delivery/regina/the-crescents", label: "The Crescents" },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border/80 safe-top safe-px">
      <div className="container mx-auto px-3 sm:px-4 max-w-full">
        <div className="flex items-center justify-between h-16 gap-2 min-w-0">
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 min-w-0">
            <img src={logo} alt="Deliverr" className="h-12 md:h-14 w-auto max-w-[220px] object-contain" />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/stores" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
              Stores
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                  Shop <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {SHOP_LINKS.map((l) => (
                  <DropdownMenuItem key={l.to} asChild>
                    <Link to={l.to}>{l.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
                  Areas <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 max-h-[70vh] overflow-y-auto">
                {AREA_LINKS.map((l) => (
                  <DropdownMenuItem key={l.to} asChild>
                    <Link to={l.to}>{l.label}</Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Link to="/how-it-works" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted/50">
              How It Works
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {user && <NotificationsBell />}
            <Link to="/cart" className="relative">
              <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground">
                <ShoppingCart className="h-[18px] w-[18px]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                    {cartCount}
                  </span>
                )}
              </Button>
            </Link>
            
            {user && !isNative ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 text-foreground">
                    <User className="h-[18px] w-[18px]" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <div className="px-3 py-2">
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center gap-2">
                      <User className="h-4 w-4" /> My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders" className="flex items-center gap-2">
                      <Package className="h-4 w-4" /> My Orders
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/favorites" className="flex items-center gap-2">
                      <Heart className="h-4 w-4" /> Favourites
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link to="/dashboard" className="flex items-center gap-2">
                          <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="flex items-center gap-2">
                          <Settings className="h-4 w-4" /> Admin Panel
                        </Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4 mr-2" /> Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login">
                  <Button variant="ghost" size="sm" className="text-sm font-medium">
                    Log In
                  </Button>
                </Link>
                <Link to="/signup">
                  <Button size="sm" className="rounded-full px-5 text-sm font-medium">
                    Sign Up
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu trigger */}
            {isNative ? (
              <div className="md:hidden">
                <MobileDrawer />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-foreground"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu (web only) */}
      {!isNative && isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-1">
            {[
              { to: "/stores", label: "Browse Stores" },
              { to: "/how-it-works", label: "How It Works" },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <details className="group">
              <summary className="cursor-pointer list-none flex items-center justify-between text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                Shop by Category
                <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pl-3 mt-1 flex flex-col">
                {SHOP_LINKS.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setIsMenuOpen(false)} className="text-sm text-muted-foreground py-2 px-3 rounded-md hover:bg-muted/50 hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </details>

            <details className="group">
              <summary className="cursor-pointer list-none flex items-center justify-between text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-muted/50 transition-colors">
                Regina Areas
                <ChevronDown className="h-4 w-4 group-open:rotate-180 transition-transform" />
              </summary>
              <div className="pl-3 mt-1 flex flex-col max-h-72 overflow-y-auto">
                {AREA_LINKS.map((l) => (
                  <Link key={l.to} to={l.to} onClick={() => setIsMenuOpen(false)} className="text-sm text-muted-foreground py-2 px-3 rounded-md hover:bg-muted/50 hover:text-foreground transition-colors">
                    {l.label}
                  </Link>
                ))}
              </div>
            </details>
            {user && (
              <>
                <Link to="/profile" className="text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-muted/50" onClick={() => setIsMenuOpen(false)}>My Profile</Link>
                <Link to="/orders" className="text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-muted/50" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                {isAdmin && (
                  <Link to="/dashboard" className="text-foreground font-medium py-2.5 px-3 rounded-lg hover:bg-muted/50 flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                    <LayoutDashboard className="h-4 w-4" /> Dashboard
                  </Link>
                )}
              </>
            )}
            <hr className="border-border my-2" />
            {user ? (
              <Button variant="outline" className="w-full" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                <LogOut className="h-4 w-4 mr-2" /> Sign Out
              </Button>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Log In</Button>
                </Link>
                <Link to="/signup" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button className="w-full">Sign Up</Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
