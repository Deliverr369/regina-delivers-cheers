/**
 * Runtime validation for FAQPage structured data.
 *
 * Ensures every entry has a non-empty Question.name + acceptedAnswer.text and
 * matches schema.org's FAQPage shape. Returns the validated FAQPage JSON-LD
 * plus the cleaned items array (matched 1:1 so the visible accordion stays in
 * sync with the JSON-LD).
 *
 * - In development: throws so issues surface immediately.
 * - In production: logs a console error and drops the offending entries so the
 *   page still renders.
 */

export type FaqInput = { q: unknown; a: unknown; aNode?: unknown };
export type FaqClean = { q: string; a: string; aNode?: unknown };

export type FaqPageJsonLd = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
};

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === "string" && v.trim().length > 0;

export function validateFaqs(
  rawItems: FaqInput[],
  context = "FAQ",
): { items: FaqClean[]; jsonLd: FaqPageJsonLd } {
  const isDev =
    typeof import.meta !== "undefined" && (import.meta as any).env?.DEV === true;

  const errors: string[] = [];
  const seenQuestions = new Set<string>();
  const clean: FaqClean[] = [];

  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    errors.push(`${context}: expected a non-empty array of FAQ items.`);
  } else {
    rawItems.forEach((item, i) => {
      if (!item || typeof item !== "object") {
        errors.push(`${context}[${i}]: item is not an object.`);
        return;
      }
      const q = (item as FaqInput).q;
      const a = (item as FaqInput).a;
      if (!isNonEmptyString(q)) {
        errors.push(`${context}[${i}]: question (q) must be a non-empty string.`);
        return;
      }
      if (!isNonEmptyString(a)) {
        errors.push(`${context}[${i}] "${q}": answer (a) must be a non-empty string.`);
        return;
      }
      const qTrim = q.trim();
      if (seenQuestions.has(qTrim.toLowerCase())) {
        errors.push(`${context}[${i}]: duplicate question "${qTrim}".`);
        return;
      }
      seenQuestions.add(qTrim.toLowerCase());
      const cleanItem: FaqClean = { q: qTrim, a: a.trim() };
      if ((item as FaqInput).aNode !== undefined) {
        cleanItem.aNode = (item as FaqInput).aNode;
      }
      clean.push(cleanItem);
    });
  }

  const jsonLd: FaqPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: clean.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  // Final structural sanity check on the JSON-LD we're about to emit.
  jsonLd.mainEntity.forEach((entry, i) => {
    if (
      entry["@type"] !== "Question" ||
      !isNonEmptyString(entry.name) ||
      !entry.acceptedAnswer ||
      entry.acceptedAnswer["@type"] !== "Answer" ||
      !isNonEmptyString(entry.acceptedAnswer.text)
    ) {
      errors.push(`${context}: JSON-LD mainEntity[${i}] failed schema.org FAQPage shape check.`);
    }
  });

  if (errors.length > 0) {
    const message = `[FAQ validation] ${errors.join(" | ")}`;
    if (isDev) {
      throw new Error(message);
    } else {
      // eslint-disable-next-line no-console
      console.error(message);
    }
  }

  return { items: clean, jsonLd };
}
