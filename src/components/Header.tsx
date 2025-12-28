import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ShoppingCart, Menu, X, User, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/hooks/useCart";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { cartItems } = useCart();
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isHomePage ? "bg-transparent" : "bg-background/95 backdrop-blur-lg border-b border-border"
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-xl">R</span>
            </div>
            <span className={`font-display font-bold text-xl ${isHomePage ? "text-white" : "text-foreground"}`}>
              ReginaSpirits
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              to="/stores" 
              className={`font-medium transition-colors hover:text-primary ${
                isHomePage ? "text-white/90" : "text-foreground"
              }`}
            >
              Browse Stores
            </Link>
            <Link 
              to="/products" 
              className={`font-medium transition-colors hover:text-primary ${
                isHomePage ? "text-white/90" : "text-foreground"
              }`}
            >
              Products
            </Link>
            <Link 
              to="/how-it-works" 
              className={`font-medium transition-colors hover:text-primary ${
                isHomePage ? "text-white/90" : "text-foreground"
              }`}
            >
              How It Works
            </Link>
          </nav>

          {/* Right Side Actions */}
          <div className="flex items-center gap-3">
            <Link to="/cart" className="relative">
              <Button 
                variant={isHomePage ? "ghost" : "outline"} 
                size="icon"
                className={isHomePage ? "text-white hover:bg-white/10" : ""}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 bg-primary text-primary-foreground">
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </Link>
            
            <Link to="/login" className="hidden md:block">
              <Button variant={isHomePage ? "outline" : "ghost"} className={isHomePage ? "border-white/30 text-white hover:bg-white/10" : ""}>
                Login
              </Button>
            </Link>
            
            <Link to="/signup" className="hidden md:block">
              <Button className="bg-primary hover:bg-primary/90">
                Sign Up
              </Button>
            </Link>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className={`md:hidden ${isHomePage ? "text-white" : ""}`}
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
            <hr className="border-border" />
            <div className="flex gap-3">
              <Link to="/login" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                <Button variant="outline" className="w-full">Login</Button>
              </Link>
              <Link to="/signup" className="flex-1" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">Sign Up</Button>
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;