import { describe, it, expect } from "vitest";
import {
  buildLocalBusinessJsonLd,
  buildBreadcrumbJsonLd,
  type StoreLike,
} from "./storePageJsonLd";

const baseStore: StoreLike = {
  id: "store-1",
  slug: "willow-park-wine-spirits",
  name: "Willow Park Wine & Spirits",
  address: "2606 28th Ave, Regina, SK S4S 6X4",
  phone: "(306) 585-2266",
  hours: "Mo-Su 10:00-22:00",
  delivery_fee: 7,
  delivery_time: "30-45 min",
  image_url: "/images/stores/willow-park-logo.png",
  rating: 4.9,
  reviews_count: 425,
  is_open: true,
};

const unratedStore: StoreLike = {
  ...baseStore,
  id: "store-2",
  slug: "empire-offsale",
  name: "Empire Offsale",
  address: "1755 Hamilton St, Regina, SK S4P 2B6",
  phone: "306-757-1755",
  image_url: null,
  rating: null,
  reviews_count: null,
};

const zeroReviewsStore: StoreLike = {
  ...baseStore,
  id: "store-3",
  slug: "fresh-store",
  name: "Fresh Liquor",
  rating: 0,
  reviews_count: 0,
};

describe("StorePage JSON-LD — LocalBusiness", () => {
  it("matches snapshot for a store WITH rating + reviews", () => {
    expect(buildLocalBusinessJsonLd(baseStore)).toMatchSnapshot();
  });

  it("matches snapshot for a store WITHOUT rating + reviews", () => {
    expect(buildLocalBusinessJsonLd(unratedStore)).toMatchSnapshot();
  });

  it("matches snapshot when rating and reviews_count are zero", () => {
    expect(buildLocalBusinessJsonLd(zeroReviewsStore)).toMatchSnapshot();
  });

  it("emits AggregateRating + Review when rating data exists", () => {
    const ld = buildLocalBusinessJsonLd(baseStore);
    expect(ld.aggregateRating).toEqual({
      "@type": "AggregateRating",
      ratingValue: 4.9,
      reviewCount: 425,
      bestRating: 5,
      worstRating: 1,
    });
    expect(ld.review).toHaveLength(1);
    expect(ld.review?.[0]).toMatchObject({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: 4.9 },
      author: { "@type": "Organization", name: "Deliverr customers" },
    });
  });

  it("omits AggregateRating + Review when rating is missing", () => {
    const ld = buildLocalBusinessJsonLd(unratedStore);
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
  });

  it("omits AggregateRating + Review when reviews_count is zero", () => {
    const ld = buildLocalBusinessJsonLd(zeroReviewsStore);
    expect(ld.aggregateRating).toBeUndefined();
    expect(ld.review).toBeUndefined();
  });

  it("normalises Canadian phone numbers into E.164", () => {
    expect(buildLocalBusinessJsonLd(baseStore).telephone).toBe("+13065852266");
    expect(buildLocalBusinessJsonLd(unratedStore).telephone).toBe("+13067571755");
  });

  it("extracts the postal code from the address", () => {
    expect(buildLocalBusinessJsonLd(baseStore).address.postalCode).toBe("S4S 6X4");
    expect(buildLocalBusinessJsonLd(unratedStore).address.postalCode).toBe("S4P 2B6");
  });

  it("produces a JSON-serializable structure", () => {
    expect(() => JSON.stringify(buildLocalBusinessJsonLd(baseStore))).not.toThrow();
    expect(() => JSON.stringify(buildLocalBusinessJsonLd(unratedStore))).not.toThrow();
  });
});

describe("StorePage JSON-LD — BreadcrumbList", () => {
  it("matches snapshot", () => {
    expect(buildBreadcrumbJsonLd(baseStore)).toMatchSnapshot();
  });
});
