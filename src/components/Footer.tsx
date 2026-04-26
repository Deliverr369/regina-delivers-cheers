import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Instagram, Heart, Phone, Mail, Apple, Smartphone, MapPin } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-background border-t border-border">
      {/* Main grid */}
      <div className="container mx-auto px-5 py-14 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-8">
          {/* Brand / Contact */}
          <div className="md:col-span-4">
            <Link to="/" className="inline-block mb-5">
              <span className="font-display font-extrabold text-3xl tracking-tight text-primary">
                Deliverr
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-sm">
              Fast, reliable delivery from your favourite local stores in Saskatchewan.
            </p>

            <div className="space-y-3 mb-6">
              <a
                href="tel:+18552352205"
                className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group"
              >
                <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="font-medium">+1 (855) 235-2205</span>
              </a>
              <a
                href="mailto:support@deliverr.ca"
                className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group"
              >
                <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="font-medium">support@deliverr.ca</span>
              </a>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <span>Regina &amp; Saskatoon, SK</span>
              </div>
            </div>

            {/* Socials */}
            <div className="flex gap-2.5">
              {[
                { Icon: Facebook, label: "Facebook" },
                { Icon: Twitter, label: "Twitter" },
                { Icon: Linkedin, label: "LinkedIn" },
                { Icon: Instagram, label: "Instagram" },
              ].map(({ Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-primary-foreground hover:bg-primary hover:border-primary transition-all"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Service Areas */}
          <div className="md:col-span-3">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-5">
              Service Areas
            </h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors">
                  Liquor in Regina
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors">
                  Grocery in Regina
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors">
                  Takeout in Regina
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors">
                  Liquor in Saskatoon
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors">
                  Grocery in Saskatoon
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-2">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-5">
              Company
            </h4>
            <ul className="space-y-3 text-sm">
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">Help Center</Link></li>
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">Support</Link></li>
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">Careers</Link></li>
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">Become a Shopper</Link></li>
              <li><Link to="/how-it-works" className="text-muted-foreground hover:text-primary transition-colors">Partner with Us</Link></li>
            </ul>
          </div>

          {/* Get the App */}
          <div className="md:col-span-3">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-5">
              Get the App
            </h4>
            <div className="space-y-3 mb-7">
              <a
                href="#"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <Apple className="h-6 w-6 flex-shrink-0" />
                <div className="leading-tight">
                  <div className="text-[10px] opacity-75">Download on the</div>
                  <div className="text-sm font-semibold">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-foreground text-background hover:opacity-90 transition-opacity"
              >
                <Smartphone className="h-6 w-6 flex-shrink-0" />
                <div className="leading-tight">
                  <div className="text-[10px] opacity-75">Get it on</div>
                  <div className="text-sm font-semibold">Google Play</div>
                </div>
              </a>
            </div>

            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
              We Accept
            </h5>
            <div className="flex flex-wrap gap-2">
              {["Visa", "Mastercard", "Amex", "Interac"].map((label) => (
                <div
                  key={label}
                  className="h-9 px-3 rounded-md border border-border bg-card flex items-center justify-center text-[11px] font-bold text-foreground/70"
                >
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-border bg-muted/30">
        <div className="container mx-auto px-5 py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <p>© {year} Deliverr Delivery Services Inc. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
            <span className="inline-flex items-center gap-1.5">
              Made with <Heart className="h-3.5 w-3.5 fill-primary text-primary" /> in Canada
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
