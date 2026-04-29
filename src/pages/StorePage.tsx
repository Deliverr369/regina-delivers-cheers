import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Phone, Clock, Truck, Star, ShoppingBag, CheckCircle2 } from "lucide-react";
import { organizationJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import FaqAccordion from "@/components/seo/FaqAccordion";
import { validateFaqs } from "@/components/seo/validateFaqs";

interface Store {
  id: string;
  slug: string | null;
  name: string;
  address: string;
  phone: string | null;
  hours: string | null;
  delivery_fee: number | null;
  delivery_time: string | null;
  image_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_open: boolean | null;
}

const REGINA_NEIGHBORHOODS = [
  "Cathedral", "Harbour Landing", "Lakeview", "The Crescents", "Albert Park",
  "Hillsdale", "Whitmore Park", "Eastview", "Glencairn", "Walsh Acres",
  "Normanview", "Argyle Park", "Wood Meadows", "Greens on Gardiner",
];

const StorePage = () => {
  const { slug } = useParams();
  const [store, setStore] = useState<Store | null>(null);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (!data) { setNotFound(true); setLoading(false); return; }
      setStore(data as Store);
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("store_id", data.id)
        .eq("is_hidden", false);
      setProductCount(count || 0);
      setLoading(false);
    })();
  }, [slug]);

  if (notFound) return <Navigate to="/stores" replace />;

  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const url = `https://regina-delivers-cheers.lovable.app/liquor-stores/${store.slug}`;
  const title = `${store.name} Regina | Delivery, Hours & Address | Deliverr`;
  const description = `Order ${store.name} delivery in Regina, SK. Hours: ${store.hours}. Address: ${store.address}. Same-day delivery in ${store.delivery_time || "30-45 min"}.`;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name: `${store.name} (via Deliverr)`,
    image: store.image_url ? (store.image_url.startsWith("http") ? store.image_url : `https://regina-delivers-cheers.lovable.app${store.image_url}`) : undefined,
    url,
    telephone: store.phone || undefined,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address.split(",")[0]?.trim(),
      addressLocality: "Regina",
      addressRegion: "SK",
      addressCountry: "CA",
    },
    geo: { "@type": "GeoCoordinates", latitude: 50.4452, longitude: -104.6189 },
    areaServed: { "@type": "City", name: "Regina" },
    aggregateRating: store.rating && store.reviews_count
      ? { "@type": "AggregateRating", ratingValue: store.rating, reviewCount: store.reviews_count }
      : undefined,
    openingHours: store.hours || undefined,
    makesOffer: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: store.delivery_fee?.toString() || "7.00",
      description: `Same-day delivery from ${store.name} in Regina`,
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://regina-delivers-cheers.lovable.app/" },
      { "@type": "ListItem", position: 2, name: "Stores", item: "https://regina-delivers-cheers.lovable.app/stores" },
      { "@type": "ListItem", position: 3, name: store.name, item: url },
    ],
  };

  // Neighborhoods with dedicated landing pages — used to deep-link FAQ answers
  // back into the local SEO graph.
  const NEIGHBORHOOD_LINKS: Array<{ label: string; slug: string }> = [
    { label: "Downtown", slug: "downtown" },
    { label: "Cathedral", slug: "cathedral" },
    { label: "Harbour Landing", slug: "harbour-landing" },
    { label: "Lakeview", slug: "lakeview" },
    { label: "Eastview", slug: "eastview" },
    { label: "North Central", slug: "north-central" },
    { label: "South End", slug: "south-end" },
  ];

  // Helper: render a comma-separated list of neighborhood links with an Oxford "and".
  const renderNeighborhoodLinks = () => (
    <>
      {NEIGHBORHOOD_LINKS.map((n, i) => {
        const isLast = i === NEIGHBORHOOD_LINKS.length - 1;
        const isSecondLast = i === NEIGHBORHOOD_LINKS.length - 2;
        return (
          <span key={n.slug}>
            <Link
              to={`/delivery/regina/${n.slug}`}
              className="text-primary underline-offset-2 hover:underline"
            >
              {n.label}
            </Link>
            {!isLast && (isSecondLast ? " and " : ", ")}
          </span>
        );
      })}
    </>
  );

  // Single source of truth: same array drives both the visible accordion and
  // the FAQPage JSON-LD, validated to enforce non-empty Q/A and unique questions.
  // `aNode` (when present) provides a richer rendered version with real <Link>s
  // to neighborhood pages; the plain `a` string remains the canonical content
  // used in the FAQPage JSON-LD so structured data stays in sync.
  const neighborhoodAnswerText = `We deliver from ${store.name} to every Regina neighborhood — ${NEIGHBORHOOD_LINKS.map(n => n.label).slice(0, -1).join(", ")} and ${NEIGHBORHOOD_LINKS[NEIGHBORHOOD_LINKS.length - 1].label}. Visit any neighborhood page above for area-specific delivery details.`;
  const locationAnswerText = `${store.name} is located at ${store.address}, Regina, SK. Deliverr drivers pick up here and deliver across Regina including Downtown, Cathedral, Harbour Landing and Lakeview.`;
  const speedAnswerText = `${store.name} orders typically arrive in ${store.delivery_time || "30 to 60 minutes"} after checkout, depending on store hours, traffic and which Regina neighborhood (Downtown, Cathedral, Harbour Landing, Lakeview, Eastview, North Central or South End) you're in.`;

  const { items: faqs, jsonLd: faqJsonLd } = validateFaqs(
    [
      {
        q: `How fast is ${store.name} delivery in Regina?`,
        a: speedAnswerText,
        aNode: (
          <>
            {store.name} orders typically arrive in {store.delivery_time || "30 to 60 minutes"} after
            checkout, depending on store hours, traffic and which Regina neighborhood ({renderNeighborhoodLinks()}) you're in.
          </>
        ),
      },
      {
        q: `What does delivery from ${store.name} cost?`,
        a: `Delivery from ${store.name} is $${(store.delivery_fee ?? 7).toFixed(2)}. Orders over $50 ship free.`,
      },
      {
        q: `What are ${store.name}'s hours?`,
        a: store.hours
          ? `${store.name} operates ${store.hours}. Orders placed outside store hours are delivered when the store next opens.`
          : `${store.name}'s hours vary — check the live store status on the shop page before ordering.`,
      },
      {
        q: `Where is ${store.name} located?`,
        a: locationAnswerText,
        aNode: (
          <>
            {store.name} is located at {store.address}, Regina, SK. Deliverr drivers pick up here and
            deliver across Regina including{" "}
            <Link to="/delivery/regina/downtown" className="text-primary underline-offset-2 hover:underline">Downtown</Link>,{" "}
            <Link to="/delivery/regina/cathedral" className="text-primary underline-offset-2 hover:underline">Cathedral</Link>,{" "}
            <Link to="/delivery/regina/harbour-landing" className="text-primary underline-offset-2 hover:underline">Harbour Landing</Link>{" "}
            and{" "}
            <Link to="/delivery/regina/lakeview" className="text-primary underline-offset-2 hover:underline">Lakeview</Link>.
          </>
        ),
      },
      {
        q: `Do I need to be 19+ to order from ${store.name}?`,
        a: `Yes. You must be 19 or older to order alcohol, smokes or vape from ${store.name}. At checkout you confirm your date of birth, and on delivery the driver will ask for valid government-issued photo ID matching the name on the order. Orders cannot be left unattended or handed to anyone under 19.`,
      },
      {
        q: `What payment methods does Deliverr accept?`,
        a: `We accept all major credit cards (Visa, Mastercard, Amex). We do not accept cash on delivery.`,
      },
      {
        q: `Which Regina neighborhoods does ${store.name} deliver to?`,
        a: neighborhoodAnswerText,
        aNode: (
          <>
            We deliver from {store.name} to every Regina neighborhood — {renderNeighborhoodLinks()}.
            Visit any neighborhood page above for area-specific delivery details.
          </>
        ),
      },
    ],
    `StorePage[${store.slug}]`,
  );

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={title}
        description={description}
        canonical={url}
        image={store.image_url || undefined}
        jsonLd={[organizationJsonLd, localBusiness, faqJsonLd, breadcrumb]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <nav className="text-sm text-muted-foreground mb-4">
              <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
              <Link to="/stores" className="hover:text-primary">Stores</Link> ›{" "}
              <span className="text-foreground">{store.name}</span>
            </nav>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {store.image_url && (
                <div className="bg-white rounded-2xl border p-4 shadow-sm shrink-0">
                  <img src={store.image_url} alt={`${store.name} logo`} className="h-28 w-28 md:h-36 md:w-36 object-contain" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  {store.is_open ? (
                    <Badge className="bg-green-600 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" />Open Now</Badge>
                  ) : (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                  {store.rating && store.rating > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {store.rating} ({store.reviews_count})
                    </Badge>
                  )}
                </div>
                <h1 className="text-3xl md:text-5xl font-bold font-heading mb-3">
                  {store.name} Delivery in Regina
                </h1>
                <p className="text-lg text-muted-foreground mb-6">
                  Order from {store.name} and get same-day delivery to your door anywhere in Regina, SK.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to={`/stores/${store.id}`}>
                      <ShoppingBag className="h-4 w-4 mr-2" /> Shop {productCount > 0 ? `${productCount} products` : "now"}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Store Info Cards */}
        <section className="py-12">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-5">
                  <Clock className="h-6 w-6 text-primary mb-2" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Hours</p>
                  <p className="font-semibold">{store.hours || "Contact store"}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <MapPin className="h-6 w-6 text-primary mb-2" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Address</p>
                  <p className="font-semibold text-sm">{store.address}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <Truck className="h-6 w-6 text-primary mb-2" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Delivery</p>
                  <p className="font-semibold">{store.delivery_time || "30-45 min"}</p>
                  <p className="text-xs text-muted-foreground">${(store.delivery_fee ?? 7).toFixed(2)} fee · Free over $50</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-5">
                  <Phone className="h-6 w-6 text-primary mb-2" />
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Phone</p>
                  <p className="font-semibold">{store.phone || "—"}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold font-heading mb-4">About {store.name} Regina</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {store.name} at {store.address} is one of Regina's trusted retailers, available for same-day delivery through Deliverr.
              Browse the full catalog, add items to your cart, and we'll have your order at your door in {store.delivery_time || "under an hour"}.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Operating hours:</strong> {store.hours}. Live store status and exact hours are always shown on the product page.
              All orders require age verification (19+) at checkout and at delivery.
            </p>
          </div>
        </section>

        {/* Delivery Coverage */}
        <section className="py-12">
          <div className="container max-w-5xl mx-auto px-4">
            <h2 className="text-3xl font-bold font-heading mb-2 text-center">Delivery Coverage</h2>
            <p className="text-center text-muted-foreground mb-8">
              We deliver from {store.name} to every neighborhood in Regina, SK.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {REGINA_NEIGHBORHOODS.map((n) => (
                <div key={n} className="border rounded-lg p-3 text-center text-sm">
                  <CheckCircle2 className="h-4 w-4 text-primary inline mr-1" />
                  {n}
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6">
              Don't see your area? We deliver to all of Regina — every postal code.
            </p>
          </div>
        </section>

        {/* FAQ — mirrors FAQPage JSON-LD */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold font-heading text-center mb-8">
              {store.name} Delivery — Frequently Asked Questions
            </h2>
            <FaqAccordion items={faqs} />
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold font-heading mb-4">
              Ready to order from {store.name}?
            </h2>
            <p className="opacity-90 mb-8 text-lg">Same-day delivery in Regina · 19+ only</p>
            <Button asChild size="lg" variant="secondary">
              <Link to={`/stores/${store.id}`}>Browse Products</Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default StorePage;
