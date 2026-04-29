import { useEffect } from "react";

/**
 * Domain-aware SEO controller.
 *
 * - On the production domain (deliverr.ca / www.deliverr.ca) → indexable, canonical points to .ca
 * - On every other host (deliverr.store, *.lovable.app, previews, localhost) → noindex, nofollow
 *
 * This protects the SEO of deliverr.ca by preventing staging / test domains from
 * being indexed by Google or duplicating ranking signals.
 */
const PROD_HOSTS = new Set(["deliverr.ca", "www.deliverr.ca"]);
const PROD_ORIGIN = "https://www.deliverr.ca";

const setMeta = (name: string, content: string) => {
  let tag = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setCanonical = (href: string) => {
  let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
};

const DomainCanonical = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname + window.location.search;
    const isProd = PROD_HOSTS.has(host);

    if (isProd) {
      setMeta("robots", "index, follow, max-image-preview:large");
      setMeta("googlebot", "index, follow");
      setCanonical(`${PROD_ORIGIN}${path}`);
    } else {
      // Staging / test / preview domains — keep them out of search results.
      setMeta("robots", "noindex, nofollow, noarchive, nosnippet");
      setMeta("googlebot", "noindex, nofollow");
      // Canonical points to the production equivalent so any leaked links
      // consolidate ranking on deliverr.ca instead of the staging host.
      setCanonical(`${PROD_ORIGIN}${path}`);
    }
  }, []);

  return null;
};

export default DomainCanonical;
