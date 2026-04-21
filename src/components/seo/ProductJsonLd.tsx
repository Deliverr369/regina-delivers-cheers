import { useEffect } from "react";

interface ProductJsonLdProps {
  name: string;
  description?: string;
  image?: string;
  brand?: string;
  category?: string;
  price?: number;
  size?: string;
  sku?: string;
  inStock?: boolean;
  url?: string;
}

/**
 * Injects schema.org Product JSON-LD into <head> for Google Shopping & rich snippets.
 * Removes itself on unmount to avoid stale data when navigating between products.
 */
export const ProductJsonLd = ({
  name,
  description,
  image,
  brand,
  category,
  price,
  size,
  sku,
  inStock = true,
  url,
}: ProductJsonLdProps) => {
  useEffect(() => {
    const data: any = {
      "@context": "https://schema.org/",
      "@type": "Product",
      name,
      description,
      image: image ? [image] : undefined,
      sku: sku || undefined,
      brand: brand ? { "@type": "Brand", name: brand } : undefined,
      category,
      offers: price
        ? {
            "@type": "Offer",
            url: url || (typeof window !== "undefined" ? window.location.href : undefined),
            priceCurrency: "CAD",
            price: price.toFixed(2),
            availability: inStock
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
            areaServed: {
              "@type": "City",
              name: "Regina",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Regina",
                addressRegion: "SK",
                addressCountry: "CA",
              },
            },
            seller: {
              "@type": "Organization",
              name: "Regina Delivers Cheers",
            },
          }
        : undefined,
    };

    // Strip undefined
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.dataset.productJsonLd = sku || name;
    script.text = JSON.stringify(data);
    document.head.appendChild(script);

    // Meta tags
    const ensureMeta = (selector: string, attrs: Record<string, string>) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
        document.head.appendChild(el);
      }
      if (attrs.content) el.setAttribute("content", attrs.content);
      return el;
    };

    const created: HTMLElement[] = [script];
    if (description) {
      const m = ensureMeta('meta[data-product-meta="description"]', {
        "data-product-meta": "description",
        name: "description",
        content: description.slice(0, 160),
      });
      created.push(m);
    }

    return () => {
      created.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [name, description, image, brand, category, price, size, sku, inStock, url]);

  return null;
};
