import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Instagram, Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-background text-foreground border-t border-border">
      {/* Top: Cities & Service Areas */}
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
          {/* Cities we serve */}
          <div>
            <h4 className="font-display font-bold text-base text-foreground mb-5">Cities we serve</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Regina
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Saskatoon
                </Link>
              </li>
            </ul>
          </div>

          {/* Regina */}
          <div>
            <h4 className="font-display font-bold text-base text-foreground mb-5">Regina</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Liquor Stores delivery in Regina
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Grocery Stores delivery in Regina
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Takeout delivery in Regina
                </Link>
              </li>
            </ul>
          </div>

          {/* Saskatoon */}
          <div>
            <h4 className="font-display font-bold text-base text-foreground mb-5">Saskatoon</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Liquor Stores delivery in Saskatoon
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors text-base">
                  Grocery Stores delivery in Saskatoon
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Middle: Menu / Opportunities / Payments / Contact */}
      <div className="bg-muted/40 border-t border-border">
        <div className="container mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            {/* Menu */}
            <div>
              <h4 className="font-display font-bold text-base text-foreground mb-5">Menu</h4>
              <ul className="space-y-3">
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">About Us</Link></li>
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">Help</Link></li>
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">Support</Link></li>
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">Earn Rewards</Link></li>
              </ul>
            </div>

            {/* Opportunities */}
            <div>
              <h4 className="font-display font-bold text-base text-foreground mb-5">Opportunities</h4>
              <ul className="space-y-3">
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">Become a Shopper</Link></li>
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">Be a Partner Store</Link></li>
                <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors text-base">Career</Link></li>
              </ul>
            </div>

            {/* Payment Options */}
            <div>
              <h4 className="font-display font-bold text-base text-foreground mb-5">Payment Options</h4>
              <div className="grid grid-cols-2 gap-3 max-w-[220px]">
                {["Mastercard", "Visa Debit", "Interac Debit", "Amex"].map((label) => (
                  <div
                    key={label}
                    className="h-14 rounded-lg border border-border bg-card flex items-center justify-center text-xs font-bold text-foreground/70 px-2 text-center"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <h4 className="font-display font-bold text-base text-foreground mt-7 mb-4">Download our Apps</h4>
              <ul className="space-y-2.5">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-base inline-flex items-center gap-2">
                     iOS app
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition-colors text-base inline-flex items-center gap-2">
                    🤖 Android app
                  </a>
                </li>
              </ul>
            </div>

            {/* Deliverr Contact */}
            <div>
              <h4 className="font-display font-bold text-base text-foreground mb-5">Deliverr</h4>
              <p className="text-foreground text-base mb-2">
                <span className="font-semibold">Toll Free Support : </span>
                <a href="tel:+18552352205" className="text-primary hover:underline">+1 (855)-235-2205</a>
              </p>
              <p className="text-foreground text-base mb-5">
                <span className="font-semibold">Email : </span>
                <a href="mailto:support@deliverr.ca" className="text-primary hover:underline">support@deliverr.ca</a>
              </p>
              <div className="flex gap-4">
                {[Facebook, Twitter, Linkedin, Instagram].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="text-foreground/60 hover:text-primary transition-colors"
                    aria-label="Social link"
                  >
                    <Icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom strip */}
          <div className="mt-12 pt-6 border-t border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-3 text-muted-foreground text-sm">
            <p>
              © {new Date().getFullYear()} Deliverr Delivery Services Inc. |{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> |{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
            </p>
            <p className="inline-flex items-center gap-1.5">
              Made with <Heart className="h-4 w-4 fill-primary text-primary" /> in Canada.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
