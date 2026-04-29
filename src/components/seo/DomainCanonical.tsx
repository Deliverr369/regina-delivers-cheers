import { useEffect } from "react";

/**
 * Domain-aware SEO + redirect controller.
 *
 * - On the production domain (deliverr.ca / www.deliverr.ca) → indexable, canonical points to .ca
 * - On every other host (deliverr.store, *.lovable.app, previews, localhost) → noindex, nofollow
 * - On "old"/staging public hosts → 301-style client redirect to the matching deliverr.ca URL,
 *   preserving the path, query string, and hash. Prevents broken links once .ca is live.
 *
 * Hosts that should NEVER auto-redirect (we still want to use them for testing):
 *   - localhost / 127.0.0.1
 *   - *.lovable.app preview/sandbox URLs
 *   - *.lovableproject.com
 *   - Capacitor / native shells (file://, capacitor://, ionic://)
 */
const PROD_HOSTS = new Set(["deliverr.ca", "www.deliverr.ca"]);
const PROD_ORIGIN = "https://www.deliverr.ca";

// Hosts that look like "old" public domains we want to redirect to .ca.
// Add any future legacy hosts here.
const REDIRECT_HOSTS = new Set([
  "deliverr.store",
  "www.deliverr.store",
  "regina-delivers-cheers.lovable.app",
]);

const NO_REDIRECT_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /\.lovable\.app$/i,
  /\.lovableproject\.com$/i,
];

const isNativeShell = () => {
  if (typeof window === "undefined") return false;
  const proto = window.location.protocol;
  return proto === "file:" || proto === "capacitor:" || proto === "ionic:";
};

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

const shouldRedirect = (host: string): boolean => {
  if (isNativeShell()) return false;
  if (NO_REDIRECT_PATTERNS.some((re) => re.test(host))) return false;
  return REDIRECT_HOSTS.has(host);
};

const DomainCanonical = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname + window.location.search + window.location.hash;
    const isProd = PROD_HOSTS.has(host);

    // 1) Fallback redirect: send legacy/staging public hosts to the matching .ca URL.
    //    Only runs once .ca is reachable; we attempt the redirect optimistically.
    if (shouldRedirect(host)) {
      const target = `${PROD_ORIGIN}${path}`;
      // Avoid redirect loops in the unlikely case target === current
      if (target !== window.location.href) {
        window.location.replace(target);
        return;
      }
    }

    // 2) SEO controls
    if (isProd) {
      setMeta("robots", "index, follow, max-image-preview:large");
      setMeta("googlebot", "index, follow");
      setCanonical(`${PROD_ORIGIN}${window.location.pathname}${window.location.search}`);
    } else {
      setMeta("robots", "noindex, nofollow, noarchive, nosnippet");
      setMeta("googlebot", "noindex, nofollow");
      setCanonical(`${PROD_ORIGIN}${window.location.pathname}${window.location.search}`);
    }
  }, []);

  return null;
};

export default DomainCanonical;
