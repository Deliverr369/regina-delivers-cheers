import { useEffect } from "react";

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  image?: string;
  noindex?: boolean;
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const SITE_URL = "https://regina-delivers-cheers.lovable.app";
const DEFAULT_IMAGE = `${SITE_URL}/og-image.jpg`;

const setMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    Object.entries(attrs).forEach(([k, v]) => {
      if (k !== "content") el!.setAttribute(k, v);
    });
    document.head.appendChild(el);
  }
  if (attrs.content !== undefined) el.setAttribute("content", attrs.content);
  return el;
};

const setLink = (rel: string, href: string) => {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
  return el;
};

/**
 * Per-page SEO: title, meta description, canonical, OG/Twitter, optional JSON-LD.
 * Cleans up its injected JSON-LD on unmount.
 */
export const SEO = ({
  title,
  description,
  canonical,
  image = DEFAULT_IMAGE,
  noindex = false,
  jsonLd,
}: SEOProps) => {
  useEffect(() => {
    const fullTitle = title.length > 60 ? title.slice(0, 57) + "..." : title;
    document.title = fullTitle;

    const desc = description?.slice(0, 160);
    const url =
      canonical ||
      (typeof window !== "undefined" ? window.location.origin + window.location.pathname : SITE_URL);

    if (desc) setMeta('meta[name="description"]', { name: "description", content: desc });
    setMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex ? "noindex, nofollow" : "index, follow",
    });

    setLink("canonical", url);

    // Open Graph
    setMeta('meta[property="og:title"]', { property: "og:title", content: fullTitle });
    if (desc) setMeta('meta[property="og:description"]', { property: "og:description", content: desc });
    setMeta('meta[property="og:url"]', { property: "og:url", content: url });
    setMeta('meta[property="og:image"]', { property: "og:image", content: image });
    setMeta('meta[property="og:type"]', { property: "og:type", content: "website" });

    // Twitter
    setMeta('meta[name="twitter:card"]', { name: "twitter:card", content: "summary_large_image" });
    setMeta('meta[name="twitter:title"]', { name: "twitter:title", content: fullTitle });
    if (desc) setMeta('meta[name="twitter:description"]', { name: "twitter:description", content: desc });
    setMeta('meta[name="twitter:image"]', { name: "twitter:image", content: image });

    // JSON-LD
    const created: HTMLScriptElement[] = [];
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((data) => {
        const s = document.createElement("script");
        s.type = "application/ld+json";
        s.dataset.seoJsonld = "1";
        s.text = JSON.stringify(data);
        document.head.appendChild(s);
        created.push(s);
      });
    }

    return () => {
      created.forEach((el) => el.parentNode?.removeChild(el));
    };
  }, [title, description, canonical, image, noindex, JSON.stringify(jsonLd)]);

  return null;
};

export default SEO;
