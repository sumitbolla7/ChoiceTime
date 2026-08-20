import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { categoriesAPI } from '../utils/api';

const Navbar = () => {
  // Context
  const { getCartItemsCount } = useCart();
  const { isAuthenticated, user, logout } = useAuth();
  const { getWishlistCount } = useWishlist();

  // Router
  const location = useLocation();
  const navigate = useNavigate();

  // States
  const [navLinks, setNavLinks] = useState([]);
  const [activeCategory, setActiveCategory] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false); // Mobile search
  const [isDesktopSearchExpanded, setIsDesktopSearchExpanded] = useState(false); // Desktop search animation
  const [expandedMobileCategory, setExpandedMobileCategory] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavHidden, setIsNavHidden] = useState(false);

  // Refs for click outside
  const searchInputRef = useRef(null);
  const lastScrollY = useRef(0);

  // --- EFFECTS ---

  // Fetch nav categories from backend (with localStorage cache for faster loads)
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        // Load from cache first for instant display
        const cached = localStorage.getItem('navCategories');
        if (cached) {
          try {
            const parsedCache = JSON.parse(cached);
            if (parsedCache?.categories?.length) {
              setNavLinks(parsedCache.categories);
            }
          } catch (e) {}
        }
        
        // Fetch fresh data from API
        const res = await categoriesAPI.getCategories();
        if (res.success && res.data?.categories?.length) {
          setNavLinks(res.data.categories);
          // Update cache
          localStorage.setItem('navCategories', JSON.stringify(res.data));
        }
      } catch (err) {
        console.error('Failed to load nav categories:', err);
      }
    };
    fetchCategories();
  }, []);

  // Handle Active Category Highlighting (pathname + query for watches/accessories)
  useEffect(() => {
    const path = location.pathname;
    const search = location.search || '';
    const pathAndSearch = path + search;

    if (path === '/') setActiveCategory('home');
    else if (path.includes('/sale')) setActiveCategory('sale');
    else if (navLinks.length) {
      const foundLink = navLinks.find(link =>
        pathAndSearch === link.path || pathAndSearch.startsWith(link.path + '&')
      );
      setActiveCategory(foundLink ? foundLink.id : '');
    } else {
      setActiveCategory('');
    }

    // Close menus on route change
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname, location.search, navLinks]);

  // Handle Scroll Styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);

      const currentY = window.scrollY;
      const isScrollingDown = currentY > lastScrollY.current;

      // Hide on scroll down logic removed to keep header sticky always
      // if (!isMobileMenuOpen && !isSearchOpen) {
      //   if (isScrollingDown && currentY > 80) {
      //     setIsNavHidden(true);
      //   } else if (!isScrollingDown) {
      //     setIsNavHidden(false);
      //   }
      // }
      setIsNavHidden(false);

      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileMenuOpen, isSearchOpen]);

  // Handle Body Lock
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? 'hidden' : 'unset';
  }, [isMobileMenuOpen]);

  // Handle Click Outside for Desktop Search
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target)) {
        if (!searchQuery) setIsDesktopSearchExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchQuery]);

  // --- HANDLERS ---

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setIsSearchOpen(false);
      setIsDesktopSearchExpanded(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleMobileAccordion = (id) => {
    setExpandedMobileCategory(expandedMobileCategory === id ? null : id);
  };

  return (
    <>
      {/* =======================
         MAIN + SECONDARY NAV (sticky wrapper)
      ======================= */}
      <header
        className="fixed top-0 left-0 right-0 z-50"
      >
        {/* ========== MAIN NAVBAR (Logo + Search + Login + Cart) ========== */}
        <nav
          className={`border-b py-1 transition-all duration-300
          ${isScrolled
              ? 'bg-brown-50 border-gray-500 shadow-sm'
              : 'bg-brown-50 border-gray-400'}`}
        >
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 py-0.5">
            <div className="relative flex items-center justify-between h-24 md:h-52">

              {/* LEFT: Home */}
              <div className="hidden md:flex items-center gap-6">
                <Link
                  to="/"
                  onClick={scrollToTop}
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors
                  ${activeCategory === 'home' ? 'text-black' : 'text-gray-500 hover:text-black'}`}
                >
                  Home
                </Link>
              </div>

              {/* Logo - Left on mobile, Center on desktop */}
              <div className="flex items-center md:absolute md:left-1/2 md:-translate-x-1/2">
                <Link to="/" onClick={scrollToTop} className="flex-shrink-0 group relative z-10">
                  <img
                    src="https://ik.imagekit.io/pyd0fawt1/choice%20logo"
                    alt="choicetime"
                    className="h-30 md:h-42 w-auto object-contain"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                  />
                </Link>
              </div>

              {/* RIGHT: Actions */}
              <div className="flex items-center gap-1 md:gap-4 ml-auto">

                {/* Expandable Desktop Search */}
                <div className="hidden md:flex items-center justify-end" ref={searchInputRef}>
                  <form
                    onSubmit={handleSearch}
                    className={`flex items-center transition-all duration-500 ease-out border rounded-full
                  ${isDesktopSearchExpanded ? 'w-64 px-4 py-1.5 border-gray-300 bg-gray-50' : 'w-10 h-10 border-transparent bg-transparent justify-center cursor-pointer hover:bg-gray-100'}`}
                    onClick={() => !isDesktopSearchExpanded && setIsDesktopSearchExpanded(true)}
                  >
                    <button type="submit" className="text-gray-800">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className={`bg-transparent border-none outline-none text-sm ml-2 w-full transition-all duration-300 ${isDesktopSearchExpanded ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                    />
                    {isDesktopSearchExpanded && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); setIsDesktopSearchExpanded(false); }} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </form>
                </div>

                {/* Mobile Search Icon */}
                <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="md:hidden p-2 text-gray-800">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>


                {/* Account */}
                <div className="hidden md:block">
                  {isAuthenticated ? (
                    <Link to="/profile" className="p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors block">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                    </Link>
                  ) : (
                    <Link to="/login" className="text-xs font-bold text-gray-900 uppercase tracking-wider border border-gray-300 px-4 py-2 rounded-full hover:bg-black hover:text-white transition-colors">
                      Login
                    </Link>
                  )}
                </div>

                {/* Wishlist */}
                <Link to="/wishlist" className="hidden md:block p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364l8.918 8.918a1.5 1.5 0 002.121 0l8.918-8.918a4.5 4.5 0 00-6.364-6.364L12 7.622l-1.591-1.591a4.5 4.5 0 00-6.364 0z" /></svg>
                  {getWishlistCount() > 0 && (
                    <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {getWishlistCount()}
                    </span>
                  )}
                </Link>

                {/* Cart (desktop only - mobile has bottom nav) */}
                <Link to="/cart" className="hidden md:block p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors relative">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  {getCartItemsCount() > 0 && (
                    <span className="absolute top-0 right-0 bg-black text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold">
                      {getCartItemsCount()}
                    </span>
                  )}
                </Link>

                {/* Mobile Menu Toggle (rightmost) */}
                <button
                  className="md:hidden p-2 text-gray-800 hover:bg-gray-100 rounded-full transition-colors"
                  onClick={() => setIsMobileMenuOpen(true)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" /></svg>
                </button>

              </div>
            </div>

            {/* Mobile Search Drawer (Slide Down) */}
            <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${isSearchOpen ? 'max-h-20 opacity-100 py-2' : 'max-h-0 opacity-0'}`}>
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-full bg-gray-100/80 backdrop-blur-sm border-none rounded-full px-5 py-2.5 text-sm focus:ring-1 focus:ring-black outline-none placeholder-gray-500"
                />
                <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                </button>
              </form>
            </div>
          </div>
        </nav>

        {/* ========== SECONDARY NAVBAR - DESKTOP (Categories – only category name, click = go to category) ========== */}
        <nav className="hidden md:block bg-brown-50/90 border-b border-brown-200 backdrop-blur-sm min-w-0">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-12 min-w-0">
            <div className="overflow-x-auto overflow-y-hidden scrollbar-hide touch-pan-x py-1 lg:py-1.5 -mx-1 px-1">
              <div className="flex flex-nowrap items-center justify-center gap-1 lg:gap-2 w-max mx-auto">
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.path}
                  className={`flex-shrink-0 inline-flex items-center px-2 lg:px-2.5 py-0.5 lg:py-1 text-[11px] font-semibold uppercase tracking-wider rounded-md border transition-all whitespace-nowrap
                  ${activeCategory === link.id ? 'text-black bg-white border-gray-400 shadow-sm' : 'text-gray-600 border-gray-300 hover:text-black hover:bg-white/60 hover:border-gray-400'}`}
                >
                  {link.label}
                </Link>
              ))}
              </div>
            </div>
          </div>
        </nav>

        {/* ========== SECONDARY NAVBAR - MOBILE (Horizontal scrollable categories) ========== */}
        <nav className="md:hidden bg-brown-50 border-b border-brown-200">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-1 px-3 py-2 min-w-max">
              <Link
                to="/"
                onClick={scrollToTop}
                className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md border transition-all
                ${activeCategory === 'home' ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-600 border-gray-300'}`}
              >
                Home
              </Link>
              {navLinks.map((link) => (
                <Link
                  key={link.id}
                  to={link.path}
                  className={`flex-shrink-0 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide rounded-md border transition-all
                  ${activeCategory === link.id ? 'bg-black text-white border-black' : 'bg-gray-100 text-gray-600 border-gray-300'}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </nav>
      </header>


      {/* =======================
          MOBILE BOTTOM NAV BAR
      ======================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40">
        <div className="bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] px-2 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
          <div className="flex justify-around items-start max-w-md mx-auto">

            {/* Home */}
            <Link to="/" onClick={scrollToTop} className="flex flex-col items-center min-w-[3.5rem] group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${activeCategory === 'home' ? 'text-black' : 'text-gray-400 group-active:scale-90'}`}>
                {activeCategory === 'home' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-black rounded-full"></span>}
                <svg className="w-[22px] h-[22px]" fill={activeCategory === 'home' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={activeCategory === 'home' ? 0 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${activeCategory === 'home' ? 'text-black font-semibold' : 'text-gray-400'}`}>Home</span>
            </Link>

            {/* Categories */}
            <button onClick={() => setIsMobileMenuOpen(true)} className="flex flex-col items-center min-w-[3.5rem] group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${isMobileMenuOpen ? 'text-black' : 'text-gray-400 group-active:scale-90'}`}>
                {isMobileMenuOpen && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-black rounded-full"></span>}
                <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${isMobileMenuOpen ? 'text-black font-semibold' : 'text-gray-400'}`}>Shop</span>
            </button>

            {/* Wishlist */}
            <Link to="/wishlist" className="flex flex-col items-center min-w-[3.5rem] group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${location.pathname === '/wishlist' ? 'text-red-500' : 'text-gray-400 group-active:scale-90'}`}>
                {location.pathname === '/wishlist' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-red-500 rounded-full"></span>}
                <svg className="w-[22px] h-[22px]" fill={location.pathname === '/wishlist' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={location.pathname === '/wishlist' ? 0 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 13.5 9 13.5s9-6.28 9-13.5z" />
                </svg>
                {getWishlistCount() > 0 && (
                  <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[8px] min-w-[16px] h-4 flex items-center justify-center rounded-full font-bold px-1 ring-2 ring-white">
                    {getWishlistCount()}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${location.pathname === '/wishlist' ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>Wishlist</span>
            </Link>

            {/* Cart */}
            <Link to="/cart" className="flex flex-col items-center min-w-[3.5rem] group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${location.pathname === '/cart' ? 'text-black' : 'text-gray-400 group-active:scale-90'}`}>
                {location.pathname === '/cart' && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-black rounded-full"></span>}
                <svg className="w-[22px] h-[22px]" fill={location.pathname === '/cart' ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={location.pathname === '/cart' ? 0 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.461 1.119 1.007zM8.25 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15.75 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                </svg>
                {getCartItemsCount() > 0 && (
                  <span className="absolute -top-0.5 -right-1 bg-black text-white text-[8px] min-w-[16px] h-4 flex items-center justify-center rounded-full font-bold px-1 ring-2 ring-white">
                    {getCartItemsCount()}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${location.pathname === '/cart' ? 'text-black font-semibold' : 'text-gray-400'}`}>Cart</span>
            </Link>

            {/* Account */}
            <Link to={isAuthenticated ? "/profile" : "/login"} className="flex flex-col items-center min-w-[3.5rem] group">
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${['/profile', '/login'].includes(location.pathname) ? 'text-black' : 'text-gray-400 group-active:scale-90'}`}>
                {['/profile', '/login'].includes(location.pathname) && <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-black rounded-full"></span>}
                <svg className="w-[22px] h-[22px]" fill={['/profile', '/login'].includes(location.pathname) ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={['/profile', '/login'].includes(location.pathname) ? 0 : 1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${['/profile', '/login'].includes(location.pathname) ? 'text-black font-semibold' : 'text-gray-400'}`}>Account</span>
            </Link>

          </div>
        </div>
      </div>


      {/* =======================
          MOBILE SIDE DRAWER
      ======================== */}
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-500 md:hidden ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible pointer-events-none'}`}
        onClick={() => setIsMobileMenuOpen(false)}
      ></div>

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-[61] w-[80%] max-w-xs bg-brown-50 transform transition-transform duration-500 cubic-bezier(0.19, 1, 0.22, 1) flex flex-col md:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header with brand logo (matches navbar) */}
          <div className="p-6 pt-10 flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Link to="/" onClick={() => { setIsMobileMenuOpen(false); scrollToTop(); }}>
                <img
                  src="https://ik.imagekit.io/pyd0fawt1/choice%20logo"
                  alt="choicetime"
                  className="h-16 w-auto object-contain"
                  loading="eager"
                  decoding="async"
                />
              </Link>
              {isAuthenticated && <p className="text-xs text-gray-500 mt-1">Hello, {user?.name}</p>}
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-2 text-gray-400 hover:text-black">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Auth quick actions */}
          <div className="px-6 pb-4 flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-white bg-gray-900 rounded-lg shadow-sm hover:bg-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  Profile
                </Link>
                <button
                  onClick={() => { logout(); setIsMobileMenuOpen(false); }}
                  className="flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-3 text-center text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg hover:border-gray-400 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 py-3 text-center text-sm font-bold text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

            {/* Main Links */}
            <div className="space-y-4">
              <Link to="/" className="block text-2xl font-light tracking-tight text-gray-900" onClick={() => { setIsMobileMenuOpen(false); scrollToTop(); }}>Home</Link>
              <Link to="/wishlist" className="block text-2xl font-light tracking-tight text-gray-900 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                Wishlist
                {getWishlistCount() > 0 && (
                  <span className="bg-red-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold">
                    {getWishlistCount()}
                  </span>
                )}
              </Link>
            </div>

            <div className="w-12 h-px bg-gray-200"></div>

            {/* Categories */}
            <div className="space-y-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Shop Categories</p>
              {navLinks.map((link) => (
                <div key={link.id} className="border-b border-gray-100 last:border-0">
                  <button
                    onClick={() => toggleMobileAccordion(link.id)}
                    className="w-full flex items-center justify-between py-4 text-base font-medium text-gray-800"
                  >
                    <span>{link.label}</span>
                    <svg className={`w-4 h-4 transition-transform duration-300 ${expandedMobileCategory === link.id ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                  </button>

                  <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expandedMobileCategory === link.id ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'}`}>
                    <div className="pl-4 space-y-3">
                      {link.subItems.map((sub, idx) => (
                        <Link
                          key={idx}
                          to={sub.path}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="block text-sm text-gray-500 hover:text-black"
                        >
                          {sub.name}
                        </Link>
                      ))}
                      <Link to={link.path} onClick={() => setIsMobileMenuOpen(false)} className="block text-sm font-bold text-black pt-2">Shop All</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-gray-100 bg-gray-50">
            {isAuthenticated ? (
              <button onClick={() => { logout(); setIsMobileMenuOpen(false); }} className="w-full py-3 text-sm font-bold text-red-600 border border-red-200 bg-white rounded-lg">
                Sign Out
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link to="/login" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-center text-sm font-bold text-gray-900 bg-white border border-gray-200 rounded-lg">Login</Link>
                <Link to="/signup" onClick={() => setIsMobileMenuOpen(false)} className="py-3 text-center text-sm font-bold text-white bg-black rounded-lg">Sign Up</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
