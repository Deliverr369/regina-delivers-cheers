import { Link } from "react-router-dom";
import { Facebook, Twitter, Linkedin, Instagram, Heart, Phone, Mail, Apple, Smartphone, MapPin, Sparkles, ArrowRight } from "lucide-react";

const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden bg-background border-t border-border">
      {/* Decorative glows — subtle */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary/8 blur-3xl" />

      {/* Newsletter / CTA strip */}
      <div className="relative container mx-auto px-4 sm:px-5 pt-10 sm:pt-14 md:pt-16">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-primary-gradient p-6 sm:p-8 md:p-10 shadow-[0_20px_50px_-25px_hsl(var(--primary)/0.5)]">
          <div className="absolute inset-0 opacity-15" style={{
            backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.15) 0%, transparent 50%)'
          }} />
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-5 md:gap-6">
            <div className="text-primary-foreground w-full md:w-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[10px] sm:text-xs font-bold uppercase tracking-wider mb-3">
                <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                Exclusive Offers
              </div>
              <h3 className="font-display font-extrabold text-xl sm:text-2xl md:text-3xl leading-tight">
                Get $10 off your first order
              </h3>
              <p className="text-primary-foreground/90 text-xs sm:text-sm md:text-base mt-1.5">
                Join thousands shopping with Deliverr today.
              </p>
            </div>
            <Link
              to="/signup"
              className="w-full md:w-auto justify-center inline-flex items-center gap-2 bg-white text-primary font-bold px-6 py-3.5 sm:px-7 sm:py-4 rounded-full shadow-lg hover:shadow-xl active:scale-95 md:hover:scale-105 transition-all whitespace-nowrap"
            >
              Sign Up Free <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Main grid */}
      <div className="relative container mx-auto px-4 sm:px-5 py-10 sm:py-14 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-10 md:gap-8">
          {/* Brand / Contact */}
          <div className="md:col-span-4">
            <Link to="/" className="inline-block mb-4">
              <span className="font-display font-extrabold text-3xl sm:text-4xl tracking-tight bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Deliverr
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-5 max-w-sm">
              Fast, reliable delivery from your favourite local stores in Saskatchewan. ⚡
            </p>

            <div className="space-y-3 mb-6">
              <a
                href="tel:+13065333333"
                className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group min-w-0"
              >
                <span className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Phone className="h-4 w-4" />
                </span>
                <span className="font-semibold truncate">+1 (306) 533-3333</span>
              </a>
              <a
                href="mailto:support@deliverr.ca"
                className="flex items-center gap-3 text-sm text-foreground hover:text-primary transition-colors group min-w-0"
              >
                <span className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 group-hover:scale-110 group-hover:rotate-6 transition-transform">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="font-semibold truncate">support@deliverr.ca</span>
              </a>
              <div className="flex items-center gap-3 text-sm text-foreground min-w-0">
                <span className="h-10 w-10 flex-shrink-0 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                  <MapPin className="h-4 w-4" />
                </span>
                <span className="font-semibold truncate">Regina &amp; Saskatoon, SK</span>
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
                  className="h-11 w-11 rounded-xl bg-card border border-border flex items-center justify-center text-foreground/70 hover:text-primary-foreground hover:bg-gradient-to-br hover:from-primary hover:to-primary/70 hover:border-transparent hover:shadow-lg hover:shadow-primary/40 hover:-translate-y-1 transition-all"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links wrapper - 2 cols on mobile */}
          <div className="md:col-span-5 grid grid-cols-2 gap-8 sm:gap-6">
            {/* Service Areas */}
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-4 sm:mb-5 flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-gradient-to-r from-primary to-primary/40" />
                Service Areas
              </h4>
              <ul className="space-y-2.5 sm:space-y-3 text-sm">
                {[
                  "Liquor in Regina",
                  "Grocery in Regina",
                  "Takeout in Regina",
                  "Liquor in Saskatoon",
                  "Grocery in Saskatoon",
                ].map((label) => (
                  <li key={label}>
                    <Link to="/stores" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:w-3 transition-all" />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-4 sm:mb-5 flex items-center gap-2">
                <span className="h-1 w-6 rounded-full bg-gradient-to-r from-primary to-primary/40" />
                Company
              </h4>
              <ul className="space-y-2.5 sm:space-y-3 text-sm">
                {[
                  { label: "About Us", to: "/about" },
                  { label: "How It Works", to: "/how-it-works" },
                  { label: "Help Center", to: "/help" },
                  { label: "Support", to: "/help#contact" },
                  { label: "Privacy Policy", to: "/privacy" },
                  { label: "Terms of Use", to: "/terms" },
                ].map(({ label, to }) => (
                  <li key={label}>
                    <Link to={to} className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1.5 group">
                      <span className="w-1 h-1 rounded-full bg-primary/40 group-hover:bg-primary group-hover:w-3 transition-all" />
                      <span className="truncate">{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Get the App */}
          <div className="md:col-span-3">
            <h4 className="font-display font-bold text-sm uppercase tracking-wider text-foreground mb-4 sm:mb-5 flex items-center gap-2">
              <span className="h-1 w-6 rounded-full bg-gradient-to-r from-primary to-primary/40" />
              Get the App
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-1 gap-2.5 sm:gap-3 mb-6 sm:mb-7">
              <a
                href="#"
                className="group flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background hover:shadow-2xl hover:shadow-foreground/30 active:scale-95 md:hover:-translate-y-0.5 transition-all"
              >
                <Apple className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="leading-tight min-w-0">
                  <div className="text-[9px] sm:text-[10px] opacity-75">Download on the</div>
                  <div className="text-xs sm:text-sm font-bold">App Store</div>
                </div>
              </a>
              <a
                href="#"
                className="group flex items-center gap-2.5 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-foreground to-foreground/80 text-background hover:shadow-2xl hover:shadow-foreground/30 active:scale-95 md:hover:-translate-y-0.5 transition-all"
              >
                <Smartphone className="h-6 w-6 sm:h-7 sm:w-7 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div className="leading-tight min-w-0">
                  <div className="text-[9px] sm:text-[10px] opacity-75">Get it on</div>
                  <div className="text-xs sm:text-sm font-bold">Google Play</div>
                </div>
              </a>
            </div>

            <h5 className="font-display font-bold text-xs uppercase tracking-wider text-muted-foreground mb-3">
              We Accept
            </h5>
            <div className="flex flex-wrap gap-2">
              {[
                {
                  label: "Visa",
                  svg: (
                    <svg viewBox="0 0 48 16" className="h-4 sm:h-5" xmlns="http://www.w3.org/2000/svg">
                      <text x="24" y="13" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="14" fontStyle="italic" fill="#1A1F71">VISA</text>
                    </svg>
                  ),
                },
                {
                  label: "Mastercard",
                  svg: (
                    <svg viewBox="0 0 36 22" className="h-5 sm:h-6" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="14" cy="11" r="9" fill="#EB001B" />
                      <circle cx="22" cy="11" r="9" fill="#F79E1B" />
                      <path d="M18 4.5a9 9 0 0 0 0 13 9 9 0 0 0 0-13z" fill="#FF5F00" />
                    </svg>
                  ),
                },
                {
                  label: "Amex",
                  svg: (
                    <svg viewBox="0 0 48 16" className="h-4 sm:h-5" xmlns="http://www.w3.org/2000/svg">
                      <rect width="48" height="16" rx="2" fill="#2E77BC" />
                      <text x="24" y="11" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="7" fill="#fff">AMERICAN</text>
                      <text x="24" y="14.5" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="3.5" fill="#fff">EXPRESS</text>
                    </svg>
                  ),
                },
                {
                  label: "Interac",
                  svg: (
                    <svg viewBox="0 0 56 22" className="h-5 sm:h-6" xmlns="http://www.w3.org/2000/svg">
                      <rect width="22" height="22" rx="3" fill="#FFB800" />
                      <text x="11" y="14" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="7" fill="#000">I</text>
                      <text x="40" y="14" textAnchor="middle" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="9" fill="#000">erac</text>
                    </svg>
                  ),
                },
              ].map(({ label, svg }) => (
                <div
                  key={label}
                  title={label}
                  className="h-10 w-14 sm:h-11 sm:w-16 rounded-lg bg-white border border-border flex items-center justify-center px-2 hover:border-primary/40 hover:shadow-md transition-all"
                >
                  {svg}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="relative border-t border-border bg-background/60 backdrop-blur">
        <div className="container mx-auto px-4 sm:px-5 py-4 sm:py-5 flex flex-col md:flex-row justify-between items-center gap-3 text-[11px] sm:text-xs text-muted-foreground text-center md:text-left">
          <p>© {year} <span className="font-semibold text-foreground">Deliverr</span> Delivery Services Inc. All rights reserved.</p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:gap-5">
            <Link to="/privacy" className="hover:text-primary transition-colors font-medium">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors font-medium">Terms of Service</Link>
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
