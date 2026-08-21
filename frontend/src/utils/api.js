// Ensure API_BASE_URL always ends with /api if not already present
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    // If env var is set, ensure it ends with /api
    return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
  }
  // Default to production API
  return 'https://api.choicetime.in/api';
};

const API_BASE_URL = getApiBaseUrl();

const API_CACHE_PREFIX = 'ct_api_cache:';
const memoryGetCache = new Map();

const getCacheKey = (url) => `${API_CACHE_PREFIX}${url}`;

const readGetCache = (key, ttlMs) => {
  const now = Date.now();
  const inMemory = memoryGetCache.get(key);
  if (inMemory && now - inMemory.ts <= ttlMs) return inMemory.data;

  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.ts !== 'number') return null;
    if (now - parsed.ts > ttlMs) {
      sessionStorage.removeItem(key);
      return null;
    }
    memoryGetCache.set(key, parsed);
    return parsed.data;
  } catch {
    return null;
  }
};

const writeGetCache = (key, data) => {
  const payload = { ts: Date.now(), data };
  memoryGetCache.set(key, payload);
  try {
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore storage quota/private mode failures.
  }
};

const clearGetCache = (substring = '') => {
  for (const key of [...memoryGetCache.keys()]) {
    if (!substring || key.includes(substring)) memoryGetCache.delete(key);
  }
  try {
    Object.keys(sessionStorage).forEach((k) => {
      if (k.startsWith(API_CACHE_PREFIX) && (!substring || k.includes(substring))) {
        sessionStorage.removeItem(k);
      }
    });
  } catch {
    // Ignore storage access failures.
  }
};

// Helper function to make API requests
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('token');
  const { cache: cacheConfig, ...requestOptions } = options;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...requestOptions.headers,
    },
    ...requestOptions,
  };

  try {
    // Ensure endpoint starts with / for proper URL construction
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = `${API_BASE_URL}${normalizedEndpoint}`;
    const method = (requestOptions.method || 'GET').toUpperCase();
    const canUseCache = method === 'GET' && cacheConfig?.ttlMs > 0;

    if (canUseCache) {
      const cacheKey = getCacheKey(fullUrl);
      const cached = readGetCache(cacheKey, cacheConfig.ttlMs);
      if (cached) return cached;
    }
    
    // Debug log in development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${method} ${fullUrl}`);
    }
    
    const response = await fetch(fullUrl, config);
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON (e.g., HTML error page), read as text for better error message
      const text = await response.text();
      console.error(`Non-JSON response from ${endpoint}:`, text.substring(0, 200));
      
      // Create a meaningful error
      const error = new Error(
        response.status === 404 
          ? `Route not found: ${endpoint}` 
          : `Server returned ${response.status}: ${response.statusText}`
      );
      error.response = { 
        status: response.status, 
        statusText: response.statusText,
        data: { message: `Expected JSON but received ${contentType || 'unknown content type'}` }
      };
      throw error;
    }

    if (!response.ok) {
      // Create error with response data attached
      const error = new Error(data.message || 'Something went wrong');
      error.response = { data, status: response.status };
      throw error;
    }

    if (canUseCache) {
      writeGetCache(getCacheKey(fullUrl), data);
    }

    if (method !== 'GET' && normalizedEndpoint.toLowerCase().includes('product')) {
      clearGetCache('/products');
    }

    return data;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.response) {
      throw error;
    }
    // Otherwise, wrap it
    throw error;
  }
};

// Auth API calls
export const authAPI = {
  signup: async (userData) => {
    return apiRequest('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  login: async (email, password) => {
    return apiRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  sendOTP: async (phone) => {
    return apiRequest('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },

  verifyOTP: async (phone, otp, name = null, email = null) => {
    return apiRequest('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone, otp, name, email }),
    });
  },

  googleLogin: async (credential) => {
    return apiRequest('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
  },

  getMe: async () => {
    return apiRequest('/auth/me');
  },
};

// Cart API calls
export const cartAPI = {
  getCart: async () => {
    return apiRequest('/cart');
  },

  addToCart: async (product, quantity = 1, size = '', color = '', boxType = '', boxPrice = 0) => {
    return apiRequest('/cart/add', {
      method: 'POST',
      body: JSON.stringify({ product, quantity, size, color, boxType, boxPrice }),
    });
  },

  updateCartItem: async (itemId, quantity) => {
    return apiRequest(`/cart/update/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    });
  },

  removeFromCart: async (itemId) => {
    return apiRequest(`/cart/remove/${itemId}`, {
      method: 'DELETE',
    });
  },

  clearCart: async () => {
    return apiRequest('/cart/clear', {
      method: 'DELETE',
    });
  },
};

// Order API calls
export const orderAPI = {
  getOrders: async () => {
    return apiRequest('/orders');
  },

  getOrder: async (orderId) => {
    return apiRequest(`/orders/${orderId}`);
  },
  cancelOrder: async (orderId, payloadOrReason) => {
    const body =
      typeof payloadOrReason === 'string'
        ? { reason: payloadOrReason }
        : (payloadOrReason || {});
    return apiRequest(`/orders/${orderId}/cancel`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  createOrder: async (shippingAddress, paymentMethod = 'COD', couponCode = '', extras = {}) => {
    return apiRequest('/orders/create', {
      method: 'POST',
      body: JSON.stringify({ shippingAddress, paymentMethod, couponCode, ...extras }),
    });
  },
};

// Payment API calls
export const paymentAPI = {
  getCodAdvanceConfig: async () => apiRequest('/payment/cod-advance'),

  /**
   * Full prepay: pass { shippingAddress, couponCode }.
   * COD advance: pass { purpose: 'cod_advance', shippingAddress }.
   * (Also still accepts a raw shippingAddress object for backward compatibility.)
   */
  createRazorpayOrder: async (payload) => {
    const isCodAdvance = payload && typeof payload === 'object' && payload.purpose === 'cod_advance';

    let body;
    if (isCodAdvance) {
      body = { purpose: 'cod_advance', shippingAddress: payload.shippingAddress };
    } else if (payload && typeof payload === 'object' && 'shippingAddress' in payload) {
      body = { shippingAddress: payload.shippingAddress, couponCode: payload.couponCode || '' };
    } else {
      // Backward-compatible fallback: a raw address object was passed directly
      body = { shippingAddress: payload };
    }

    return apiRequest('/payment/create-order', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  verifyPayment: async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    return apiRequest('/payment/verify-payment', {
      method: 'POST',
      body: JSON.stringify({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
      }),
    });
  },
};

// Profile API calls
export const profileAPI = {
  getProfile: async () => {
    return apiRequest('/profile');
  },

  updateProfile: async (data) => {
    return apiRequest('/profile/update', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};

// Categories API (public - for nav)
export const categoriesAPI = {
  getCategories: async () => apiRequest('/categories', { cache: { ttlMs: 5 * 60 * 1000 } }),
};

// Settings API (public)
export const settingsAPI = {
  getShippingConfig: async () => apiRequest('/settings/shipping'),
};

// Reels (public - home page trending reels; admin uses adminAPI.getReels)
export const reelAPI = {
  getPublicReels: async () => apiRequest('/reels', { cache: { ttlMs: 2 * 60 * 1000 } }),
};

// Product API calls (single products collection: GET /api/products?category=... & GET /api/products/:id)
export const productAPI = {
  getProducts: async (category, params = {}) => {
    const q = new URLSearchParams({ ...params, ...(category && { category }) }).toString();
    return apiRequest(`/products${q ? `?${q}` : ''}`, { cache: { ttlMs: 2 * 60 * 1000 } });
  },

  /** Per-category sections for home: top sellers from orders, random fallback if no sales */
  getHomeTopSelling: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiRequest(`/products/home-top-selling${q ? `?${q}` : ''}`, { cache: { ttlMs: 2 * 60 * 1000 } });
  },

  getProductById: async (id) => {
    return apiRequest(`/products/${id}`, { cache: { ttlMs: 5 * 60 * 1000 } });
  },

  getWatches: async (params = {}) => productAPI.getProducts('watches', params),
  getWatchById: async (id) => productAPI.getProductById(id),

  getLenses: async (params = {}) => productAPI.getProducts('lens', params),
  getLensById: async (id) => productAPI.getProductById(id),

  getAccessories: async (params = {}) => productAPI.getProducts('accessories', params),
  getAccessoryById: async (id) => productAPI.getProductById(id),

  getMenItems: async (params = {}) => productAPI.getProducts('men', params),
  getMenItemById: async (id) => productAPI.getProductById(id),

  getWomenItems: async (params = {}) => productAPI.getProducts('women', params),
  getWomenItemById: async (id) => productAPI.getProductById(id),

  getAllProducts: async (params = {}) => {
    try {
      const [watches, lenses, accessories, men, women] = await Promise.all([
        productAPI.getWatches(params),
        productAPI.getLenses(params),
        productAPI.getAccessories(params),
        productAPI.getMenItems(params),
        productAPI.getWomenItems(params),
      ]);
      const allProducts = [
        ...(watches.success ? watches.data.products : []),
        ...(lenses.success ? lenses.data.products : []),
        ...(accessories.success ? accessories.data.products : []),
        ...(men.success ? men.data.products : []),
        ...(women.success ? women.data.products : []),
      ];
      return { success: true, data: { products: allProducts } };
    } catch (error) {
      return { success: false, message: error.message, data: { products: [] } };
    }
  },
};

export const adminAPI = {
  getSummary: async () => apiRequest('/admin/summary'),
  getOrders: async () => apiRequest('/admin/orders'),
  updateOrderStatus: async (orderId, status) =>
    apiRequest(`/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  updateOrderParcelGuruReference: async (orderId, orderReference) =>
    apiRequest(`/admin/orders/${orderId}/parcel-guru-reference`, {
      method: 'PATCH',
      body: JSON.stringify({ orderReference }),
    }),
  deleteOrder: async (orderId) =>
    apiRequest(`/admin/orders/${orderId}`, { method: 'DELETE' }),
  getProducts: async (category) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest(`/admin/products${query}`);
  },
  createProduct: async (payload) =>
    apiRequest('/admin/products', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduct: async (id, payload) =>
    apiRequest(`/admin/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteProduct: async (id, category) => {
    const query = category ? `?category=${encodeURIComponent(category)}` : '';
    return apiRequest(`/admin/products/${id}${query}`, { method: 'DELETE' });
  },
  getUsers: async () => apiRequest('/admin/users'),
  deleteUser: async (userId) =>
    apiRequest(`/admin/users/${userId}`, { method: 'DELETE' }),
  getReviews: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiRequest(`/admin/reviews${query ? `?${query}` : ''}`);
  },
  deleteReview: async (id) =>
    apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' }),
  getCategories: async () => apiRequest('/admin/categories'),
  createCategory: async (payload) =>
    apiRequest('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCategory: async (id, payload) =>
    apiRequest(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCategory: async (id) =>
    apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
  
  // Coupon management
  getCoupons: async () => apiRequest('/coupons/admin'),
  createCoupon: async (payload) =>
    apiRequest('/coupons/admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateCoupon: async (id, payload) =>
    apiRequest(`/coupons/admin/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteCoupon: async (id) =>
    apiRequest(`/coupons/admin/${id}`, { method: 'DELETE' }),
  toggleCoupon: async (id) =>
    apiRequest(`/coupons/admin/${id}/toggle`, { method: 'PATCH' }),

  // Reel management
  getReels: async () => apiRequest('/reels/admin'),
  createReel: async (payload) =>
    apiRequest('/reels', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateReel: async (id, payload) =>
    apiRequest(`/reels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteReel: async (id) =>
    apiRequest(`/reels/${id}`, { method: 'DELETE' }),
  toggleReelStatus: async (id) =>
    apiRequest(`/reels/${id}/toggle`, { method: 'PATCH' }),

  // Shipping & Returns (product page policies)
  getShippingReturns: async () => apiRequest('/admin/shipping-returns'),
  createShippingReturn: async (payload) =>
    apiRequest('/admin/shipping-returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateShippingReturn: async (id, payload) =>
    apiRequest(`/admin/shipping-returns/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteShippingReturn: async (id) =>
    apiRequest(`/admin/shipping-returns/${id}`, { method: 'DELETE' }),

  getReturns: async () => apiRequest('/admin/returns'),
  getScratchCardPopupActive: async () => apiRequest('/admin/settings/scratch-card-popup'),
  updateScratchCardPopupActive: async (active) =>
    apiRequest('/admin/settings/scratch-card-popup', {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    }),
  getOrderTimeline: async () => apiRequest('/admin/settings/order-timeline'),
  updateOrderTimeline: async (payload) =>
    apiRequest('/admin/settings/order-timeline', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  getShippingConfig: async () => apiRequest('/admin/settings/shipping'),
  updateShippingConfig: async (payload) =>
    apiRequest('/admin/settings/shipping', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
  updateReturnStatus: async (id, payload) =>
    apiRequest(`/admin/returns/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),
};

// Review API calls
export const reviewAPI = {
  getReviews: async (productId, sort = 'newest', limit = 50) => {
    return apiRequest(`/reviews/${productId}?sort=${sort}&limit=${limit}`);
  },

  createReview: async (reviewData) => {
    return apiRequest('/reviews', {
      method: 'POST',
      body: JSON.stringify(reviewData),
    });
  },

  markHelpful: async (reviewId) => {
    return apiRequest(`/reviews/${reviewId}/helpful`, {
      method: 'PUT',
    });
  },
};

// Wishlist API calls
export const wishlistAPI = {
  getWishlist: async () => {
    return apiRequest('/wishlist');
  },

  addToWishlist: async (productId) => {
    return apiRequest('/wishlist/add', {
      method: 'POST',
      body: JSON.stringify({ productId }),
    });
  },

  removeFromWishlist: async (productId) => {
    return apiRequest(`/wishlist/remove/${productId}`, {
      method: 'DELETE',
    });
  },

  checkWishlist: async (productId) => {
    return apiRequest(`/wishlist/check/${productId}`);
  },
};

// Scratch Card API
export const scratchCardAPI = {
  getPopupActive: async () => apiRequest('/scratch-card/popup-active'),
  scratch: async (phone) => {
    return apiRequest('/scratch-card/scratch', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  },
};

// Coupon API calls
export const couponAPI = {
  validate: async (code, cartTotal) => {
    return apiRequest('/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, cartTotal }),
    });
  },
  getAvailable: async () => {
    return apiRequest('/coupons/available');
  },
};

// Search API calls
export const searchAPI = {
  searchProducts: async (query, params = {}) => {
    const queryString = new URLSearchParams({ q: query, ...params }).toString();
    return apiRequest(`/search?${queryString}`);
  },
};

// Shipping & Returns (public - for product page)
export const shippingReturnAPI = {
  getPolicies: async () => apiRequest('/shipping-returns'),
};

// Order timeline config (public - for Order Success page)
export const getOrderTimelineConfig = async () => apiRequest('/settings/order-timeline');
export const getShippingConfig = async () => apiRequest('/settings/shipping');

// Return requests (user)
export const returnsAPI = {
  getMyReturns: async () => apiRequest('/returns'),
  createReturn: async (payload) =>
    apiRequest('/returns', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  checkReturn: async (orderId) => apiRequest(`/returns/check/${orderId}`),
};

// Order Tracking API calls
export const trackingAPI = {
  trackOrder: async (orderId) => {
    return apiRequest(`/orders/track/${orderId}`);
  },
};

export default apiRequest;
