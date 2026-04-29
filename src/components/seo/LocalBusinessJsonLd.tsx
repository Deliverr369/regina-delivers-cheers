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

export default function LocalBusinessSEO() {
  return null;
}
