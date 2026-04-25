import { Link, useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
  User,
  Package,
  LayoutDashboard,
  LogOut,
  LogIn,
  UserPlus,
  ChevronRight,
  Heart,
  Settings,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { useState } from "react";
import logo from "@/assets/deliverr-logo.png";

/**
 * Native-only side drawer used inside the iOS app shell.
 * The website's existing dropdown / mobile menu is unaffected.
 */
const MobileDrawer = () => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);

  const handleSignOut = async () => {
    close();
    await signOut();
    navigate("/");
  };

  const initials = user?.email?.[0]?.toUpperCase() || "D";

  // Only show items that link to existing pages.
  const loggedInItems = [
    { to: "/profile", label: "My Profile", icon: User },
    { to: "/orders", label: "Order History", icon: Package },
    ...(isAdmin
      ? [
          { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin", label: "Admin Panel", icon: Settings },
        ]
      : []),
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-foreground"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-[85%] max-w-[340px] p-0 flex flex-col bg-background border-r border-border"
      >
        {/* Header */}
        {user ? (
          <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-5 pt-12 pb-5 safe-top">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-lg font-bold ring-2 ring-white/30">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-[15px] font-bold leading-tight truncate">
                  {user.email?.split("@")[0]}
                </p>
                <p className="text-[12px] opacity-85 truncate">{user.email}</p>
              </div>
            </div>
            <p className="text-[13px] opacity-90 mt-3">
              What are you Deliverring today?
            </p>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground px-5 pt-12 pb-5 safe-top">
            <img src={logo} alt="Deliverr" className="h-7 mb-4 brightness-0 invert" />
            <p className="text-[13px] opacity-90 mb-3">
              Sign in to track orders and save addresses.
            </p>
            <div className="flex gap-2">
              <Link to="/login" onClick={close} className="flex-1">
                <Button
                  variant="secondary"
                  className="w-full h-10 rounded-full font-semibold text-sm bg-white text-primary hover:bg-white/90"
                >
                  <LogIn className="h-4 w-4 mr-1.5" /> Log In
                </Button>
              </Link>
              <Link to="/signup" onClick={close} className="flex-1">
                <Button
                  className="w-full h-10 rounded-full font-semibold text-sm bg-white/15 hover:bg-white/25 text-white border border-white/30"
                >
                  <UserPlus className="h-4 w-4 mr-1.5" /> Sign Up
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Menu items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {user &&
            loggedInItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={close}
                className="flex items-center gap-3 px-5 py-3.5 active:bg-muted/60 transition-colors"
              >
                <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-foreground/80" />
                </div>
                <span className="flex-1 text-[14.5px] font-medium text-foreground">
                  {item.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}

          <Link
            to="/stores"
            onClick={close}
            className="flex items-center gap-3 px-5 py-3.5 active:bg-muted/60 transition-colors"
          >
            <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
              <Heart className="h-4 w-4 text-foreground/80" />
            </div>
            <span className="flex-1 text-[14.5px] font-medium text-foreground">
              Browse Stores
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-5 py-3.5 active:bg-muted/60 transition-colors text-left mt-2 border-t border-border"
            >
              <div className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <span className="flex-1 text-[14.5px] font-medium text-destructive">
                Logout
              </span>
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border text-center pb-safe-plus">
          <p className="text-[12px] text-muted-foreground">
            Made with <span className="text-primary">❤</span> in Regina
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MobileDrawer;
