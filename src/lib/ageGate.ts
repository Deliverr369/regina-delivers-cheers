const AGE_GATE_KEY = "deliverr_age_verified_v1";

export const hasVerifiedAge = () => {
  try {
    return localStorage.getItem(AGE_GATE_KEY) === "true";
  } catch {
    return true;
  }
};

export const markAgeVerified = () => {
  try {
    localStorage.setItem(AGE_GATE_KEY, "true");
  } catch {
    /* ignore */
  }
};

export const resetAgeVerification = () => {
  try {
    localStorage.removeItem(AGE_GATE_KEY);
  } catch {
    /* ignore */
  }
};
