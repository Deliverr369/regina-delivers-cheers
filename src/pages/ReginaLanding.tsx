import { Link, useParams } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, ShieldCheck, Truck, Wine, Beer, ShoppingBag, Cigarette } from "lucide-react";
import { localBusinessJsonLd, reginaServiceJsonLd, organizationJsonLd, reginaFaqJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import InternalLinksSection from "@/components/seo/InternalLinks";
import FaqAccordion from "@/components/seo/FaqAccordion";

type Hood = { name: string; blurb: string; nearby: string[]; quadrant: string };

const NEIGHBORHOODS: Record<string, Hood> = {
  downtown: { name: "Downtown", blurb: "Fast delivery to Regina's downtown core — condos, offices and hotels.", nearby: ["Cathedral", "The Crescents", "North Central"], quadrant: "central Regina" },
  cathedral: { name: "Cathedral", blurb: "Heritage homes, indie shops and same-day delivery to your door.", nearby: ["Downtown", "The Crescents", "Lakeview"], quadrant: "central Regina" },
  "harbour-landing": { name: "Harbour Landing", blurb: "Fast delivery to Regina's growing south-end community.", nearby: ["Albert Park", "Lakeview", "Whitmore Park"], quadrant: "south Regina" },
  lakeview: { name: "Lakeview", blurb: "Quick service to Lakeview and Wascana Park area.", nearby: ["The Crescents", "Cathedral", "Hillsdale"], quadrant: "south-central Regina" },
  "albert-park": { name: "Albert Park", blurb: "Reliable delivery across Albert Park.", nearby: ["Hillsdale", "Whitmore Park", "Harbour Landing"], quadrant: "south Regina" },
  hillsdale: { name: "Hillsdale", blurb: "Friendly drivers serving all of Hillsdale.", nearby: ["Lakeview", "Albert Park", "Whitmore Park"], quadrant: "south Regina" },
  eastview: { name: "Eastview", blurb: "Same-day service to Eastview and surrounding areas.", nearby: ["Cathedral", "Downtown", "The Crescents"], quadrant: "east-central Regina" },
  "whitmore-park": { name: "Whitmore Park", blurb: "Delivery to Whitmore Park in under 60 minutes.", nearby: ["Hillsdale", "Albert Park", "Harbour Landing"], quadrant: "south Regina" },
  "the-crescents": { name: "The Crescents", blurb: "Doorstep delivery throughout The Crescents.", nearby: ["Cathedral", "Lakeview", "Downtown"], quadrant: "central Regina" },
  "north-central": { name: "North Central", blurb: "Same-day delivery across North Central Regina.", nearby: ["Downtown", "Normanview", "Uplands"], quadrant: "north Regina" },
  "south-end": { name: "South End", blurb: "Reliable service to all of Regina's south end.", nearby: ["Harbour Landing", "Albert Park", "Hillsdale", "Whitmore Park"], quadrant: "south Regina" },
  "east-end": { name: "East End", blurb: "Doorstep delivery throughout Regina's east end.", nearby: ["Eastview", "Uplands"], quadrant: "east Regina" },
  "west-end": { name: "West End", blurb: "Quick delivery to Regina's west end neighborhoods.", nearby: ["Normanview", "North Central"], quadrant: "west Regina" },
  uplands: { name: "Uplands", blurb: "Same-day service to the Uplands community.", nearby: ["Normanview", "North Central", "East End"], quadrant: "north Regina" },
  normanview: { name: "Normanview", blurb: "Friendly delivery across Normanview and Normanview West.", nearby: ["Uplands", "North Central", "West End"], quadrant: "north-west Regina" },
};

const ReginaLanding = () => {
  const { neighborhood } = useParams();
  const hood = neighborhood ? NEIGHBORHOODS[neighborhood] : null;

  const areaName = hood ? `${hood.name}, Regina` : "Regina";
  const path = hood ? `/delivery/regina/${neighborhood}` : "/delivery/regina";
  const title = hood
    ? `${hood.name} Delivery | Alcohol & Groceries in Regina | Deliverr`
    : "Delivery Service in Regina, SK | Alcohol, Groceries & Smokes | Deliverr";
  const description = hood
    ? `Same-day alcohol, grocery and smokes delivery to ${hood.name}, Regina. Order in 60 seconds, delivered in under an hour. 19+ only.`
    : "Regina's #1 same-day delivery service. Alcohol, groceries, smokes from Costco, Superstore, Sobeys and local liquor stores. Delivered in under 60 minutes.";

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={title}
        description={description}
        canonical={`https://regina-delivers-cheers.lovable.app${path}`}
        jsonLd={[
          organizationJsonLd,
          localBusinessJsonLd,
          reginaServiceJsonLd,
          reginaFaqJsonLd(areaName, hood ? { name: hood.name, quadrant: hood.quadrant, nearby: hood.nearby } : undefined),
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://regina-delivers-cheers.lovable.app/" },
              { "@type": "ListItem", position: 2, name: "Regina Delivery", item: "https://regina-delivers-cheers.lovable.app/delivery/regina" },
              ...(hood ? [{ "@type": "ListItem", position: 3, name: hood.name, item: `https://regina-delivers-cheers.lovable.app${path}` }] : []),
            ],
          },
        ]}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" /> {areaName}
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-5 font-heading">
              Delivery Service in {areaName}
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {hood?.blurb || "Same-day alcohol, grocery and convenience delivery from Regina's top stores. Ordered in seconds, delivered in under 60 minutes."}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/stores">Browse Stores</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/categories">Shop by Category</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Why us */}
        <section className="py-16">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">
              Why {areaName} Chooses Deliverr
            </h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { icon: Clock, title: "Under 60 minutes", body: "Most orders arrive in 30-60 mins" },
                { icon: Truck, title: "Free over $50", body: "Free delivery on qualifying orders" },
                { icon: ShieldCheck, title: "19+ verified", body: "Age checked at checkout & door" },
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

        {/* Categories */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 font-heading">
              What You Can Get Delivered in {areaName}
            </h2>
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { icon: Beer, name: "Beer", to: "/products?category=beer" },
                { icon: Wine, name: "Wine & Spirits", to: "/products?category=wine" },
                { icon: ShoppingBag, name: "Groceries", to: "/stores" },
                { icon: Cigarette, name: "Smokes & Vape", to: "/products?category=smokes" },
              ].map((c) => (
                <Link key={c.name} to={c.to}>
                  <Card className="hover:border-primary transition-colors h-full">
                    <CardContent className="p-6 text-center">
                      <c.icon className="h-10 w-10 text-primary mx-auto mb-3" />
                      <h3 className="font-semibold">{c.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Neighborhood links (only on main /delivery/regina page) */}
        {!hood && (
          <section className="py-16">
            <div className="container max-w-6xl mx-auto px-4">
              <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 font-heading">
                Regina Neighborhoods We Serve
              </h2>
              <p className="text-center text-muted-foreground mb-10">
                We deliver across every Regina neighborhood — same-day, every day.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(NEIGHBORHOODS).map(([slug, n]) => (
                  <Link
                    key={slug}
                    to={`/delivery/regina/${slug}`}
                    className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors text-center"
                  >
                    <p className="font-semibold">{n.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">Same-day delivery</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* FAQ — mirrors FAQPage JSON-LD for rich-result eligibility */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 font-heading">
              {areaName} Delivery FAQ
            </h2>
            {(() => {
              const speedA = hood
                ? `Most ${hood.name} orders arrive in 30–45 minutes thanks to our drivers covering ${hood.quadrant}. Delivery windows depend on store hours and traffic.`
                : `Most orders in Regina arrive in 30 to 60 minutes. Delivery windows depend on store hours and traffic.`;
              const coverageQ = hood
                ? `Which streets near ${hood.name} do you deliver to?`
                : `Which Regina neighborhoods do you deliver to?`;
              const coverageA = hood
                ? `We cover all of ${hood.name} and the surrounding ${hood.quadrant} — including ${hood.nearby.join(", ")}. If your address falls inside Regina city limits, we deliver to it.`
                : `We deliver to every Regina neighborhood — Downtown, Cathedral, Harbour Landing, Lakeview, Albert Park, Hillsdale, Eastview, Whitmore Park, The Crescents, North Central, South End, East End, West End, Uplands and Normanview.`;
              const items = [
                { q: `How fast is delivery in ${areaName}?`, a: speedA },
                { q: `What can I get delivered in ${areaName}?`, a: "Beer, wine, spirits, coolers and seltzers from local liquor stores, plus groceries from Costco, Superstore and Sobeys, and smokes & vape from licensed retailers." },
                { q: coverageQ, a: coverageA },
                { q: `Is there a minimum order or delivery fee in ${areaName}?`, a: "Delivery starts at $7. Orders over $50 ship free at most stores. Costco delivery is $15 and Superstore is $10." },
                { q: `Do I need to be 19+ to order alcohol, smokes or vape in ${areaName}?`, a: "Yes. You must be 19 or older to order alcohol, smokes or vape in Saskatchewan. At checkout you confirm your date of birth, and on delivery the driver will ask for valid government-issued photo ID matching the name on the order. Orders cannot be left unattended or handed to anyone under 19." },
                { q: "What payment methods does Deliverr accept?", a: "We accept all major credit cards. We do not accept cash on delivery." },
              ];
              return <FaqAccordion items={items} />;
            })()}
          </div>
        </section>

        <InternalLinksSection excludeNeighborhood={neighborhood} />

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
              Ready to order in {areaName}?
            </h2>
            <p className="mb-8 opacity-90 text-lg">
              Browse Regina's top stores and get your order in under an hour.
            </p>
            <Button asChild size="lg" variant="secondary">
              <Link to="/stores">Start Shopping</Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default ReginaLanding;
