import { Link, useLocation, Navigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, ShieldCheck, Truck } from "lucide-react";
import { localBusinessJsonLd, reginaServiceJsonLd, organizationJsonLd } from "@/components/seo/LocalBusinessJsonLd";

function buildFaqs(cfg: { name: string; ageGated: boolean }) {
  const item = cfg.name.toLowerCase();
  const base = [
    {
      q: `How fast is ${item} delivery in Regina?`,
      a: `Most ${item} orders in Regina arrive in 30 to 60 minutes. Delivery times depend on store hours and traffic conditions.`,
    },
    {
      q: `What does ${item} delivery cost in Regina?`,
      a: `Delivery starts at $7. Orders over $50 ship free at most stores. Costco delivery is $15 and Superstore is $10.`,
    },
    {
      q: `Is there a minimum order for ${item} delivery?`,
      a: `There's no strict minimum, but spending $50 or more unlocks free delivery at most participating Regina stores.`,
    },
    {
      q: `What payment methods can I use?`,
      a: `We accept all major credit cards (Visa, Mastercard, Amex). We do not accept cash on delivery.`,
    },
    {
      q: `Which Regina neighborhoods do you deliver ${item} to?`,
      a: `We deliver across all of Regina — Downtown, Cathedral, Harbour Landing, Lakeview, Eastview, North Central, South End, East End, West End, Uplands, Normanview and every other neighborhood.`,
    },
  ];

  if (cfg.ageGated) {
    base.splice(3, 0, {
      q: `Do I need to be 19+ to order ${item} in Saskatchewan?`,
      a: `Yes. Saskatchewan law requires you to be 19 or older to purchase ${item}. Your age is verified at checkout and again at the door — please have valid government-issued photo ID ready for the driver.`,
    });
    base.push({
      q: `Can someone else accept the ${item} delivery for me?`,
      a: `No. The person who placed the order must be present, 19+ and able to show valid photo ID. Drivers cannot leave ${item} unattended or with anyone underage.`,
    });
  }

  return base;
}

type CategoryConfig = {
  slug: string;
  name: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  shopTo: string;
  ageGated: boolean;
};

const CATEGORIES: Record<string, CategoryConfig> = {
  "alcohol-delivery-regina": {
    slug: "alcohol-delivery-regina",
    name: "Alcohol",
    h1: "Alcohol Delivery in Regina",
    title: "Alcohol Delivery in Regina, SK | Same-Day | Deliverr",
    description: "Same-day alcohol delivery in Regina. Beer, wine, spirits and coolers from your favourite liquor stores — delivered in under 60 minutes. 19+ only.",
    intro: "Order beer, wine, spirits, coolers and seltzers from Regina's top liquor stores. Most orders arrive in 30-60 minutes.",
    shopTo: "/products?category=liquor",
    ageGated: true,
  },
  "beer-delivery-regina": {
    slug: "beer-delivery-regina",
    name: "Beer",
    h1: "Beer Delivery in Regina",
    title: "Beer Delivery in Regina, SK | Cold Beer in 60 Min | Deliverr",
    description: "Cold beer delivered in Regina in under an hour. Domestic, imports, craft, tall cans and 24-packs from Regina's top liquor retailers. 19+ only.",
    intro: "Singles, six-packs, twelves and twenty-fours — domestic, import and craft. Delivered cold, fast.",
    shopTo: "/products?category=beer",
    ageGated: true,
  },
  "wine-delivery-regina": {
    slug: "wine-delivery-regina",
    name: "Wine",
    h1: "Wine Delivery in Regina",
    title: "Wine Delivery in Regina, SK | Reds, Whites & Bubbles | Deliverr",
    description: "Wine delivered to your door in Regina. Reds, whites, rosé, sparkling and champagne from local liquor stores. Same-day, 19+ only.",
    intro: "Reds, whites, rosé and bubbles from Regina's best liquor selections. Delivered the same day.",
    shopTo: "/products?category=wine",
    ageGated: true,
  },
  "liquor-delivery-regina": {
    slug: "liquor-delivery-regina",
    name: "Liquor",
    h1: "Liquor Delivery in Regina",
    title: "Liquor Delivery in Regina, SK | Spirits Same-Day | Deliverr",
    description: "Spirits delivery in Regina — vodka, whisky, rum, gin, tequila and more. Delivered in under 60 minutes from local liquor stores. 19+ only.",
    intro: "Vodka, whisky, rum, gin, tequila and liqueurs from Regina's full-service liquor stores.",
    shopTo: "/products?category=spirits",
    ageGated: true,
  },
  "grocery-delivery-regina": {
    slug: "grocery-delivery-regina",
    name: "Groceries",
    h1: "Grocery Delivery in Regina",
    title: "Grocery Delivery in Regina, SK | Same-Day | Deliverr",
    description: "Same-day grocery delivery in Regina from Costco, Superstore, Sobeys and more. Fresh, frozen and pantry essentials delivered fast.",
    intro: "Shop Costco, Superstore, Sobeys and other Regina grocers from one app. Fresh and frozen, delivered same-day.",
    shopTo: "/stores",
    ageGated: false,
  },
  "smokes-delivery-regina": {
    slug: "smokes-delivery-regina",
    name: "Smokes & Vape",
    h1: "Smokes & Vape Delivery in Regina",
    title: "Smokes & Vape Delivery in Regina, SK | Same-Day | Deliverr",
    description: "Cigarettes, vapes, pouches and accessories delivered in Regina. Same-day from licensed retailers. 19+ only.",
    intro: "Cigarettes, vapes, pouches and rolling supplies from Regina's licensed retailers — delivered fast.",
    shopTo: "/products?category=smokes",
    ageGated: true,
  },
};

const CategoryLanding = () => {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").split("/")[0];
  const cfg = slug ? CATEGORIES[slug] : null;

  if (!cfg) return <Navigate to="/stores" replace />;

  const path = `/${cfg.slug}`;
  const url = `https://www.deliverr.ca${path}`;
  const faqs = buildFaqs(cfg);

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={cfg.title}
        description={cfg.description}
        canonical={url}
        jsonLd={[
          organizationJsonLd,
          localBusinessJsonLd,
          reginaServiceJsonLd,
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.deliverr.ca/" },
              { "@type": "ListItem", position: 2, name: cfg.name, item: url },
            ],
          },
        ]}
      />
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" /> Regina, SK
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-5 font-heading">{cfg.h1}</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">{cfg.intro}</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg">
                <Link to={cfg.shopTo}>Shop {cfg.name}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/stores">Browse All Stores</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">
              Why Regina Chooses Deliverr
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: Clock, title: "Under 60 minutes", body: "Most orders arrive in 30-60 mins" },
                { icon: Truck, title: "Free over $50", body: "Free delivery on qualifying orders" },
                { icon: ShieldCheck, title: cfg.ageGated ? "19+ verified" : "Trusted drivers", body: cfg.ageGated ? "Age checked at checkout & door" : "Background-checked, friendly" },
                { icon: MapPin, title: "All of Regina", body: "Every postal code covered" },
              ].map((f) => (
                <Card key={f.title}>
                  <CardContent className="p-6 text-center">
                    <f.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-1">{f.title}</h3>
                    <p className="text-sm text-muted-foreground">{f.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ — mirrors FAQPage JSON-LD */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 font-heading">
              {cfg.name} Delivery — Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              {faqs.map((item) => (
                <div key={item.q} className="border-b pb-6 last:border-0">
                  <h3 className="font-semibold text-lg mb-2">{item.q}</h3>
                  <p className="text-muted-foreground">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
              Ready to order in Regina?
            </h2>
            <p className="mb-8 opacity-90 text-lg">
              Browse Regina's top stores and get your order in under an hour.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to={cfg.shopTo}>Start Shopping</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CategoryLanding;
