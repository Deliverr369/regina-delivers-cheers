import { Link } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import InternalLinksSection from "@/components/seo/InternalLinks";
import FaqAccordion from "@/components/seo/FaqAccordion";
import { Button } from "@/components/ui/button";
import { BadgePercent, Clock, Truck, ShieldCheck } from "lucide-react";

const SITE_URL = "https://deliverr.ca";

const faqs = [
  {
    question: "Where can I find weekly liquor and grocery deals in Regina?",
    answer:
      "Right here. Deliverr updates weekly deals from Regina stores like Sobeys Liquor, Co-op Liquor, Superstore and more. Browse the deals, add them to your cart, and get them delivered the same day.",
  },
  {
    question: "How fast is delivery on weekly deals?",
    answer:
      "Most orders arrive in 25–45 minutes anywhere in Regina. You can also schedule a delivery time that works for you during store hours.",
  },
  {
    question: "Is there a delivery fee?",
    answer:
      "Delivery starts at $7 and is free on orders over $50. The exact fee is shown at checkout before you pay.",
  },
  {
    question: "Do I need to be 19+ to order alcohol or smokes?",
    answer:
      "Yes. You must be 19 or older to order alcohol, cigarettes or vape products in Saskatchewan. Our drivers verify ID at the door.",
  },
];

const OffersWeeklyDeals = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Weekly Deals Delivery in Regina",
      serviceType: "Liquor, grocery and smoke delivery",
      provider: { "@type": "Organization", name: "Deliverr", url: SITE_URL },
      areaServed: { "@type": "City", name: "Regina", addressRegion: "SK" },
      offers: {
        "@type": "Offer",
        priceCurrency: "CAD",
        description: "Weekly deals on liquor, beer, wine, smokes and groceries with same-day delivery in Regina. Delivery from $7, free over $50.",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
        { "@type": "ListItem", position: 2, name: "Offers", item: `${SITE_URL}/offers/weekly-deals` },
        { "@type": "ListItem", position: 3, name: "Weekly Deals", item: `${SITE_URL}/offers/weekly-deals` },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Weekly Deals in Regina — Liquor, Smokes & Grocery Delivery | Deliverr"
        description="Shop this week's deals on liquor, beer, wine, smokes and groceries in Regina. Same-day delivery in 25–45 minutes. Free delivery over $50."
        canonical={`${SITE_URL}/offers/weekly-deals`}
        jsonLd={jsonLd}
      />
      <Header />

      <main>
        {/* Hero */}
        <section className="py-16 md:py-24 bg-muted/30">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-5xl font-bold font-heading mb-4">
              Weekly Deals in Regina
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              This week's best prices on liquor, beer, wine, smokes, vapes and
              groceries — delivered to your door in under an hour.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg">
                <Link to="/products">Shop This Week's Deals</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/stores">Browse Stores</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Value props */}
        <section className="py-14">
          <div className="container max-w-5xl mx-auto px-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: BadgePercent, title: "Fresh Weekly Deals", text: "New discounts from Regina stores every week." },
              { icon: Clock, title: "25–45 Min Delivery", text: "Same-day delivery across every Regina neighbourhood." },
              { icon: Truck, title: "Free Over $50", text: "Delivery from $7 — free on orders over $50." },
              { icon: ShieldCheck, title: "19+ Verified", text: "ID checked at the door for alcohol and smokes." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="border rounded-lg p-5 text-center">
                <Icon className="h-8 w-8 mx-auto mb-3 text-primary" />
                <h2 className="font-semibold mb-1">{title}</h2>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Deal categories */}
        <section className="py-14 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold font-heading mb-6 text-center">
              Shop Deals by Category
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { to: "/beer-delivery-regina", label: "Beer deals" },
                { to: "/wine-delivery-regina", label: "Wine deals" },
                { to: "/spirits-delivery-regina", label: "Spirits deals" },
                { to: "/smokes-delivery-regina", label: "Smokes & vape deals" },
                { to: "/grocery-delivery-regina", label: "Grocery deals" },
                { to: "/liquor-delivery-regina", label: "Liquor deals" },
              ].map((c) => (
                <Link
                  key={c.to}
                  to={c.to}
                  className="border rounded-lg p-4 text-center font-medium hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  {c.label} in Regina
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-14">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-bold font-heading mb-6 text-center">
              Weekly Deals FAQ
            </h2>
            <FaqAccordion faqs={faqs} />
          </div>
        </section>

        <InternalLinksSection />
      </main>

      <Footer />
    </div>
  );
};

export default OffersWeeklyDeals;
