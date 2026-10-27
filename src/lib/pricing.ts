// Single source of truth for order pricing. A byte-identical copy lives in
// supabase/functions/_shared/pricing.ts — keep both in sync.
export const PRODUCT_TAX_PCT = 0.15; // shelf prices exclude tax
export const CONVENIENCE_PCT = 0.11; // on (products + product tax)
export const DELIVERY_TAX_PCT = 0.05; // on delivery fee only
export const BUFFER_PCT = 0.25; // extra card hold to cover price differences

export const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

export function computeFees(subtotal: number, deliveryFee: number) {
  const sub = round2(subtotal);
  const productTax = round2(sub * PRODUCT_TAX_PCT);
  const convenienceFee = round2((sub + productTax) * CONVENIENCE_PCT);
  const deliveryTax = round2(deliveryFee * DELIVERY_TAX_PCT);
  const tax = round2(productTax + deliveryTax);
  return { subtotal: sub, productTax, deliveryTax, tax, convenienceFee };
}

export const holdAmount = (total: number) => round2(total * (1 + BUFFER_PCT));
