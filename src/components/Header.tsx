import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, Menu, X, User, LogOut, Settings, LayoutDashboard } from "lucide-react";
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
import logo from "@/assets/deliverr-logo.png";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartItems } = useCart();
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white backdrop-blur-lg border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={logo} alt="Deliverr" className="h-8 md:h-10" />
          </Link>

          {/* Desktop Navigation - Earn Rewards */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              to="/how-it-works" 
              className="font-medium transition-colors hover:text-primary text-foreground flex items-center gap-2"
            >
              Earn Rewards
              <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5">
                New
              </Badge>
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <Link to="/cart" className="relative">
              <Button 
                variant="ghost" 
                size="icon"
                className="text-foreground hover:bg-gray-100"
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="text-foreground hover:bg-gray-100"
                  >
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-muted-foreground text-sm">
                    {user.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      My Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/orders">My Orders</Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin" className="flex items-center">
                        <Settings className="h-4 w-4 mr-2" />
                        Admin Panel
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link to="/login" className="hidden md:block">
                  <Button 
                    variant="outline" 
                    className="rounded-full px-6 border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Login
                  </Button>
                </Link>
                
                <Link to="/signup" className="hidden md:block">
                  <Button 
                    variant="outline" 
                    className="rounded-full px-6 border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Sign Up
                  </Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-foreground hover:bg-gray-100"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden bg-background border-t border-border animate-fade-in">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link to="/stores" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              Browse Stores
            </Link>
            <Link to="/products" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              Products
            </Link>
            <Link to="/how-it-works" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>
              How It Works
            </Link>
            {user && (
              <>
                <Link to="/profile" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>
                  My Profile
                </Link>
                <Link to="/orders" className="text-foreground font-medium py-2" onClick={() => setIsMenuOpen(false)}>
                  My Orders
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-foreground font-medium py-2 flex items-center gap-2" onClick={() => setIsMenuOpen(false)}>
                    <Settings className="h-4 w-4" />
                    Admin Panel
                  </Link>
                )}
              </>
            )}
            <hr className="border-border" />
            {user ? (
              <Button variant="outline" className="w-full" onClick={() => { handleSignOut(); setIsMenuOpen(false); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            ) : (
              <div className="flex gap-3">
                <Link to="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="outline" className="w-full">Login</Button>
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