/**
 * Single source of truth for Deliverr contact + brand info.
 * Used by:
 *  - JSON-LD (Organization, LocalBusiness) — see src/components/seo/LocalBusinessJsonLd.tsx
 *  - Visible UI (Footer, SupportChatbot)
 *
 * If you change a phone number, email or address here, the structured data
 * and the visible contact details stay in sync automatically.
 */

export const CONTACT = {
  brand: "Deliverr",
  legalName: "Deliverr Delivery Services Inc.",

  // Canonical website (matches DomainCanonical.tsx)
  siteUrl: "https://deliverr.store",
  logoUrl: "https://deliverr.store/og-image.jpg",

  // Phone — keep the E.164 form for tel: + JSON-LD; display form for UI
  phoneE164: "+13065333333",
  phoneDisplay: "+1 (306) 533-3333",
  phoneShort: "306-533-3333",

  // Email
  email: "support@deliverr.ca",

  // Address
  streetAddress: "Regina, SK",
  city: "Regina",
  region: "SK",
  country: "CA",
  latitude: 50.4452,
  longitude: -104.6189,

  // Hours (display + JSON-LD)
  hoursDisplay: "Daily 10:00 AM – 2:00 AM",
  opens: "10:00",
  closes: "02:00",

  // Social
  social: {
    instagram: "https://www.instagram.com/deliverr.ca",
    facebook: "https://www.facebook.com/deliverr.ca",
  },
} as const;

export const telHref = `tel:${CONTACT.phoneE164}`;
export const mailHref = `mailto:${CONTACT.email}`;
