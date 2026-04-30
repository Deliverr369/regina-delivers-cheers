/**
 * Pure builders for the LocalBusiness + BreadcrumbList JSON-LD emitted by
 * StorePage. Extracted from the page so that the structured-data shape can be
 * unit-tested (and snapshotted) without rendering the full React tree.
 *
 * Keep this in sync with src/pages/StorePage.tsx — the page imports from here.
 */
import { CONTACT } from "@/config/contact";

export interface StoreLike {
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

export const SITE_URL = CONTACT.siteUrl;
export const REGINA_CENTRE = { latitude: 50.4452, longitude: -104.6189 };
export const SERVICE_RADIUS_METERS = 15000;
export const SERVED_NEIGHBORHOODS = [
  "Downtown", "Cathedral", "Harbour Landing", "Lakeview", "The Crescents",
  "Albert Park", "Hillsdale", "Whitmore Park", "Eastview", "Glencairn",
  "Walsh Acres", "Normanview", "Argyle Park", "Wood Meadows",
  "Greens on Gardiner", "North Central", "South End",
] as const;

export const normalisePhoneE164 = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const digits = raw.replace(/\D+/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw;
};

export const extractPostalCode = (raw?: string | null): string | undefined => {
  if (!raw) return undefined;
  const m = raw.match(/[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d/);
  return m ? m[0].toUpperCase().replace(/[ -]?(\d[A-Za-z]\d)$/, " $1") : undefined;
};

export const buildStoreUrl = (slug: string | null): string =>
  `${SITE_URL}/liquor-stores/${slug}`;

export const buildLocalBusinessJsonLd = (store: StoreLike) => {
  const url = buildStoreUrl(store.slug);
  const storePhoneE164 = normalisePhoneE164(store.phone);
  const storePostalCode = extractPostalCode(store.address);
  const hasRating =
    !!store.rating && !!store.reviews_count && store.reviews_count > 0;

  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": url,
    name: `${store.name} (via Deliverr)`,
    image: store.image_url
      ? store.image_url.startsWith("http")
        ? store.image_url
        : `${SITE_URL}${store.image_url}`
      : undefined,
    url,
    telephone: storePhoneE164,
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address.split(",")[0]?.trim(),
      addressLocality: "Regina",
      addressRegion: "SK",
      addressCountry: "CA",
      postalCode: storePostalCode,
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: REGINA_CENTRE.latitude,
      longitude: REGINA_CENTRE.longitude,
    },
    areaServed: [
      {
        "@type": "GeoCircle",
        geoMidpoint: {
          "@type": "GeoCoordinates",
          latitude: REGINA_CENTRE.latitude,
          longitude: REGINA_CENTRE.longitude,
        },
        geoRadius: SERVICE_RADIUS_METERS,
        description: `${SERVICE_RADIUS_METERS / 1000} km service radius around central Regina, SK.`,
      },
      {
        "@type": "City",
        name: "Regina",
        sameAs: "https://en.wikipedia.org/wiki/Regina,_Saskatchewan",
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: "Saskatchewan",
          sameAs: "https://en.wikipedia.org/wiki/Saskatchewan",
        },
      },
      ...SERVED_NEIGHBORHOODS.map((n) => ({
        "@type": "Place" as const,
        name: `${n}, Regina`,
      })),
    ],
    contactPoint: storePhoneE164
      ? {
          "@type": "ContactPoint",
          telephone: storePhoneE164,
          contactType: "customer support",
          areaServed: "CA-SK",
          availableLanguage: ["English"],
        }
      : undefined,
    parentOrganization: { "@id": `${CONTACT.siteUrl}/#organization` },
    aggregateRating: hasRating
      ? {
          "@type": "AggregateRating",
          ratingValue: Number(store.rating),
          reviewCount: Number(store.reviews_count),
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
    review: hasRating
      ? [
          {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: Number(store.rating),
              bestRating: 5,
              worstRating: 1,
            },
            author: { "@type": "Organization", name: "Deliverr customers" },
            reviewBody: `Average customer rating of ${Number(store.rating).toFixed(1)} out of 5 across ${store.reviews_count} verified Deliverr deliveries from ${store.name} in Regina.`,
            itemReviewed: { "@id": url },
          },
        ]
      : undefined,
    openingHours: store.hours || undefined,
    makesOffer: {
      "@type": "Offer",
      priceCurrency: "CAD",
      price: store.delivery_fee?.toString() || "7.00",
      description: `Same-day delivery from ${store.name} in Regina`,
    },
  };
};

export const buildBreadcrumbJsonLd = (store: StoreLike) => {
  const url = buildStoreUrl(store.slug);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Stores", item: `${SITE_URL}/stores` },
      { "@type": "ListItem", position: 3, name: store.name, item: url },
    ],
  };
};
