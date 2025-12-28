import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-display font-bold text-xl">R</span>
              </div>
              <span className="font-display font-bold text-xl text-background">
                ReginaSpirits
              </span>
            </Link>
            <p className="text-background/70 mb-6">
              Regina's premier liquor and smoke delivery service. Fast, reliable, and always at store prices.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-background/70 hover:text-primary transition-colors">
                <Twitter className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/stores" className="text-background/70 hover:text-primary transition-colors">
                  Browse Stores
                </Link>
              </li>
              <li>
                <Link to="/products" className="text-background/70 hover:text-primary transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link to="/how-it-works" className="text-background/70 hover:text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-background/70 hover:text-primary transition-colors">
                  FAQ
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Categories</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/products?category=beer" className="text-background/70 hover:text-primary transition-colors">
                  Beer
                </Link>
              </li>
              <li>
                <Link to="/products?category=wine" className="text-background/70 hover:text-primary transition-colors">
                  Wine
                </Link>
              </li>
              <li>
                <Link to="/products?category=spirits" className="text-background/70 hover:text-primary transition-colors">
                  Spirits
                </Link>
              </li>
              <li>
                <Link to="/products?category=smokes" className="text-background/70 hover:text-primary transition-colors">
                  Smokes & Tobacco
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-background/70">
                <MapPin className="h-5 w-5 text-primary" />
                Regina, Saskatchewan
              </li>
              <li className="flex items-center gap-3 text-background/70">
                <Phone className="h-5 w-5 text-primary" />
                (306) 555-0123
              </li>
              <li className="flex items-center gap-3 text-background/70">
                <Mail className="h-5 w-5 text-primary" />
                hello@reginaspirits.ca
              </li>
            </ul>
          </div>
        </div>

        <hr className="border-background/20 my-12" />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-background/60 text-sm">
          <p>© 2024 ReginaSpirits. All rights reserved.</p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          </div>
        </div>

        <div className="mt-8 p-4 bg-background/10 rounded-lg text-center text-sm text-background/60">
          <p>⚠️ Must be 19+ to order. Please drink responsibly. We check ID on delivery.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;