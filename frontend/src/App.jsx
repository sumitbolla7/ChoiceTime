import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { CartProvider } from './context/CartContext';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import { ToastProvider } from './components/ToastContainer';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScratchCardPopup from './components/ScratchCardPopup';
import { scratchCardAPI } from './utils/api';
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ProductDetail from './pages/ProductDetail';
import SpecialCollection from './pages/SpecialCollection';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import LoginOTP from './pages/LoginOTP';
import SignUp from './pages/SignUp';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ContactUs from './pages/ContactUs';
import FAQ from './pages/FAQ';
import ShippingInfo from './pages/ShippingInfo';
import Returns from './pages/Returns';
import TrackOrder from './pages/TrackOrder';
import SizeGuide from './pages/SizeGuide';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import OrderSuccess from './pages/OrderSuccess';
import OrderDetail from './pages/OrderDetail';
import SearchResults from './pages/SearchResults';
import Wishlist from './pages/Wishlist';
import RecentlyViewed from './pages/RecentlyViewed';
import ProductComparison from './pages/ProductComparison';
import CookieConsent from './components/CookieConsent';
import ErrorBoundary from './components/ErrorBoundary';
import BackToTop from './components/BackToTop';
import Maintenance from './pages/Maintenance';

// ─── Set to false to turn off maintenance mode ───
const MAINTENANCE_MODE = true;

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Show maintenance page for all non-admin routes
  if (MAINTENANCE_MODE && !isAdminRoute) return <Maintenance />;

  const [showScratchCard, setShowScratchCard] = useState(false);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname, location.search]);

  // Show scratch card popup only when active (admin can turn off in Coupons section)
  useEffect(() => {
    if (isAdminRoute) return;
    const dismissed = localStorage.getItem('scratchCardDismissed');
    const cooldown = 24 * 60 * 60 * 1000; // 24 hours
    if (dismissed && Date.now() - Number(dismissed) < cooldown) return;
    let cancelled = false;
    scratchCardAPI.getPopupActive().then((res) => {
      if (cancelled) return;
      if (res?.success && res?.data?.active === true) setShowScratchCard(true);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isAdminRoute]);

  return (
    <div className="min-h-screen bg-brown-50 flex flex-col">
      {!isAdminRoute && <Navbar />}
      {showScratchCard && <ScratchCardPopup onClose={() => setShowScratchCard(false)} />}
      <main className={`flex-grow ${!isAdminRoute ? 'pt-[100px] md:pt-[110px] pb-20 md:pb-0' : ''}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/new-arrival" element={<SpecialCollection type="new-arrival" />} />
          <Route path="/sale" element={<SpecialCollection type="sale" />} />
          <Route path="/product/:category/:id" element={<ProductDetail />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/login" element={<Login />} />
          <Route path="/login-otp" element={<LoginOTP />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/shipping" element={<ShippingInfo />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/track-order" element={<TrackOrder />} />
          <Route path="/size-guide" element={<SizeGuide />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/orders/:orderId" element={<OrderDetail />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/recently-viewed" element={<RecentlyViewed />} />
          <Route path="/compare" element={<ProductComparison />} />
          {/* Dynamic category route - handles all categories from database */}
          <Route path="/:slug" element={<CategoryPage />} />
        </Routes>
      </main>
      {!isAdminRoute && <Footer />}
      {!isAdminRoute && <CookieConsent />}
      {!isAdminRoute && <BackToTop />}
    </div>
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

const AppProviders = ({ children }) =>
  googleClientId ? (
    <GoogleOAuthProvider clientId={googleClientId}>{children}</GoogleOAuthProvider>
  ) : (
    children
  );

function App() {
  return (
    <ErrorBoundary>
      <AppProviders>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <ToastProvider>
              <Router>
                <AppContent />
              </Router>
            </ToastProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
      </AppProviders>
    </ErrorBoundary>
  );
}

export default App;
