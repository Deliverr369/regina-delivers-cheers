import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, MapPin, ShieldCheck, Truck, Store as StoreIcon, ShoppingBag, CheckCircle2 } from "lucide-react";
import { organizationJsonLd, localBusinessJsonLd, reginaServiceJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import InternalLinksSection from "@/components/seo/InternalLinks";
import FaqAccordion from "@/components/seo/FaqAccordion";
import { validateFaqs } from "@/components/seo/validateFaqs";

type Store = {
  id: string;
  slug: string | null;
  name: string;
  address: string;
  hours: string | null;
  delivery_fee: number | null;
  delivery_time: string | null;
  image_url: string | null;
  rating: number | null;
  reviews_count: number | null;
  is_open: boolean | null;
};

type DirectoryConfig = {
  slug: "vape-stores-regina" | "spirits-stores-regina";
  category: "vape" | "spirits";
  /** Display name singular */
  noun: string;
  /** Plural noun used in headings */
  nounPlural: string;
  h1: string;
  title: string;
  description: string;
  intro: string;
  shopTo: string;
  /** Returns the list of stores to show on this hub */
  resolveStores: () => Promise<Store[]>;
  faqs: { q: string; a: string }[];
};

const SITE = "https://www.deliverr.ca";

/* -------------------------------------------------------------------------- */
/*  Store resolvers                                                            */
/* -------------------------------------------------------------------------- */

const SPIRITS_STORE_SLUGS = [
  "co-op-liquor",
  "costco-liquor",
  "empire-offsale",
  "sobeys-liquor",
  "superstore-liquor",
  "willow-park-wine-spirits",
];

async function fetchStoresBySlug(slugs: string[]): Promise<Store[]> {
  const { data } = await supabase
    .from("stores")
    .select("id,slug,name,address,hours,delivery_fee,delivery_time,image_url,rating,reviews_count,is_open")
    .in("slug", slugs);
  const order = new Map(slugs.map((s, i) => [s, i]));
  return (data || []).sort(
    (a, b) => (order.get(a.slug || "") ?? 99) - (order.get(b.slug || "") ?? 99),
  ) as Store[];
}

/** Stores that carry any visible smokes-category products (vape inventory). */
async function fetchVapeStores(): Promise<Store[]> {
  const { data: rows } = await supabase
    .from("products")
    .select("store_id")
    .eq("category", "smokes")
    .eq("is_hidden", false);
  const ids = Array.from(new Set((rows || []).map((r: any) => r.store_id).filter(Boolean)));
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from("stores")
    .select("id,slug,name,address,hours,delivery_fee,delivery_time,image_url,rating,reviews_count,is_open")
    .in("id", ids);
  return (data || []) as Store[];
}

/* -------------------------------------------------------------------------- */
/*  Directory configs                                                          */
/* -------------------------------------------------------------------------- */

const DIRECTORIES: Record<string, DirectoryConfig> = {
  "spirits-stores-regina": {
    slug: "spirits-stores-regina",
    category: "spirits",
    noun: "spirits store",
    nounPlural: "Spirits Stores",
    h1: "Spirits Stores in Regina",
    title: "Spirits Stores in Regina, SK | Same-Day Delivery | Deliverr",
    description:
      "Browse every Regina spirits and liquor store delivering same-day with Deliverr. Compare hours, delivery fees and shop vodka, whisky, rum and more.",
    intro:
      "All of Regina's full-service liquor and spirits retailers in one place. Compare hours, delivery times and shop vodka, whisky, rum, gin, tequila and liqueurs from any of them — same-day, 19+.",
    shopTo: "/spirits-delivery-regina",
    resolveStores: () => fetchStoresBySlug(SPIRITS_STORE_SLUGS),
    faqs: [
      {
        q: "Which Regina liquor stores deliver spirits with Deliverr?",
        a: "Co-op Liquor, Costco Liquor, Empire Offsale, Sobeys Liquor, Superstore Liquor and Willow Park Wine & Spirits — all licensed Regina spirits retailers. Tap any store card to see its hours, address and full spirits selection.",
      },
      {
        q: "How fast is spirits delivery in Regina?",
        a: "Most spirits orders arrive in 30–60 minutes during store hours. Outside of hours, your order is delivered first thing when the store reopens.",
      },
      {
        q: "Can I mix spirits from different stores in one order?",
        a: "Each delivery is fulfilled by a single store so the driver only makes one pickup. To compare prices across Regina spirits retailers, check the spirits category page — it shows the lowest in-stock price across all participating stores.",
      },
      {
        q: "Do I need to be 19+ to order spirits in Regina?",
        a: "Yes. Saskatchewan's legal drinking age is 19. You confirm your date of birth at checkout and the driver verifies valid government-issued photo ID at the door. Orders cannot be left unattended or handed to anyone under 19.",
      },
      {
        q: "What does spirits delivery cost?",
        a: "Most Regina liquor stores deliver for $7. Costco Liquor is $15 and Superstore Liquor is $10. Orders over $50 ship free.",
      },
    ],
  },

  "vape-stores-regina": {
    slug: "vape-stores-regina",
    category: "vape",
    noun: "vape store",
    nounPlural: "Vape Stores",
    h1: "Vape Stores in Regina",
    title: "Vape Stores in Regina, SK | Same-Day Vape Delivery | Deliverr",
    description:
      "Same-day vape delivery in Regina from licensed retailers. Browse stores carrying disposables, pods, e-liquid, coils and accessories. 19+ only.",
    intro:
      "Licensed Regina retailers carrying disposable vapes, pods, e-liquid, coils and vape accessories — delivered in under an hour, 19+ verified at the door.",
    shopTo: "/vape-delivery-regina",
    resolveStores: fetchVapeStores,
    faqs: [
      {
        q: "Which Regina retailers deliver vape products?",
        a: "Licensed convenience and gas-station retailers across Regina that hold a federal nicotine vape licence. Stores stocking vape inventory appear in the directory below — selection updates daily.",
      },
      {
        q: "What kinds of vape products can I order?",
        a: "Disposable vapes, refillable pods, vape juice / e-liquid (freebase and salt nic), replacement coils and accessories. Nicotine is capped at 20 mg/mL by federal law and Saskatchewan restricts most flavoured nicotine vapes to specialty licensed retailers.",
      },
      {
        q: "How fast is vape delivery in Regina?",
        a: "Most vape orders arrive in 30–60 minutes during store hours. Place an order anytime — we'll dispatch as soon as the store opens.",
      },
      {
        q: "Do I need to be 19+ to order vape in Regina?",
        a: "Yes. You must be 19 or older. We verify date of birth at checkout and the driver checks valid government-issued photo ID at the door. Vape products cannot be left unattended or handed to anyone under 19.",
      },
      {
        q: "What does vape delivery cost?",
        a: "Vape delivery starts at $7 from most Regina retailers. Orders over $50 ship free. Each store's exact fee is shown on its card below.",
      },
    ],
  },
};

/* -------------------------------------------------------------------------- */
/*  Component                                                                  */
/* -------------------------------------------------------------------------- */

const StoreDirectoryLanding = () => {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").split("/")[0];
  const cfg = slug ? DIRECTORIES[slug] : null;

  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!cfg) return;
    let cancelled = false;
    setLoading(true);
    cfg.resolveStores().then((rows) => {
      if (cancelled) return;
      setStores(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [cfg?.slug]);

  const url = cfg ? `${SITE}/${cfg.slug}` : SITE;

  const { items: faqs, jsonLd: faqJsonLd } = useMemo(
    () =>
      cfg
        ? validateFaqs(cfg.faqs, `StoreDirectoryLanding[${cfg.slug}]`)
        : { items: [], jsonLd: null as any },
    [cfg?.slug],
  );

  if (!cfg) return <Navigate to="/stores" replace />;

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: cfg.h1,
    itemListElement: stores.map((s, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE}/${cfg.slug}/${s.slug}`,
      name: `${s.name} — ${cfg.noun} delivery in Regina`,
    })),
  };

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
          faqJsonLd,
          itemListJsonLd,
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
              { "@type": "ListItem", position: 2, name: "Stores", item: `${SITE}/stores` },
              { "@type": "ListItem", position: 3, name: cfg.nounPlural, item: url },
            ],
          },
        ]}
      />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-20">
          <div className="container max-w-5xl mx-auto px-4 text-center">
            <p className="text-sm font-semibold text-primary mb-3 uppercase tracking-wider flex items-center justify-center gap-2">
              <MapPin className="h-4 w-4" /> Regina, SK
            </p>
            <h1 className="text-4xl md:text-6xl font-bold mb-5 font-heading">{cfg.h1}</h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {cfg.intro}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button asChild size="lg">
                <Link to={cfg.shopTo}>Shop {cfg.noun === "spirits store" ? "Spirits" : "Vape"}</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/stores">Browse All Stores</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Trust strip */}
        <section className="py-12 border-y bg-muted/20">
          <div className="container max-w-6xl mx-auto px-4 grid md:grid-cols-4 gap-6">
            {[
              { icon: Clock, title: "Under 60 minutes", body: "Most orders arrive in 30–60 mins" },
              { icon: Truck, title: "Free over $50", body: "Free delivery on qualifying orders" },
              { icon: ShieldCheck, title: "19+ verified", body: "ID checked at checkout & door" },
              { icon: MapPin, title: "All of Regina", body: "Every postal code covered" },
            ].map((f) => (
              <div key={f.title} className="text-center">
                <f.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                <p className="font-semibold">{f.title}</p>
                <p className="text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Store grid */}
        <section className="py-16">
          <div className="container max-w-6xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-3 font-heading">
              Regina {cfg.nounPlural}
            </h2>
            <p className="text-center text-muted-foreground mb-10">
              {stores.length > 0
                ? `${stores.length} licensed retailer${stores.length === 1 ? "" : "s"} delivering ${cfg.category} same-day in Regina.`
                : `Same-day delivery from Regina's licensed ${cfg.category} retailers.`}
            </p>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : stores.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                  <StoreIcon className="h-10 w-10 mx-auto mb-3 text-muted-foreground/60" />
                  No {cfg.category} retailers are listed yet. Check back soon — new stores are added regularly.
                </CardContent>
              </Card>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {stores.map((s) => (
                  <Link
                    key={s.id}
                    to={`/${cfg.slug}/${s.slug}`}
                    className="group"
                    aria-label={`${s.name} ${cfg.noun} delivery in Regina`}
                  >
                    <Card className="h-full transition-all group-hover:border-primary group-hover:shadow-lg">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          {s.image_url ? (
                            <div className="bg-white border rounded-xl p-2 shrink-0">
                              <img
                                src={s.image_url}
                                alt={`${s.name} logo`}
                                className="h-16 w-16 object-contain"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="bg-muted rounded-xl h-20 w-20 flex items-center justify-center shrink-0">
                              <StoreIcon className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {s.is_open ? (
                                <Badge className="bg-green-600 hover:bg-green-600 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Open
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Closed</Badge>
                              )}
                            </div>
                            <h3 className="font-bold text-lg leading-tight font-heading group-hover:text-primary">
                              {s.name}
                            </h3>
                            <p className="text-xs text-muted-foreground line-clamp-1">{s.address}</p>
                          </div>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Delivery</dt>
                            <dd className="font-medium">{s.delivery_time || "30–45 min"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Fee</dt>
                            <dd className="font-medium">${(s.delivery_fee ?? 7).toFixed(2)}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-xs uppercase tracking-wider text-muted-foreground">Hours</dt>
                            <dd className="font-medium text-sm">{s.hours || "Contact store"}</dd>
                          </div>
                        </dl>
                        <div className="mt-4 text-sm font-semibold text-primary inline-flex items-center gap-1">
                          <ShoppingBag className="h-4 w-4" /> View {cfg.noun}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* FAQ — mirrors FAQPage JSON-LD */}
        <section className="py-16 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-10 font-heading">
              {cfg.nounPlural} in Regina — Frequently Asked Questions
            </h2>
            <FaqAccordion items={faqs} />
          </div>
        </section>

        <InternalLinksSection />

        <section className="py-16 bg-primary text-primary-foreground">
          <div className="container max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 font-heading">
              Ready to order in Regina?
            </h2>
            <p className="mb-8 opacity-90 text-lg">
              Pick a store above and get {cfg.category} delivered in under an hour.
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

export default StoreDirectoryLanding;
