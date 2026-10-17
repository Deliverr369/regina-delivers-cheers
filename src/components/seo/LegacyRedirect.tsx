import { Navigate, useLocation } from "react-router-dom";

/**
 * Maps any old-site URL (/city/..., /brands/..., including the old site's
 * doubled paths like /city/regina/liquor/store/city/regina/liquor/store/x)
 * to the closest current page.
 */
export function legacyTarget(pathname: string): string {
  const p = pathname.toLowerCase();
  if (p.startsWith("/brands")) return "/liquor-delivery-regina";
  if (p.includes("willow-park")) return "/liquor-stores/willow-park-wine-spirits";
  if (p.includes("sobeys-liquor")) return "/liquor-stores/sobeys-liquor";
  if (p.includes("co-op") || p.includes("coop")) return "/liquor-stores/co-op-liquor";
  if (p.includes("superstore")) return "/liquor-stores/superstore-liquor";
  if (p.includes("costco")) return "/liquor-stores/costco-liquor";
  if (p.includes("empire")) return "/liquor-stores/empire-offsale";
  if (p.includes("/liquor/store")) return "/liquor-stores-regina";
  if (p.includes("/liquor")) return "/liquor-delivery-regina";
  if (p.includes("/grocery")) return "/grocery-delivery-regina";
  return "/stores";
}

const LegacyRedirect = () => {
  const { pathname } = useLocation();
  return <Navigate to={legacyTarget(pathname)} replace />;
};

export default LegacyRedirect;
