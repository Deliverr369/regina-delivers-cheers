import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SEO } from "@/components/seo/SEO";
import { Link } from "react-router-dom";
import { Sparkles, Clock, ShieldCheck, Heart, Truck, Store, Tag, Users, ArrowRight } from "lucide-react";

const About = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="About Deliverr — Regina's Liquor Delivery Service"
        description="Deliverr is Regina's trusted same-day liquor delivery service. Beer, wine, spirits & smokes from local stores at store prices, delivered in under 60 minutes."
        canonical="https://regina-delivers-cheers.lovable.app/about"
        jsonLd={[
          {
            "@context": "https://schema.org",
            "@type": "AboutPage",
            name: "About Deliverr",
            url: "https://regina-delivers-cheers.lovable.app/about",
            description:
              "Learn about Deliverr, Regina's leading alcohol and smokes delivery service offering same-day delivery from local liquor stores at store prices.",
          },
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Deliverr",
            url: "https://regina-delivers-cheers.lovable.app",
            logo: "https://regina-delivers-cheers.lovable.app/og-image.jpg",
            areaServed: { "@type": "City", name: "Regina", containedInPlace: { "@type": "AdministrativeArea", name: "Saskatchewan" } },
            description:
              "Same-day liquor, beer, wine, spirits and smokes delivery in Regina, Saskatchewan.",
            sameAs: [],
          },
        ]}
      />
      <Header />
      <main className="pt-header">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 py-20 md:py-28">
          <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-secondary/20 blur-3xl" />
          <div className="relative container mx-auto px-4 text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wider mb-5">
              <Sparkles className="h-3.5 w-3.5" /> About Deliverr
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-extrabold text-foreground leading-tight mb-5">
              Regina's trusted{" "}
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                liquor delivery
              </span>{" "}
              service
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
              Our mission is to make drinking responsible, convenient, and enjoyable. We deliver
              beer, wine, spirits and smokes from your favourite Regina liquor stores — straight to
              your door in under 60 minutes, at store prices.
            </p>
          </div>
        </section>

        {/* Story sections */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 max-w-4xl space-y-14">
            <article>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                The responsible alternative to last-minute liquor runs
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                Deliverr is Regina's leading alcohol delivery service. We're a team of
                problem-solving locals helping you enjoy a wide assortment of beer, wine, spirits,
                and smokes — without ever stepping out of your home. From birthdays and game nights
                to quiet evenings in, our same-day liquor delivery has you covered across Regina,
                Saskatchewan.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Where the price is right
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                Choose from a curated lineup of Regina's top liquor stores — Sobeys Liquor, Co-op
                Liquor, Costco Liquor, Superstore Liquor, and more. Our extensive drinks catalogue
                offers competitive prices with{" "}
                <strong className="text-foreground">no markup</strong> on alcohol. Yes, you read
                that right: liquor delivery in Regina at store prices, with free delivery on orders
                over $50.
              </p>
            </article>

            <article>
              <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-4">
                Where we care
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base md:text-lg">
                With strict drinking-and-driving laws and Saskatchewan's harsh winters, a trip to
                the liquor store isn't always easy. We make it simple. A few taps and your
                favourite beverage is on its way. We card every customer (19+, ID required), and
                we're proud to support our partner stores and the local Regina community.
              </p>
            </article>
          </div>
        </section>

        {/* Why choose us */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container mx-auto px-4">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground text-center mb-12">
              Why Reginans choose Deliverr
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
              {[
                { icon: Clock, title: "Under 60 minutes", desc: "Same-day delivery across Regina." },
                { icon: Tag, title: "Store prices", desc: "No markup on alcohol or smokes." },
                { icon: ShieldCheck, title: "Safe & legal", desc: "ID checked on every delivery (19+)." },
                { icon: Store, title: "Local stores", desc: "Sobeys, Co-op, Costco, Superstore & more." },
                { icon: Truck, title: "Free over $50", desc: "Free delivery on qualifying orders." },
                { icon: Heart, title: "Locally loved", desc: "Built in Regina, for Regina." },
                { icon: Users, title: "Trusted team", desc: "Friendly, professional shoppers." },
                { icon: Sparkles, title: "Special offers", desc: "Exclusive deals & promo codes." },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:-translate-y-1 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-display font-bold text-foreground mb-1">{title}</h3>
                  <p className="text-sm text-muted-foreground">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-primary to-primary/80 p-10 md:p-14 text-center shadow-2xl shadow-primary/30 max-w-4xl mx-auto">
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.2) 0%, transparent 50%)",
                }}
              />
              <div className="relative">
                <h2 className="font-display text-3xl md:text-4xl font-extrabold text-primary-foreground mb-3">
                  Ready to order?
                </h2>
                <p className="text-primary-foreground/90 text-base md:text-lg mb-6">
                  Browse Regina's best liquor stores and get it delivered fast.
                </p>
                <Link
                  to="/stores"
                  className="inline-flex items-center gap-2 bg-white text-primary font-bold px-7 py-4 rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all"
                >
                  Shop Stores <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
