import { lazy, Suspense } from "react";
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
import SupportChatbot from "./components/SupportChatbot";
import DomainCanonical from "./components/seo/DomainCanonical";

// Lazy-loaded — split out of the initial bundle
const Categories = lazy(() => import("./pages/Categories"));
const StoreDetail = lazy(() => import("./pages/StoreDetail"));
const Products = lazy(() => import("./pages/Products"));
const ProductDetail = lazy(() => import("./pages/ProductDetail"));
const Cart = lazy(() => import("./pages/Cart"));
const Checkout = lazy(() => import("./pages/Checkout"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Orders = lazy(() => import("./pages/Orders"));
const OrderReceipt = lazy(() => import("./pages/OrderReceipt"));
const Admin = lazy(() => import("./pages/Admin"));
const Profile = lazy(() => import("./pages/Profile"));
const Favorites = lazy(() => import("./pages/Favorites"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const About = lazy(() => import("./pages/About"));
const Help = lazy(() => import("./pages/Help"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ReginaLanding = lazy(() => import("./pages/ReginaLanding"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const StorePage = lazy(() => import("./pages/StorePage"));

// Admin dashboard — heavy, lazy-loaded as a group
const DashboardLayout = lazy(() => import("./components/dashboard/DashboardLayout"));
const DashboardOverview = lazy(() => import("./pages/dashboard/DashboardOverview"));
const DashboardOrders = lazy(() => import("./pages/dashboard/DashboardOrders"));
const DashboardProducts = lazy(() => import("./pages/dashboard/DashboardProducts"));
const DashboardStores = lazy(() => import("./pages/dashboard/DashboardStores"));
const DashboardStoreHours = lazy(() => import("./pages/dashboard/DashboardStoreHours"));
const DashboardUsers = lazy(() => import("./pages/dashboard/DashboardUsers"));
const DashboardBanners = lazy(() => import("./pages/dashboard/DashboardBanners"));
const DashboardBulkImages = lazy(() => import("./pages/dashboard/DashboardBulkImages"));
const DashboardAutoImages = lazy(() => import("./pages/dashboard/DashboardAutoImages"));
const DashboardMatchImages = lazy(() => import("./pages/dashboard/DashboardMatchImages"));
const DashboardInventory = lazy(() => import("./pages/dashboard/DashboardInventory"));
const DashboardImporter = lazy(() => import("./pages/dashboard/DashboardImporter"));
const DashboardSEO = lazy(() => import("./pages/dashboard/DashboardSEO"));
const DashboardPushTest = lazy(() => import("./pages/dashboard/DashboardPushTest"));
const DashboardBlog = lazy(() => import("./pages/dashboard/DashboardBlog"));
const DashboardSecurity = lazy(() => import("./pages/dashboard/DashboardSecurity"));

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
