import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/hooks/useCart";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Stores from "./pages/Stores";
import Categories from "./pages/Categories";
import StoreDetail from "./pages/StoreDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderConfirmation from "./pages/OrderConfirmation";
import HowItWorks from "./pages/HowItWorks";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Orders from "./pages/Orders";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import Onboarding from "./pages/Onboarding";
import OnboardingGate from "./components/OnboardingGate";
import AgeGate from "./components/AgeGate";
import PushNotificationsMount from "./components/PushNotificationsMount";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import DashboardOverview from "./pages/dashboard/DashboardOverview";
import DashboardOrders from "./pages/dashboard/DashboardOrders";
import DashboardProducts from "./pages/dashboard/DashboardProducts";
import DashboardStores from "./pages/dashboard/DashboardStores";
import DashboardStoreHours from "./pages/dashboard/DashboardStoreHours";
import DashboardUsers from "./pages/dashboard/DashboardUsers";
import DashboardBanners from "./pages/dashboard/DashboardBanners";
import DashboardBulkImages from "./pages/dashboard/DashboardBulkImages";
import DashboardAutoImages from "./pages/dashboard/DashboardAutoImages";
import DashboardMatchImages from "./pages/dashboard/DashboardMatchImages";
import DashboardInventory from "./pages/dashboard/DashboardInventory";
import DashboardImporter from "./pages/dashboard/DashboardImporter";
import DashboardSEO from "./pages/dashboard/DashboardSEO";
import DashboardPushTest from "./pages/dashboard/DashboardPushTest";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AgeGate />
            <OnboardingGate />
            <PushNotificationsMount />
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
              <Route path="/how-it-works" element={<HowItWorks />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/favorites" element={<Favorites />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/terms" element={<Terms />} />

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
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </CartProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;