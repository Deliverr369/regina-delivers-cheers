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

export function reginaFaqJsonLd(areaName: string) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How fast is delivery in ${areaName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Most orders in ${areaName} arrive in 30 to 60 minutes. Delivery windows depend on store hours and traffic.`,
        },
      },
      {
        "@type": "Question",
        name: `What can I get delivered in ${areaName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Beer, wine, spirits, coolers and seltzers from local liquor stores, plus groceries from Costco, Superstore and Sobeys, and smokes & vape from licensed retailers.`,
        },
      },
      {
        "@type": "Question",
        name: `Is there a minimum order or delivery fee in ${areaName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Delivery starts at $7. Orders over $50 ship free at most stores. Costco delivery is $15 and Superstore is $10.`,
        },
      },
      {
        "@type": "Question",
        name: `Do I need to be 19+ to order alcohol, smokes or vape in ${areaName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes. You must be 19 or older to order alcohol, smokes or vape in Saskatchewan. At checkout you confirm your date of birth, and on delivery the driver will ask for valid government-issued photo ID matching the name on the order. Orders cannot be left unattended or handed to anyone under 19.`,
        },
      },
      {
        "@type": "Question",
        name: `What payment methods does Deliverr accept?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `We accept all major credit cards. We do not accept cash on delivery.`,
        },
      },
    ],
  };
}

export default function LocalBusinessSEO() {
  return null;
}
