import { Link } from "react-router-dom";
import { Facebook, Instagram, Twitter, Mail, Phone, MapPin } from "lucide-react";
import logo from "@/assets/deliverr-logo.png";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center mb-4">
              <img src={logo} alt="Deliverr" className="h-7 brightness-0 invert" />
            </Link>
            <p className="text-background/50 text-sm mb-5 leading-relaxed">
              Regina's premier liquor delivery service. Fast, reliable, and always at store prices.
            </p>
            <div className="flex gap-3">
              {[Facebook, Instagram, Twitter].map((Icon, i) => (
                <a key={i} href="#" className="text-background/40 hover:text-primary transition-colors p-2 rounded-lg hover:bg-background/5">
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-display font-bold text-sm text-background/80 uppercase tracking-wider mb-4">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/stores", label: "Browse Stores" },
                { to: "/products", label: "All Products" },
                { to: "/how-it-works", label: "How It Works" },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-background/50 hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="font-display font-bold text-sm text-background/80 uppercase tracking-wider mb-4">Categories</h4>
            <ul className="space-y-2.5">
              {[
                { to: "/products?category=beer", label: "Beer" },
                { to: "/products?category=wine", label: "Wine" },
                { to: "/products?category=spirits", label: "Spirits" },
                { to: "/products?category=smokes", label: "Smokes & Tobacco" },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-background/50 hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-display font-bold text-sm text-background/80 uppercase tracking-wider mb-4">Contact</h4>
            <ul className="space-y-3">
              {[
                { icon: MapPin, text: "Regina, SK" },
                { icon: Phone, text: "(306) 555-0123" },
                { icon: Mail, text: "hello@deliverr.ca" },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2.5 text-background/50 text-sm">
                  <item.icon className="h-4 w-4 text-primary shrink-0" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-background/10 mt-10 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-background/40 text-xs">
            <p>© {new Date().getFullYear()} Deliverr. All rights reserved.</p>
            <div className="flex gap-6">
              <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>

        <div className="mt-6 p-3.5 bg-background/5 rounded-xl text-center text-xs text-background/40 border border-background/5">
          ⚠️ Must be 19+ to order. Please drink responsibly. We verify ID on every delivery.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
