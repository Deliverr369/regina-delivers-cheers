import { supabase } from "@/integrations/supabase/client";

const AGE_GATE_KEY = "deliverr_age_verified_v1";

export const hasVerifiedAge = () => {
  try {
    return localStorage.getItem(AGE_GATE_KEY) === "true";
  } catch {
    return true;
  }
};

/**
 * Records the 19+ attestation server-side for the signed-in user.
 * The database rejects order creation for accounts with no recorded attestation,
 * so the localStorage flag alone can no longer be used to bypass the gate.
 */
export const recordAgeVerificationServerSide = async (): Promise<boolean> => {
  try {
    // Only call with a live signed-in session; the function is not callable anonymously.
    let { data: { session } } = await supabase.auth.getSession();
    const expiresSoon = session?.expires_at ? session.expires_at * 1000 - Date.now() < 60_000 : false;
    if (!session || expiresSoon) {
      const { data } = await supabase.auth.refreshSession();
      session = data.session;
    }
    if (!session?.access_token) return false;
    const { error } = await supabase.rpc("confirm_age_19_plus");
    if (error) {
      console.warn("[ageGate] Could not save 19+ confirmation:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.warn("[ageGate] Could not save 19+ confirmation:", e);
    return false;
  }
};

export const markAgeVerified = () => {
  try {
    localStorage.setItem(AGE_GATE_KEY, "true");
  } catch {
    /* ignore */
  }
  // Fire-and-forget: persists the attestation whenever a session exists.
  void recordAgeVerificationServerSide();
};

export const resetAgeVerification = () => {
  try {
    localStorage.removeItem(AGE_GATE_KEY);
  } catch {
    /* ignore */
  }
};
