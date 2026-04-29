import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Clock, MapPin, Phone, Truck, Star, ShoppingBag,
  CheckCircle2, ShieldCheck,
} from "lucide-react";
import { organizationJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import FaqAccordion from "@/components/seo/FaqAccordion";
import { validateFaqs } from "@/components/seo/validateFaqs";

type Store = {
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
};

type Product = {
  id: string;
  name: string;
  size: string | null;
  price: number;
  image_url: string | null;
};

type Category = "vape" | "spirits";

const SITE = "https://www.deliverr.ca";

const CATEGORY_META: Record<
  Category,
  {
    parentSlug: string;
    parentName: string;
    productLink: string;
    productCategoryFilter: "smokes" | "spirits";
    nounLong: string;
    introTemplate: (storeName: string) => string;
    faqs: (storeName: string) => { q: string; a: string }[];
  }
> = {
  vape: {
    parentSlug: "vape-stores-regina",
    parentName: "Vape Stores",
    productLink: "/vape-delivery-regina",
    productCategoryFilter: "smokes",
    nounLong: "vape, e-liquid and pod systems",
    introTemplate: (name) =>
      `Order vape products from ${name} and get same-day delivery to your door anywhere in Regina, SK. Disposables, pods, e-liquid, coils and accessories — 19+ verified at the door.`,
    faqs: (name) => [
      {
        q: `Does ${name} carry vape products in Regina?`,
        a: `Yes. ${name} is one of the licensed Regina retailers stocking disposable vapes, refillable pods, e-liquid (freebase and salt nic), replacement coils and vape accessories. Selection updates daily based on what's on the shelf.`,
      },
      {
        q: `What nicotine strengths does ${name} carry?`,
        a: `Canadian federal law caps nicotine vape products at 20 mg/mL. Common strengths in stock are 0 mg (nicotine-free), 3 mg, 6 mg, 12 mg and 20 mg. Salt-nic strengths typically run 20–50 mg/mL on the older scale, capped at 20 mg/mL labelled.`,
      },
      {
        q: `Are flavoured vapes available from ${name}?`,
        a: `Saskatchewan restricts flavoured nicotine vape products (anything other than tobacco) to specialty licensed retailers. Convenience-store retailers like ${name} typically stock tobacco-flavoured and unflavoured nicotine vapes only. Flavoured options appear when a specialty retailer fulfills the order.`,
      },
      {
        q: `How fast is vape delivery from ${name}?`,
        a: `Most ${name} vape orders arrive in 30–60 minutes during store hours. Outside of hours, orders ship as soon as the store reopens.`,
      },
      {
        q: `Do I need to be 19+ to order vape from ${name}?`,
        a: `Yes. You must be 19 or older. ${name} confirms age at checkout and the driver verifies valid government-issued photo ID at the door. Vape products cannot be left unattended or handed to anyone under 19, regardless of nicotine strength.`,
      },
      {
        q: `What does delivery from ${name} cost?`,
        a: `Delivery from ${name} is shown on the store card and at checkout. Most Regina retailers deliver for $7. Orders over $50 ship free.`,
      },
    ],
  },
  spirits: {
    parentSlug: "spirits-stores-regina",
    parentName: "Spirits Stores",
    productLink: "/spirits-delivery-regina",
    productCategoryFilter: "spirits",
    nounLong: "vodka, whisky, rum, gin, tequila and liqueurs",
    introTemplate: (name) =>
      `Order spirits from ${name} and get same-day delivery to your door anywhere in Regina, SK. Vodka, whisky, rum, gin, tequila, mezcal and liqueurs — 19+ verified at the door.`,
    faqs: (name) => [
      {
        q: `What spirits can I order from ${name} in Regina?`,
        a: `${name} carries vodka, whisky (rye, scotch, bourbon, Canadian), rum, gin, tequila, mezcal, brandy and liqueurs in 375 mL, 750 mL and 1.14 L sizes. 1.75 L handles are listed when in stock.`,
      },
      {
        q: `How fast is spirits delivery from ${name}?`,
        a: `${name} orders typically arrive in 30–60 minutes during store hours. Outside of hours, your order is delivered first thing when the store reopens.`,
      },
      {
        q: `What are ${name}'s hours?`,
        a: `${name} operates ${name === "Costco Liquor" ? "Costco's standard liquor hours" : "regular SLGA-licensed retail hours"}. Live store status and exact hours are shown on the store card and the shop page.`,
      },
      {
        q: `Where is ${name} located?`,
        a: `${name} is a licensed SLGA retailer in Regina, SK. Deliverr drivers pick up your order from this location and deliver across the city.`,
      },
      {
        q: `Do I need to be 19+ to order from ${name}?`,
        a: `Yes. Saskatchewan's legal drinking age is 19. ${name} requires age confirmation at checkout and valid government-issued photo ID at the door. Orders cannot be left unattended or handed to anyone under 19, and the driver may refuse delivery if the recipient appears intoxicated.`,
      },
      {
        q: `Can I substitute spirits from another store?`,
        a: `No. Each Deliverr order is fulfilled by a single store, so an out-of-stock bottle from ${name} cannot be swapped for one from another retailer. To compare prices across all Regina spirits stores, use the spirits category page.`,
      },
      {
        q: `What payment methods does ${name} accept on Deliverr?`,
        a: `All major credit cards (Visa, Mastercard, Amex). We do not accept cash on delivery for spirits.`,
      },
    ],
  },
};

const StoreCategoryDetail = ({ category }: { category: Category }) => {
  const { slug } = useParams();
  const { pathname } = useLocation();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCount, setProductCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const meta = CATEGORY_META[category];

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("stores")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setStore(data as Store);

      const { data: prods, count } = await supabase
        .from("products")
        .select("id,name,size,price,image_url", { count: "exact" })
        .eq("store_id", (data as Store).id)
        .eq("category", meta.productCategoryFilter)
        .eq("is_hidden", false)
        .order("display_order", { ascending: true })
        .limit(12);
      if (cancelled) return;
      setProducts((prods || []) as Product[]);
      setProductCount(count || 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, meta.productCategoryFilter]);

  const url = `${SITE}${pathname}`;

  const faqsRaw = useMemo(
    () => (store ? meta.faqs(store.name) : []),
    [store?.name, category],
  );
  const { items: faqs, jsonLd: faqJsonLd } = useMemo(
    () =>
      store
        ? validateFaqs(faqsRaw, `StoreCategoryDetail[${category}/${store.slug}]`)
        : { items: [], jsonLd: null as any },
    [faqsRaw, store?.slug, category],
  );

  if (notFound) return <Navigate to={`/${meta.parentSlug}`} replace />;
  if (loading || !store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If store has zero products in this category, send shoppers back to the hub.
  if (productCount === 0) {
    return <Navigate to={`/${meta.parentSlug}`} replace />;
  }

  const title =
    category === "spirits"
      ? `${store.name} Spirits Delivery in Regina, SK | Deliverr`
      : `${store.name} Vape Delivery in Regina, SK | Deliverr`;
  const description =
    category === "spirits"
      ? `Order spirits from ${store.name} in Regina. ${productCount} bottles in stock — vodka, whisky, rum, gin & more. Same-day delivery in ${store.delivery_time || "30–60 min"}. 19+.`
      : `Order vape products from ${store.name} in Regina. ${productCount} items in stock — disposables, pods, e-liquid & coils. Same-day delivery in ${store.delivery_time || "30–60 min"}. 19+.`;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name: `${store.name} (via Deliverr)`,
    image: store.image_url || undefined,
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
    aggregateRating:
      store.rating && store.reviews_count
        ? { "@type": "AggregateRating", ratingValue: store.rating, reviewCount: store.reviews_count }
        : undefined,
    openingHours: store.hours || undefined,
    makesOffer: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: store.delivery_fee?.toString() || "7.00",
      description: `Same-day ${category} delivery from ${store.name} in Regina`,
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
      { "@type": "ListItem", position: 2, name: meta.parentName, item: `${SITE}/${meta.parentSlug}` },
      { "@type": "ListItem", position: 3, name: store.name, item: url },
    ],
  };

  const heroLabel = category === "spirits" ? "Spirits Delivery" : "Vape Delivery";

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
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="container max-w-5xl mx-auto px-4">
            <nav className="text-sm text-muted-foreground mb-4" aria-label="Breadcrumb">
              <Link to="/" className="hover:text-primary">Home</Link> ›{" "}
              <Link to={`/${meta.parentSlug}`} className="hover:text-primary">{meta.parentName}</Link> ›{" "}
              <span className="text-foreground">{store.name}</span>
            </nav>

            <div className="flex flex-col md:flex-row gap-6 items-start">
              {store.image_url && (
                <div className="bg-white rounded-2xl border p-4 shadow-sm shrink-0">
                  <img
                    src={store.image_url}
                    alt={`${store.name} logo`}
                    className="h-28 w-28 md:h-36 md:w-36 object-contain"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  {store.is_open ? (
                    <Badge className="bg-green-600 hover:bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Open Now
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Closed</Badge>
                  )}
                  {store.rating && store.rating > 0 && (
                    <Badge variant="outline" className="gap-1">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {store.rating} ({store.reviews_count})
                    </Badge>
                  )}
                  <Badge variant="outline" className="gap-1">
                    <ShieldCheck className="h-3 w-3" /> 19+ verified
                  </Badge>
                </div>
                <p className="text-sm font-semibold text-primary mb-2 uppercase tracking-wider">
                  {heroLabel} · Regina, SK
                </p>
                <h1 className="text-3xl md:text-5xl font-bold font-heading mb-3">
                  {store.name} {heroLabel} in Regina
                </h1>
                <p className="text-lg text-muted-foreground mb-6">{meta.introTemplate(store.name)}</p>
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to={`/stores/${store.id}`}>
                      <ShoppingBag className="h-4 w-4 mr-2" />
                      Shop {productCount} {category === "spirits" ? "bottles" : "items"}
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to={meta.productLink}>Compare across all stores</Link>
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
                  <p className="font-semibold">{store.delivery_time || "30–45 min"}</p>
                  <p className="text-xs text-muted-foreground">
                    ${(store.delivery_fee ?? 7).toFixed(2)} fee · Free over $50
                  </p>
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

        {/* Products preview */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-6xl mx-auto px-4">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
              <div>
                <h2 className="text-3xl font-bold font-heading">
                  Popular at {store.name}
                </h2>
                <p className="text-muted-foreground">
                  {meta.nounLong.charAt(0).toUpperCase() + meta.nounLong.slice(1)} in stock right now.
                </p>
              </div>
              <Button asChild variant="outline">
                <Link to={`/stores/${store.id}`}>See all {productCount}</Link>
              </Button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((p) => (
                <Link key={p.id} to={`/product/${p.id}`} className="group">
                  <Card className="h-full transition-shadow group-hover:shadow-md">
                    <CardContent className="p-3">
                      <div className="aspect-square bg-white rounded-lg border mb-3 flex items-center justify-center overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="max-h-full max-w-full object-contain p-2"
                            loading="lazy"
                          />
                        ) : (
                          <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-sm font-semibold line-clamp-2 leading-tight group-hover:text-primary">
                        {p.name}
                      </p>
                      {p.size && (
                        <p className="text-xs text-muted-foreground mt-0.5">{p.size}</p>
                      )}
                      <p className="text-base font-bold mt-2">${Number(p.price).toFixed(2)}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* About */}
        <section className="py-12">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold font-heading mb-4">
              About {store.name} {heroLabel}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              {store.name} at {store.address} is one of Regina's licensed retailers delivering {meta.nounLong} same-day through Deliverr.
              Browse the full {category} catalog, add items to your cart, and we'll have your order at your door in {store.delivery_time || "under an hour"}.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Operating hours:</strong> {store.hours}. All {category} orders require age verification (19+) at checkout
              and a valid government-issued photo ID at the door.
            </p>
          </div>
        </section>

        {/* FAQ — mirrors FAQPage JSON-LD */}
        <section className="py-12 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl font-bold font-heading text-center mb-8">
              {store.name} {heroLabel} — Frequently Asked Questions
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
            <p className="opacity-90 mb-8 text-lg">Same-day {category} delivery in Regina · 19+ only</p>
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

export default StoreCategoryDetail;
