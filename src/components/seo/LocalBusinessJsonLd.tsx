import { SEO } from "./SEO";

/**
 * Re-usable LocalBusiness + Service JSON-LD for the homepage and Regina landing pages.
 * This is the schema Google uses to understand "delivery service in Regina, SK".
 */
export const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://regina-delivers-cheers.lovable.app/#business",
  name: "Deliverr",
  description:
    "Same-day delivery service in Regina, SK for alcohol, groceries, smokes and convenience items from your favourite local stores.",
  url: "https://regina-delivers-cheers.lovable.app/",
  telephone: "+1-306-000-0000",
  priceRange: "$$",
  image: "https://regina-delivers-cheers.lovable.app/og-image.jpg",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Regina",
    addressRegion: "SK",
    addressCountry: "CA",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 50.4452,
    longitude: -104.6189,
  },
  areaServed: {
    "@type": "City",
    name: "Regina",
    sameAs: "https://en.wikipedia.org/wiki/Regina,_Saskatchewan",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "10:00",
      closes: "02:00",
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
  provider: { "@id": "https://regina-delivers-cheers.lovable.app/#business" },
  areaServed: { "@type": "City", name: "Regina, SK" },
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
  "@id": "https://www.deliverr.ca/#organization",
  name: "Deliverr",
  url: "https://www.deliverr.ca/",
  logo: "https://www.deliverr.ca/og-image.jpg",
  sameAs: [
    "https://www.instagram.com/deliverr.ca",
    "https://www.facebook.com/deliverr.ca",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-306-000-0000",
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
        name: `Do I need to be 19+ to order alcohol or smokes in ${areaName}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Yes. Saskatchewan law requires you to be 19 or older. Age is verified at checkout and again at the door on delivery.`,
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
