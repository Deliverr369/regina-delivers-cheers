// Derives the active Stripe environment from the publishable token baked
// into the build. `pk_test_*` -> sandbox, `pk_live_*` -> live.
// Vite picks .env.development (sandbox) or .env.production (live) automatically.
export type StripeEnv = "sandbox" | "live";

const token = (import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN as string | undefined) || "";

export const stripeEnv: StripeEnv = token.startsWith("pk_live_") ? "live" : "sandbox";

export function getStripeEnv(): StripeEnv {
  return stripeEnv;
}
