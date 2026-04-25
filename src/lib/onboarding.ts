const ONBOARDING_KEY = "deliverr_onboarding_completed_v1";

export const hasCompletedOnboarding = () => {
  try {
    return localStorage.getItem(ONBOARDING_KEY) === "true";
  } catch {
    return true; // fail-open so SSR / private mode never blocks the app
  }
};

export const markOnboardingComplete = () => {
  try {
    localStorage.setItem(ONBOARDING_KEY, "true");
  } catch {
    /* ignore */
  }
};

export const resetOnboarding = () => {
  try {
    localStorage.removeItem(ONBOARDING_KEY);
  } catch {
    /* ignore */
  }
};
