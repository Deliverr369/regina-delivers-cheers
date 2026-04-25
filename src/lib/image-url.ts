/**
 * Normalize external image URLs so that CDNs do not return AVIF.
 *
 * iOS WebKit (Capacitor WKWebView) advertises AVIF support in its Accept
 * header but its decoder rejects many real-world AVIF profiles, producing
 * `'AVIF'-_reader->initImage[0] failed err=-39` errors and broken images.
 *
 * We solve this at the URL level by:
 *   1. Rewriting Shopify CDN URLs to force `format=jpg` (Shopify supports
 *      `?format=jpg|png|webp` query params on its image pipeline).
 *   2. Rewriting Unsplash URLs to force `fm=jpg`.
 *   3. Leaving anything we don't recognize untouched.
 *
 * This is a safe, no-op transform for browsers that handle AVIF fine — the
 * resulting URLs still serve modern, compressed images, just not AVIF.
 */

const AVIF_EXT_REGEX = /\.avif(\?|$)/i;

function rewriteShopify(url: URL): URL {
  // Shopify image pipeline supports `format` query param.
  if (!url.hostname.endsWith("cdn.shopify.com")) return url;
  url.searchParams.set("format", "jpg");
  return url;
}

function rewriteUnsplash(url: URL): URL {
  if (!url.hostname.endsWith("images.unsplash.com")) return url;
  // Unsplash respects `fm` (format) query param.
  url.searchParams.set("fm", "jpg");
  return url;
}

function rewriteWillowPark(url: URL): URL {
  // Shopify-hosted store CDN. Same trick as cdn.shopify.com.
  if (!url.hostname.endsWith("willowparkwines-sk.com")) return url;
  if (url.pathname.includes("/cdn/shop/")) {
    url.searchParams.set("format", "jpg");
  }
  return url;
}

/**
 * Returns a safe image URL with AVIF stripped where possible.
 * Pass-through for falsy values, data URLs, blob URLs, and unknown CDNs.
 */
export function safeImageUrl(input: string | null | undefined): string {
  if (!input) return "";
  if (input.startsWith("data:") || input.startsWith("blob:")) return input;

  // Fast path: explicit .avif extension — try to swap to .jpg.
  if (AVIF_EXT_REGEX.test(input)) {
    const swapped = input.replace(AVIF_EXT_REGEX, ".jpg$1");
    return safeImageUrl(swapped);
  }

  let url: URL;
  try {
    url = new URL(input, typeof window !== "undefined" ? window.location.origin : "https://placeholder.local");
  } catch {
    return input;
  }

  url = rewriteShopify(url);
  url = rewriteUnsplash(url);
  url = rewriteWillowPark(url);

  return url.toString();
}
