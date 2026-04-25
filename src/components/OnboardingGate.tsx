import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { hasCompletedOnboarding } from "@/lib/onboarding";
import { useIsNative } from "@/hooks/useIsNative";

/**
 * On first launch (native app only), redirect to /onboarding if it hasn't
 * been completed yet. Mounted once near the app root.
 */
const OnboardingGate = () => {
  const navigate = useNavigate();
  const isNative = useIsNative();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    setChecked(true);
    if (!isNative) return;
    if (hasCompletedOnboarding()) return;
    if (window.location.pathname === "/onboarding") return;
    navigate("/onboarding", { replace: true });
  }, [isNative, checked, navigate]);

  return null;
};

export default OnboardingGate;
