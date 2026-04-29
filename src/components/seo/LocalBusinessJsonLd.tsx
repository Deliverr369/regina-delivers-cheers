import { SEO } from "./SEO";
import { CONTACT } from "@/config/contact";

/**
 * Re-usable LocalBusiness + Organization JSON-LD.
 * All contact fields are pulled from src/config/contact.ts so the
 * structured data always matches the visible Footer / SupportChatbot.
 */
export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": `${CONTACT.siteUrl}/#business`,
  name: CONTACT.brand,
  description:
    "Same-day delivery service in Regina, SK for alcohol, groceries, smokes and convenience items from your favourite local stores.",
  url: `${CONTACT.siteUrl}/`,
  telephone: CONTACT.phoneE164,
  email: CONTACT.email,
  priceRange: "$$",
  image: CONTACT.logoUrl,
  address: {
    "@type": "PostalAddress",
    addressLocality: CONTACT.city,
    addressRegion: CONTACT.region,
    addressCountry: CONTACT.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: CONTACT.latitude,
    longitude: CONTACT.longitude,
  },
  areaServed: {
    "@type": "City",
    name: CONTACT.city,
    sameAs: "https://en.wikipedia.org/wiki/Regina,_Saskatchewan",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: CONTACT.opens,
      closes: CONTACT.closes,
    },
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Delivery categories",
    itemListElement: [
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Alcohol delivery" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Grocery delivery" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Smokes & vape delivery" } },
      { "@type": "Offer", itemOffered: { "@type": "Service", name: "Convenience delivery" } },
    ],
  },
};

export const reginaServiceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Delivery service",
  provider: { "@id": `${CONTACT.siteUrl}/#business` },
  areaServed: { "@type": "City", name: `${CONTACT.city}, ${CONTACT.region}` },
  offers: {
    "@type": "Offer",
    priceCurrency: "CAD",
    price: "7.00",
    description: "Same-day delivery in Regina. Free over $50 at most stores.",
  },
};

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${CONTACT.siteUrl}/#organization`,
  name: CONTACT.brand,
  legalName: CONTACT.legalName,
  url: `${CONTACT.siteUrl}/`,
  logo: CONTACT.logoUrl,
  email: CONTACT.email,
  sameAs: [CONTACT.social.instagram, CONTACT.social.facebook],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: CONTACT.phoneE164,
    email: CONTACT.email,
    contactType: "customer support",
    areaServed: "CA-SK",
    availableLanguage: ["English"],
  },
};

/**
 * Single source of truth for the Regina-landing FAQ. Used by both the
 * visible <FaqAccordion /> on /delivery/regina[/:hood] and the FAQPage
 * JSON-LD emitted in <head> — guaranteeing the rendered questions match
 * the structured data 1:1.
 */
export function reginaFaqItems(
  areaName: string,
  hood?: { name: string; quadrant: string; nearby: string[] },
): { q: string; a: string }[] {
  const speedA = hood
    ? `Most ${hood.name} orders arrive in 30–45 minutes thanks to our drivers covering ${hood.quadrant}. Delivery windows depend on store hours and traffic.`
    : `Most orders in ${areaName} arrive in 30 to 60 minutes. Delivery windows depend on store hours and traffic.`;
  const coverageQ = hood
    ? `Which streets near ${hood.name} do you deliver to?`
    : `Which Regina neighborhoods do you deliver to?`;
  const coverageA = hood
    ? `We cover all of ${hood.name} and the surrounding ${hood.quadrant} — including ${hood.nearby.join(", ")}. If your address falls inside Regina city limits, we deliver to it.`
    : `We deliver to every Regina neighborhood — Downtown, Cathedral, Harbour Landing, Lakeview, Albert Park, Hillsdale, Eastview, Whitmore Park, The Crescents, North Central, South End, East End, West End, Uplands and Normanview.`;

  return [
    { q: `How fast is delivery in ${areaName}?`, a: speedA },
    {
      q: `What can I get delivered in ${areaName}?`,
      a: `Beer, wine, spirits, coolers and seltzers from local liquor stores, plus groceries from Costco, Superstore and Sobeys, and smokes & vape from licensed retailers.`,
    },
    { q: coverageQ, a: coverageA },
    {
      q: `Is there a minimum order or delivery fee in ${areaName}?`,
      a: `Delivery starts at $7. Orders over $50 ship free at most stores. Costco delivery is $15 and Superstore is $10.`,
    },
    {
      q: `Do I need to be 19+ to order alcohol, smokes or vape in ${areaName}?`,
      a: `Yes. You must be 19 or older to order alcohol, smokes or vape in Saskatchewan. At checkout you confirm your date of birth, and on delivery the driver will ask for valid government-issued photo ID matching the name on the order. Orders cannot be left unattended or handed to anyone under 19.`,
    },
    {
      q: `What payment methods does Deliverr accept?`,
      a: `We accept all major credit cards. We do not accept cash on delivery.`,
    },
  ];
}

/**
 * @deprecated Prefer reginaFaqItems + validateFaqs so the visible accordion
 *   and the JSON-LD are produced from the same array. Kept as a thin wrapper
 *   for any external imports.
 */
export function reginaFaqJsonLd(
  areaName: string,
  hood?: { name: string; quadrant: string; nearby: string[] },
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: reginaFaqItems(areaName, hood).map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export default function LocalBusinessSEO() {
  return null;
}
