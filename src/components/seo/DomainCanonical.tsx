import { useEffect } from "react";

/**
 * Domain-aware SEO + redirect controller.
 *
 * - On the production domain (deliverr.ca / www.deliverr.ca) → indexable, canonical points to .ca
 * - On every other host (deliverr.store staging, *.lovable.app, previews, localhost)
 *   → noindex, nofollow. Canonical still points to the matching .ca URL so any
 *   accidental indexation consolidates link equity onto production.
 * - On legacy lovable.app public hosts → 301-style client redirect to the matching
 *   deliverr.ca URL, preserving the path, query string, and hash.
 *
 * NOTE: deliverr.store is intentionally NOT in REDIRECT_HOSTS while it is being used
 * as the staging environment. Add it once the production cutover to .ca is complete.
 *
 * Loop protection:
 *   1. Never redirect if the computed target equals the current href.
 *   2. Never redirect if the target host is not actually different.
 *   3. Track attempts in sessionStorage; abort after MAX_REDIRECT_ATTEMPTS within the same tab.
 *   4. Record the last redirect target+timestamp; if we see the same target again within
 *      LOOP_WINDOW_MS, treat it as a loop and abort.
 *
 * All decisions are logged under the `[DomainCanonical]` prefix so you can filter the console.
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
// deliverr.store is staging — do NOT add it here until cutover.
const REDIRECT_HOSTS = new Set([
  "regina-delivers-cheers.lovable.app",
]);

const NO_REDIRECT_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\.0\.0\.1$/,
  /\.lovable\.app$/i,
  /\.lovableproject\.com$/i,
];

// Loop guard tuning
const ATTEMPTS_KEY = "deliverr:redirect:attempts";
const LAST_TARGET_KEY = "deliverr:redirect:last";
const MAX_REDIRECT_ATTEMPTS = 3;
const LOOP_WINDOW_MS = 10_000;

const LOG_PREFIX = "[DomainCanonical]";

const log = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.info(LOG_PREFIX, ...args);
};
const warn = (...args: unknown[]) => {
  // eslint-disable-next-line no-console
  console.warn(LOG_PREFIX, ...args);
};

const safeSession = () => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

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

/**
 * Returns true if it is safe to perform `window.location.replace(target)`.
 * Returns false (and logs a warning) if a loop is suspected.
 */
const passesLoopGuard = (currentHref: string, target: string): boolean => {
  // Guard 1: no-op redirect
  if (target === currentHref) {
    warn("Skip — target equals current URL", { target });
    return false;
  }

  // Guard 2: same host (would just be a path change, not a host redirect)
  try {
    const currentHost = new URL(currentHref).host.toLowerCase();
    const targetHost = new URL(target).host.toLowerCase();
    if (currentHost === targetHost) {
      warn("Skip — target host equals current host", { currentHost, targetHost });
      return false;
    }
  } catch {
    /* ignore URL parse issues */
  }

  const session = safeSession();
  if (!session) {
    log("sessionStorage unavailable; performing single redirect without counter");
    return true;
  }

  const now = Date.now();

  // Guard 3: same target seen recently
  try {
    const lastRaw = session.getItem(LAST_TARGET_KEY);
    if (lastRaw) {
      const last = JSON.parse(lastRaw) as { target: string; ts: number };
      if (last.target === target && now - last.ts < LOOP_WINDOW_MS) {
        warn("Loop detected — same target within window, aborting", {
          target,
          msSinceLast: now - last.ts,
        });
        return false;
      }
    }
  } catch {
    session.removeItem(LAST_TARGET_KEY);
  }

  // Guard 4: too many attempts in this tab
  const attempts = Number(session.getItem(ATTEMPTS_KEY) ?? "0") || 0;
  if (attempts >= MAX_REDIRECT_ATTEMPTS) {
    warn("Loop guard tripped — max attempts reached, aborting", {
      attempts,
      max: MAX_REDIRECT_ATTEMPTS,
    });
    return false;
  }

  // Record this attempt
  session.setItem(ATTEMPTS_KEY, String(attempts + 1));
  session.setItem(LAST_TARGET_KEY, JSON.stringify({ target, ts: now }));
  log("Loop guard OK — proceeding", { attempts: attempts + 1, target });
  return true;
};

const DomainCanonical = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const host = window.location.hostname.toLowerCase();
    const path = window.location.pathname + window.location.search + window.location.hash;
    const canonicalPath = window.location.pathname + window.location.search;
    const isProd = PROD_HOSTS.has(host);

    log("Boot", { host, path, isProd });

    // 1) Fallback redirect: send legacy/staging public hosts to the matching .ca URL.
    if (shouldRedirect(host)) {
      const target = `${PROD_ORIGIN}${path}`;
      log("Redirect candidate", { from: window.location.href, target });
      if (passesLoopGuard(window.location.href, target)) {
        log("Redirecting now →", target);
        window.location.replace(target);
        return;
      }
      // If we fall through, we suppress the redirect this session but still apply SEO below.
    } else if (isProd) {
      // On production — clear any stale loop counters from a prior visit to a legacy host.
      const session = safeSession();
      if (session) {
        session.removeItem(ATTEMPTS_KEY);
        session.removeItem(LAST_TARGET_KEY);
      }
    }

    // 2) SEO controls
    if (isProd) {
      setMeta("robots", "index, follow, max-image-preview:large");
      setMeta("googlebot", "index, follow");
      setCanonical(`${PROD_ORIGIN}${canonicalPath}`);
      log("SEO applied: indexable (production host)");
    } else {
      setMeta("robots", "noindex, nofollow, noarchive, nosnippet");
      setMeta("googlebot", "noindex, nofollow");
      setCanonical(`${PROD_ORIGIN}${canonicalPath}`);
      log("SEO applied: noindex (non-production host)");
    }
  }, []);

  return null;
};

export default DomainCanonical;
