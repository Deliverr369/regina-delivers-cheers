import { Link, useParams, Navigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, ShieldCheck, Truck } from "lucide-react";
import { localBusinessJsonLd, reginaServiceJsonLd } from "@/components/seo/LocalBusinessJsonLd";

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
  const { slug } = useParams();
  const cfg = slug ? CATEGORIES[slug] : null;

  if (!cfg) return <Navigate to="/stores" replace />;

  const path = `/${cfg.slug}`;
  const url = `https://www.deliverr.ca${path}`;

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={cfg.title}
        description={cfg.description}
        canonical={url}
        jsonLd={[
          localBusinessJsonLd,
          reginaServiceJsonLd,
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
