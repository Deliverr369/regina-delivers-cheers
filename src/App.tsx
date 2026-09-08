import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";

// Eagerly loaded — needed on first paint of the most common entry routes
import Index from "./pages/Index";
import Stores from "./pages/Stores";
import OnboardingGate from "./components/OnboardingGate";
import AgeGate from "./components/AgeGate";
import PushNotificationsMount from "./components/PushNotificationsMount";

import DomainCanonical from "./components/seo/DomainCanonical";

// Retries a dynamic import once after a hard reload when the chunk is missing
// (happens when a new deploy invalidates the previously cached chunk names).
const lazyWithReload = <T extends { default: ComponentType<any> }>(
  factory: () => Promise<T>,
  key: string
) =>
  lazy(() =>
    factory().catch((err) => {
      const flag = `chunk-reload:${key}`;
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        window.location.reload();
        return new Promise<T>(() => {});
      }
      throw err;
    })
  );

// Lazy-loaded — split out of the initial bundle
const Categories = lazyWithReload(() => import("./pages/Categories"), "Categories");
const StoreDetail = lazyWithReload(() => import("./pages/StoreDetail"), "StoreDetail");
const Products = lazyWithReload(() => import("./pages/Products"), "Products");
const ProductDetail = lazyWithReload(() => import("./pages/ProductDetail"), "ProductDetail");
const Cart = lazyWithReload(() => import("./pages/Cart"), "Cart");
const Checkout = lazyWithReload(() => import("./pages/Checkout"), "Checkout");
const OrderConfirmation = lazyWithReload(() => import("./pages/OrderConfirmation"), "OrderConfirmation");
const HowItWorks = lazyWithReload(() => import("./pages/HowItWorks"), "HowItWorks");
const Login = lazyWithReload(() => import("./pages/Login"), "Login");
const Signup = lazyWithReload(() => import("./pages/Signup"), "Signup");
const Orders = lazyWithReload(() => import("./pages/Orders"), "Orders");
const OrderReceipt = lazyWithReload(() => import("./pages/OrderReceipt"), "OrderReceipt");
const Admin = lazyWithReload(() => import("./pages/Admin"), "Admin");
const Profile = lazyWithReload(() => import("./pages/Profile"), "Profile");
const Favorites = lazyWithReload(() => import("./pages/Favorites"), "Favorites");
const Onboarding = lazyWithReload(() => import("./pages/Onboarding"), "Onboarding");
const About = lazyWithReload(() => import("./pages/About"), "About");
const Help = lazyWithReload(() => import("./pages/Help"), "Help");
const Privacy = lazyWithReload(() => import("./pages/Privacy"), "Privacy");
const Terms = lazyWithReload(() => import("./pages/Terms"), "Terms");
const NotFound = lazyWithReload(() => import("./pages/NotFound"), "NotFound");
const ReginaLanding = lazyWithReload(() => import("./pages/ReginaLanding"), "ReginaLanding");
const Blog = lazyWithReload(() => import("./pages/Blog"), "Blog");
const BlogPost = lazyWithReload(() => import("./pages/BlogPost"), "BlogPost");
const StorePage = lazyWithReload(() => import("./pages/StorePage"), "StorePage");
const CategoryLanding = lazyWithReload(() => import("./pages/CategoryLanding"), "CategoryLanding");
const StoreDirectoryLanding = lazyWithReload(() => import("./pages/StoreDirectoryLanding"), "StoreDirectoryLanding");
const StoreCategoryDetail = lazyWithReload(() => import("./pages/StoreCategoryDetail"), "StoreCategoryDetail");

// Admin dashboard — heavy, lazy-loaded as a group
const DashboardLayout = lazyWithReload(() => import("./components/dashboard/DashboardLayout"), "DashboardLayout");
const DashboardOverview = lazyWithReload(() => import("./pages/dashboard/DashboardOverview"), "DashboardOverview");
const DashboardOrders = lazyWithReload(() => import("./pages/dashboard/DashboardOrders"), "DashboardOrders");
const DashboardProducts = lazyWithReload(() => import("./pages/dashboard/DashboardProducts"), "DashboardProducts");
const DashboardStores = lazyWithReload(() => import("./pages/dashboard/DashboardStores"), "DashboardStores");
const DashboardStoreHours = lazyWithReload(() => import("./pages/dashboard/DashboardStoreHours"), "DashboardStoreHours");
const DashboardUsers = lazyWithReload(() => import("./pages/dashboard/DashboardUsers"), "DashboardUsers");
const DashboardBanners = lazyWithReload(() => import("./pages/dashboard/DashboardBanners"), "DashboardBanners");
const DashboardBulkImages = lazyWithReload(() => import("./pages/dashboard/DashboardBulkImages"), "DashboardBulkImages");
const DashboardAutoImages = lazyWithReload(() => import("./pages/dashboard/DashboardAutoImages"), "DashboardAutoImages");
const DashboardMatchImages = lazyWithReload(() => import("./pages/dashboard/DashboardMatchImages"), "DashboardMatchImages");
const DashboardInventory = lazyWithReload(() => import("./pages/dashboard/DashboardInventory"), "DashboardInventory");
const DashboardImporter = lazyWithReload(() => import("./pages/dashboard/DashboardImporter"), "DashboardImporter");
const DashboardSEO = lazyWithReload(() => import("./pages/dashboard/DashboardSEO"), "DashboardSEO");
const DashboardPushTest = lazyWithReload(() => import("./pages/dashboard/DashboardPushTest"), "DashboardPushTest");
const DashboardBlog = lazyWithReload(() => import("./pages/dashboard/DashboardBlog"), "DashboardBlog");
const DashboardSecurity = lazyWithReload(() => import("./pages/dashboard/DashboardSecurity"), "DashboardSecurity");

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 1 minute → instant navigation back to previously visited pages
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DomainCanonical />
            <AgeGate />
            <OnboardingGate />
            <PushNotificationsMount />
            <SupportChatbot />
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/categories" element={<Categories />} />
                <Route path="/stores" element={<Stores />} />
                <Route path="/stores/:id" element={<StoreDetail />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-confirmation" element={<OrderConfirmation />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/orders/:id" element={<OrderReceipt />} />
                <Route path="/how-it-works" element={<HowItWorks />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/favorites" element={<Favorites />} />
                <Route path="/about" element={<About />} />
                <Route path="/help" element={<Help />} />
                <Route path="/need-help" element={<Help />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/delivery/regina" element={<ReginaLanding />} />
                <Route path="/delivery/regina/:neighborhood" element={<ReginaLanding />} />
                <Route path="/blog" element={<Blog />} />
                <Route path="/blog/:slug" element={<BlogPost />} />
                <Route path="/liquor-stores/:slug" element={<StorePage />} />
                <Route path="/stores-regina/:slug" element={<StorePage />} />
                <Route path="/alcohol-delivery-regina" element={<CategoryLanding />} />
                <Route path="/beer-delivery-regina" element={<CategoryLanding />} />
                <Route path="/wine-delivery-regina" element={<CategoryLanding />} />
                <Route path="/liquor-delivery-regina" element={<CategoryLanding />} />
                <Route path="/grocery-delivery-regina" element={<CategoryLanding />} />
                <Route path="/smokes-delivery-regina" element={<CategoryLanding />} />
                <Route path="/vape-delivery-regina" element={<CategoryLanding />} />
                <Route path="/spirits-delivery-regina" element={<CategoryLanding />} />
                <Route path="/vape-stores-regina" element={<StoreDirectoryLanding />} />
                <Route path="/vape-stores-regina/:slug" element={<StoreCategoryDetail category="vape" />} />
                <Route path="/spirits-stores-regina" element={<StoreDirectoryLanding />} />
                <Route path="/spirits-stores-regina/:slug" element={<StoreCategoryDetail category="spirits" />} />

                {/* Admin Dashboard */}
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<DashboardOverview />} />
                  <Route path="orders" element={<DashboardOrders />} />
                  <Route path="products" element={<DashboardProducts />} />
                  <Route path="stores" element={<DashboardStores />} />
                  <Route path="store-hours" element={<DashboardStoreHours />} />
                  <Route path="users" element={<DashboardUsers />} />
                  <Route path="banners" element={<DashboardBanners />} />
                  <Route path="bulk-images" element={<DashboardBulkImages />} />
                  <Route path="auto-images" element={<DashboardAutoImages />} />
                  <Route path="match-images" element={<DashboardMatchImages />} />
                  <Route path="inventory" element={<DashboardInventory />} />
                  <Route path="importer" element={<DashboardImporter />} />
                  <Route path="seo" element={<DashboardSEO />} />
                  <Route path="push-test" element={<DashboardPushTest />} />
                  <Route path="blog" element={<DashboardBlog />} />
                  <Route path="security" element={<DashboardSecurity />} />
                </Route>

                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
