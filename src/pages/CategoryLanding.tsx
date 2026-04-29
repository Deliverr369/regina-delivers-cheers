import { Link, useLocation, Navigate } from "react-router-dom";
import { SEO } from "@/components/seo/SEO";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, MapPin, ShieldCheck, Truck } from "lucide-react";
import { localBusinessJsonLd, reginaServiceJsonLd, organizationJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import InternalLinksSection from "@/components/seo/InternalLinks";
import FaqAccordion from "@/components/seo/FaqAccordion";
import { validateFaqs } from "@/components/seo/validateFaqs";

type FaqItem = { q: string; a: string };

/**
 * Category-specific FAQs. These replace the generic "what makes us different"
 * single Q&A with a focused set of questions buyers of that category actually
 * ask (formats, brands, temperature, ID rules, flavour restrictions, etc.).
 */
const FAQS_BY_CATEGORY: Record<string, FaqItem[]> = {
  "alcohol-delivery-regina": [
    {
      q: "Which Regina liquor stores can I order alcohol from?",
      a: "We pull from full-service Regina liquor retailers across the city — Sobeys Liquor, Willow Park, Pioneer and other licensed SLGA stores — so you get the widest beer, wine, spirits and cooler selection in one cart.",
    },
    {
      q: "Can I mix beer, wine and spirits in one order?",
      a: "Yes. As long as everything comes from the same liquor store you can mix beer, wine, spirits, coolers and seltzers in a single delivery. We show the lowest in-stock price across stores so you can compare before adding to cart.",
    },
    {
      q: "Is alcohol delivered cold?",
      a: "Beer, coolers and seltzers are pulled straight from the store cooler when available. Wine and spirits are delivered at room temperature unless the store has a chilled section.",
    },
  ],

  "beer-delivery-regina": [
    {
      q: "What beer formats can I order in Regina?",
      a: "Singles, six-packs, twelve-packs, fifteen-packs and twenty-fours — domestic, import and Saskatchewan craft. Tall cans (473 mL) and bottles where the store carries them.",
    },
    {
      q: "Is the beer delivered cold?",
      a: "Yes. Beer is pulled straight from the cooler at participating Regina liquor stores so it arrives cold and ready to drink.",
    },
    {
      q: "Do you deliver Saskatchewan craft beer?",
      a: "Yes — Pile O' Bones, Rebellion, District, Malty National, Black Bridge and other SK craft brands when the store has stock. Selection updates daily.",
    },
    {
      q: "Can I order kegs in Regina?",
      a: "Kegs aren't currently listed for delivery — most Regina stores require an in-person deposit and pickup. Cans and bottles up to 24-packs are available for same-day delivery.",
    },
  ],

  "wine-delivery-regina": [
    {
      q: "What kinds of wine can you deliver in Regina?",
      a: "Reds, whites, rosé, sparkling and champagne from California, BC, Niagara, France, Italy, Australia, Argentina and more — whatever Regina's liquor stores stock that day. We surface the lowest in-stock price across stores.",
    },
    {
      q: "Do you deliver champagne and prosecco same-day?",
      a: "Yes. Sparkling wines including champagne, prosecco, cava and Saskatchewan sparkling are delivered same-day from Regina liquor stores that carry them, usually within 30–60 minutes.",
    },
    {
      q: "Can I order wine by the case?",
      a: "Most Regina stores list 6-bottle and 12-bottle cases of popular wines. Where a case isn't available you can add 6 or 12 bottles individually to the same cart.",
    },
    {
      q: "Are there mixed wine packs available?",
      a: "Some Regina retailers offer pre-built mixed reds, mixed whites and seasonal sampler packs. These appear on the wine page when in stock.",
    },
  ],

  "liquor-delivery-regina": [
    {
      q: "What spirits can I get delivered in Regina?",
      a: "Vodka, whisky (rye, scotch, bourbon, Canadian), rum, gin, tequila, mezcal, brandy and liqueurs — 375 mL, 750 mL and 1.14 L sizes from Regina liquor stores.",
    },
    {
      q: "What about coolers, seltzers and ready-to-drink cocktails?",
      a: "Yes — White Claw, Twisted Tea, Nutrl, Palm Bay, BeatBox, Bud Light Seltzer and store-brand seltzers are available alongside premixed cans like Jack & Coke or Captain & Cola.",
    },
    {
      q: "Do you deliver large-format liquor (1.75 L handles)?",
      a: "When stocked, yes. 1.75 L handles of common spirits like vodka, whisky and rum are listed and delivered same-day from stores that carry them.",
    },
  ],

  "grocery-delivery-regina": [
    {
      q: "Which Regina grocery stores can I order from?",
      a: "Costco Wholesale Regina, Real Canadian Superstore and Sobeys — fresh produce, dairy, frozen, pantry, household and bulk. Note: Costco delivery is $15 and Superstore is $10; other stores are $7.",
    },
    {
      q: "Do I need a Costco membership to order Costco grocery delivery?",
      a: "No. We handle the in-store purchase for you, so you can order Costco Wholesale Regina items without a membership card. Pricing reflects what's on the shelf that day.",
    },
    {
      q: "Can I order fresh produce, meat and frozen together?",
      a: "Yes. Drivers use insulated bags and pull cold/frozen items last so produce, dairy, meat and frozen goods arrive at the right temperature.",
    },
  ],

  "smokes-delivery-regina": [
    {
      q: "What smokes products can I order in Regina?",
      a: "Cigarettes (carton or pack), Zyn and other nicotine pouches, papers, filters, lighters and rolling tobacco from licensed Regina retailers. Government-issued photo ID required on delivery.",
    },
    {
      q: "Can I order cartons of cigarettes for delivery?",
      a: "Yes — full cartons (typically 8 packs of 25) are available from licensed Regina tobacco retailers, alongside individual packs of 20 or 25.",
    },
    {
      q: "Do you deliver Zyn and nicotine pouches?",
      a: "Yes. Zyn (3 mg, 6 mg) and other nicotine pouches like Rogue, On!, and Velo are listed when in stock at Regina retailers.",
    },
  ],

  "vape-delivery-regina": [
    {
      q: "What vape products can I order in Regina?",
      a: "Disposable vapes (Allo, Vice, Elf Bar, Stlth and similar), refillable pod systems, replacement pods, e-liquid in a range of nicotine strengths, replacement coils, batteries, chargers and accessories from Regina's licensed vape retailers.",
    },
    {
      q: "Which nicotine strengths can I order?",
      a: "Disposables and pre-filled pods are capped at 20 mg/mL (2.0%) under federal rules — that's the strongest you'll see for general retail. Lower strengths (10 mg/mL, 6 mg/mL, 3 mg/mL and 0 mg/mL nicotine-free) are available on most products. Bottled e-liquid can be freebase or salt nicotine; salt nic typically reads as 20–35 mg/mL on freebase scales but is sold sealed at the legal cap. Each product page lists the exact strength.",
    },
    {
      q: "How do I know which replacement coils fit my device?",
      a: "Coils are not universal — each tank or pod system uses a specific coil family (e.g. SMOK RPM, GeekVape Z series, Uwell Caliburn G/G2/A2/A3, Vaporesso GTX, Innokin Z-Coil). Match the brand AND series printed on your device or current coil. If you're unsure, message support with your device name and we'll confirm the right coil before dispatch.",
    },
    {
      q: "Do refillable pods fit any device?",
      a: "No. Pods are device-specific — Stlth pods fit Stlth, Allo Sync pods fit Allo Sync, Caliburn pods fit Caliburn, Vuse pods fit Vuse, etc. Cross-brand pods will not seal or fire correctly. Filter the vape page by your device or check the product title for the matching device name.",
    },
    {
      q: "Are flavoured vapes restricted in Saskatchewan?",
      a: "Saskatchewan limits where certain flavoured vape products can be sold. Our partner retailers are licensed under provincial rules — what shows in-stock on the site is what they're legally allowed to sell to you that day. Tobacco and mint/menthol are the most consistently available; fruit and dessert flavours depend on store licensing.",
    },
    {
      q: "Is there a minimum order for vape delivery?",
      a: "There's no strict minimum order for vape delivery in Regina — you can order a single disposable, a pack of coils or a bottle of juice. Delivery starts at $7, and orders over $50 unlock free delivery at most participating vape retailers.",
    },
    {
      q: "Do you deliver replacement coils, pods, batteries and chargers?",
      a: "Yes — replacement coils for common tanks (SMOK, GeekVape, Uwell, Vaporesso, Innokin), pre-filled and refillable pods, plus 18650 / 21700 batteries, external chargers and USB-C charging cables are all listed when stores have them in stock.",
    },
  ],

  "spirits-delivery-regina": [
    {
      q: "Which spirits can I order delivered in Regina?",
      a: "Vodka, whisky (Canadian rye, scotch, bourbon, Irish, Japanese), rum (white, dark, spiced), gin, tequila, mezcal, brandy, cognac and liqueurs from Regina liquor stores.",
    },
    {
      q: "What bottle sizes are available for spirits delivery?",
      a: "375 mL, 750 mL, 1.14 L and 1.75 L depending on what each store has in stock. We show the lowest in-stock price across Regina stores so you can compare sizes side by side.",
    },
    {
      q: "Can I order tequila and mezcal in Regina?",
      a: "Yes. Blanco, reposado and añejo tequila plus mezcal are listed when stores have stock — including premium brands like Don Julio, Patrón, Casamigos and 1800.",
    },
    {
      q: "Do you deliver premium and rare whisky?",
      a: "Premium scotch, single malts, bourbons and Japanese whisky are listed when carried by Regina liquor stores. Rare allocations sell out fast — order placed first wins the bottle.",
    },
  ],
};

function buildFaqs(cfg: { slug: string; name: string; ageGated: boolean }) {
  const item = cfg.name.toLowerCase();

  const base: FaqItem[] = [
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
      a: `We deliver to every Regina neighborhood — Downtown, Cathedral, Harbour Landing, Lakeview, Albert Park, Hillsdale, Eastview, Whitmore Park, The Crescents, North Central, South End, East End, West End, Uplands and Normanview.`,
    },
  ];

  // Insert all category-specific Q&As right after the "How fast" question so
  // the most distinctive content shows up high (good for users + SERP snippets).
  const categoryFaqs = FAQS_BY_CATEGORY[cfg.slug] ?? [];
  if (categoryFaqs.length > 0) {
    base.splice(1, 0, ...categoryFaqs);
  }

  if (cfg.ageGated) {
    base.splice(base.findIndex((b) => b.q.startsWith("What payment")), 0, {
      q: `Do I need to be 19+ to order ${item} in Saskatchewan?`,
      a: `Yes. You must be 19 or older to order ${item} in Saskatchewan. At checkout you confirm your date of birth, and on delivery the driver will ask for valid government-issued photo ID matching the name on the order. Orders cannot be left unattended or handed to anyone under 19.`,
    });
    base.push({
      q: `Can someone else accept the ${item} delivery for me?`,
      a: `No. The 19+ person who placed the order must be present and show valid government-issued photo ID matching the name on the order. Drivers cannot leave ${item} unattended or hand them to anyone under 19.`,
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
  "vape-delivery-regina": {
    slug: "vape-delivery-regina",
    name: "Vape",
    h1: "Vape Delivery in Regina",
    title: "Vape Delivery in Regina, SK | Disposables, Pods & Juice | Deliverr",
    description: "Same-day vape delivery in Regina. Disposable vapes, pods, vape juice, coils and accessories from licensed retailers. 19+ only.",
    intro: "Disposable vapes, pod systems, e-liquid, coils and accessories from Regina's licensed vape retailers — delivered in under an hour.",
    shopTo: "/products?category=smokes&subcategory=vapes",
    ageGated: true,
  },
  "spirits-delivery-regina": {
    slug: "spirits-delivery-regina",
    name: "Spirits",
    h1: "Spirits Delivery in Regina",
    title: "Spirits Delivery in Regina, SK | Vodka, Whisky, Rum & More | Deliverr",
    description: "Same-day spirits delivery in Regina. Vodka, whisky, rum, gin, tequila, mezcal and liqueurs from local liquor stores. 19+ only.",
    intro: "Vodka, whisky, rum, gin, tequila, mezcal and liqueurs from Regina's full-service liquor stores — delivered in under an hour.",
    shopTo: "/products?category=spirits",
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
  const { items: faqs, jsonLd: faqJsonLd } = validateFaqs(
    buildFaqs(cfg),
    `CategoryLanding[${cfg.slug}]`,
  );

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
            <FaqAccordion items={faqs} />
          </div>
        </section>

        <InternalLinksSection excludeCategory={cfg.slug} />

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
