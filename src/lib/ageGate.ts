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
export const recordAgeVerificationServerSide = async () => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) return false;
    const { error } = await supabase.rpc("confirm_age_19_plus");
    return !error;
  } catch {
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
