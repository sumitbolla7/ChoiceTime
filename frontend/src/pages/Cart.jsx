import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { couponAPI, getShippingConfig as getShippingConfigAPI } from '../utils/api';
import { handleImageError } from '../utils/imageFallback';

// --- Premium Icons ---
const IconTrash = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const IconMinus = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 12H4" />
  </svg>
);
const IconPlus = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v16m8-8H4" />
  </svg>
);
const IconLock = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);
const IconCheck = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
  </svg>
);
const IconArrowLeft = (props) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, getCartTotal } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [showCouponList, setShowCouponList] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [shippingConfig, setShippingConfig] = useState({
    freeShippingThreshold: 2000,
    shippingCharge: 50,
  });

  // Shipping rule: free above threshold, else fixed charge
  const cartTotal = getCartTotal();
  const freeShippingThreshold = Number(shippingConfig.freeShippingThreshold) || 2000;
  const shippingCharge = Number(shippingConfig.shippingCharge) || 0;
  const discountedSubtotal = Math.max(0, cartTotal - couponDiscount);
  const shippingAmount = discountedSubtotal > freeShippingThreshold ? 0 : shippingCharge;
  const finalTotal = discountedSubtotal + shippingAmount;
  const progress = Math.min((cartTotal / freeShippingThreshold) * 100, 100);
  const remainingForFreeShip = freeShippingThreshold - cartTotal;

  useEffect(() => {
    const loadShippingConfig = async () => {
      try {
        const res = await getShippingConfigAPI();
        if (res?.success && res?.data) {
          setShippingConfig({
            freeShippingThreshold: Number(res.data.freeShippingThreshold ?? 2000) || 2000,
            shippingCharge: Number(res.data.shippingCharge ?? 50) || 0,
          });
        }
      } catch (e) {
        console.error('Error loading shipping config:', e);
      }
    };
    loadShippingConfig();
  }, []);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    if (!isAuthenticated) {
      setCouponError('Please login to apply coupon');
      return;
    }
    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');
    try {
      const response = await couponAPI.validate(couponCode.trim(), cartTotal);
      if (response.success) {
        setCouponDiscount(response.data.discount);
        setAppliedCoupon(response.data);
        setCouponSuccess(`Coupon applied! You save ₹${response.data.discount}`);
        setCouponError('');
        // Store coupon in sessionStorage so checkout can use it
        sessionStorage.setItem('appliedCoupon', JSON.stringify(response.data));
      }
    } catch (error) {
      setCouponError(error.message || 'Invalid coupon code');
      setCouponDiscount(0);
      setAppliedCoupon(null);
      sessionStorage.removeItem('appliedCoupon');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponDiscount(0);
    setAppliedCoupon(null);
    setCouponError('');
    setCouponSuccess('');
    sessionStorage.removeItem('appliedCoupon');
  };

  const handleShowCoupons = async () => {
    if (!isAuthenticated) {
      setCouponError('Please login to view coupons');
      return;
    }
    setShowCouponList(true);
    setLoadingCoupons(true);
    try {
      const response = await couponAPI.getAvailable();
      if (response.success) {
        setAvailableCoupons(response.data.coupons || []);
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
    } finally {
      setLoadingCoupons(false);
    }
  };

  const handleSelectCoupon = (code) => {
    setCouponCode(code);
    setShowCouponList(false);
    // Auto-apply
    setCouponLoading(true);
    setCouponError('');
    setCouponSuccess('');
    couponAPI.validate(code, cartTotal).then((response) => {
      if (response.success) {
        setCouponDiscount(response.data.discount);
        setAppliedCoupon(response.data);
        setCouponSuccess(`Coupon applied! You save ₹${response.data.discount}`);
        sessionStorage.setItem('appliedCoupon', JSON.stringify(response.data));
      }
    }).catch((err) => {
      setCouponError(err.message || 'Invalid coupon code');
      setCouponDiscount(0);
      setAppliedCoupon(null);
      sessionStorage.removeItem('appliedCoupon');
    }).finally(() => {
      setCouponLoading(false);
    });
  };

  // --- Professional Empty State ---
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-brown-50 flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Your shopping bag is empty</h1>
        <p className="text-gray-600 mb-8 text-center max-w-sm text-sm">
          Add items to your bag to continue shopping.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brown-50 font-sans text-brown-800 pb-20">

      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <IconArrowLeft className="w-4 h-4 mr-1.5" />
            Continue Shopping
          </Link>

          <div className="hidden md:flex items-center space-x-2 text-xs font-medium">
            <span className="text-gray-900">Shopping Bag</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">Checkout</span>
            <span className="text-gray-300">•</span>
            <span className="text-gray-500">Payment</span>
          </div>

          <div className="flex items-center text-xs font-medium text-gray-500">
            <IconLock className="w-3.5 h-3.5 mr-1.5" />
            Secure Checkout
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-1">Shopping Bag</h1>
          <p className="text-sm text-gray-600">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-10 items-start">

          {/* --- LEFT COLUMN: Cart Items --- */}
          <div className="lg:col-span-8">

            {/* Professional Shipping Progress Bar */}
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">
                  {remainingForFreeShip > 0
                    ? `Add ₹${remainingForFreeShip.toLocaleString()} more for free shipping`
                    : "✓ Free shipping unlocked"}
                </span>
                {remainingForFreeShip > 0 && (
                  <span className="text-xs font-semibold text-gray-600">{Math.round(progress)}%</span>
                )}
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all duration-1000 ease-out ${remainingForFreeShip > 0 ? 'bg-gray-700' : 'bg-green-600'
                    }`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Desktop Header */}
              <div className="hidden sm:grid grid-cols-12 gap-4 px-6 py-3.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                <div className="col-span-6">Product</div>
                <div className="col-span-3 text-center">Quantity</div>
                <div className="col-span-3 text-right">Total</div>
              </div>

              <div className="divide-y divide-gray-100">
                {cart.map((item) => {
                  const product = item.product || item;
                  const itemId = item._id || item.id;

                  // Normalize image - handle both images array and single image
                  const productImage = product.images?.length
                    ? product.images[0]
                    : product.image || product.thumbnail || '';

                  // Normalize price
                  const productPrice = product.price || product.finalPrice || 0;
                  const boxPrice = Number(item.boxPrice) || 0;
                  const itemUnitPrice = productPrice + boxPrice;

                  return (
                    <div key={itemId} className="p-5 sm:p-6 border-b border-gray-100 last:border-0 hover:bg-gray-50/30 transition-colors">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">

                        {/* Product Info (Col 6) */}
                        <div className="sm:col-span-6 flex gap-4">
                          <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-200">
                            <img
                              src={productImage}
                              alt={product.name || 'Product'}
                              className="w-full h-full object-cover"
                              onError={(e) => handleImageError(e, 200, 200)}
                            />
                          </div>
                          <div className="flex flex-col justify-center min-w-0 flex-1">
                            <h3 className="text-sm sm:text-base font-medium text-gray-900 truncate">
                              <Link to={`/product/${product.category || 'shop'}/${itemId}`} className="hover:text-gray-600 transition-colors">
                                {product.name || 'Product'}
                              </Link>
                            </h3>
                            {product.brand && (
                              <p className="mt-0.5 text-xs sm:text-sm text-gray-500">{product.brand}</p>
                            )}
                            {(item.size || item.color || item.boxType) && (
                              <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5">
                                {item.size && <span className="text-xs text-gray-500">Size: <span className="font-medium text-gray-700">{item.size}</span></span>}
                                {(item.color || item.selectedColor) && (
                        <span className="text-xs font-bold text-purple-900 bg-purple-100 border border-purple-200 px-2 py-0.5 rounded">
                          Color: {item.color || item.selectedColor}
                        </span>
                      )}
                                {item.boxType && <span className="text-xs text-gray-500">Box: <span className="font-medium text-gray-700">{item.boxType}{boxPrice > 0 ? ` (+₹${boxPrice})` : ''}</span></span>}
                              </div>
                            )}
                            <p className="mt-1 text-sm font-semibold text-gray-900">₹{itemUnitPrice.toLocaleString()}</p>
                            {/* Mobile Only Remove */}
                            <button
                              onClick={() => removeFromCart(itemId)}
                              className="sm:hidden mt-2 text-xs text-red-600 font-medium flex items-center hover:text-red-700"
                            >
                              <IconTrash className="w-3 h-3 mr-1" /> Remove
                            </button>
                          </div>
                        </div>

                        {/* Quantity (Col 3) */}
                        <div className="sm:col-span-3 flex justify-start sm:justify-center">
                          <div className="flex items-center border border-gray-300 rounded-md h-9 w-28">
                            <button
                              onClick={() => updateQuantity(itemId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-9 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors border-r border-gray-300"
                            >
                              <IconMinus className="w-3.5 h-3.5" />
                            </button>
                            <span className="flex-1 text-center text-sm font-semibold text-gray-900">{item.quantity}</span>
                            <button
                              onClick={() => updateQuantity(itemId, item.quantity + 1)}
                              className="w-9 h-full flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors border-l border-gray-300"
                            >
                              <IconPlus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Price & Remove (Col 3) */}
                        <div className="sm:col-span-3 flex flex-row sm:flex-col justify-between sm:justify-center items-center sm:items-end gap-2">
                          <span className="text-sm sm:hidden font-medium text-gray-600">Total:</span>
                          <div className="text-right">
                            <p className="text-base sm:text-lg font-semibold text-gray-900">₹{(itemUnitPrice * item.quantity).toLocaleString()}</p>
                            <button
                              onClick={() => removeFromCart(itemId)}
                              className="hidden sm:flex items-center justify-end mt-2 text-xs text-gray-500 hover:text-red-600 transition-colors"
                            >
                              <IconTrash className="w-3 h-3 mr-1" /> Remove
                            </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* --- Professional RIGHT COLUMN: Summary --- */}
          <div className="lg:col-span-4 mt-8 lg:mt-0">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 lg:sticky lg:top-32">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 pb-4 border-b border-gray-200">Order Summary</h2>

              <dl className="space-y-3.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Subtotal</dt>
                  <dd className="font-medium text-gray-900">₹{cartTotal.toLocaleString()}</dd>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between items-center">
                    <dt className="flex items-center text-green-600">
                      <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Coupon ({appliedCoupon?.code})
                    </dt>
                    <dd className="font-medium text-green-600">-₹{couponDiscount.toLocaleString()}</dd>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <dt className="flex items-center text-gray-600">
                    Shipping
                    {remainingForFreeShip <= 0 && <IconCheck className="w-3.5 h-3.5 text-green-600 ml-1.5" />}
                  </dt>
                  <dd className={`font-medium ${remainingForFreeShip <= 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {shippingAmount === 0 ? 'Free' : `₹${shippingAmount.toLocaleString()}`}
                  </dd>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <dt className="text-base font-semibold text-gray-900">Total</dt>
                  <dd className="text-xl font-semibold text-gray-900">₹{finalTotal.toLocaleString()}</dd>
                </div>
                {couponDiscount > 0 && (
                  <p className="text-xs text-green-600 font-medium mt-1">You save ₹{couponDiscount.toLocaleString()} with this coupon!</p>
                )}
                <p className="text-xs text-gray-500 mt-1">Including GST</p>
              </dl>

              {/* Coupon Code Section */}
              <div className="mt-6 pt-6 border-t border-gray-100">
                <details className="group" open={!!appliedCoupon}>
                  <summary className="flex cursor-pointer items-center justify-between text-sm font-medium text-gray-900 hover:text-gray-600 list-none">
                    <span className="flex items-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      {appliedCoupon ? 'Coupon Applied' : 'Have a coupon code?'}
                    </span>
                    <span className="transition group-open:rotate-180">
                      <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
                    </span>
                  </summary>
                  <div className="mt-4">
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="text-sm font-mono font-bold text-green-700">{appliedCoupon.code}</span>
                          <span className="text-xs text-green-600">(-₹{couponDiscount})</span>
                        </div>
                        <button
                          onClick={handleRemoveCoupon}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                            placeholder="Enter coupon code"
                            className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                            onKeyDown={(e) => e.key === 'Enter' && handleApplyCoupon()}
                          />
                          <button
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponCode.trim()}
                            className="px-4 py-2 bg-gray-900 text-white text-xs font-bold uppercase rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                          >
                            {couponLoading ? '...' : 'Apply'}
                          </button>
                        </div>

                        {/* Show Available Coupons Button */}
                        <button
                          onClick={handleShowCoupons}
                          className="mt-2 w-full text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-lg py-2 transition-colors flex items-center justify-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                          </svg>
                          View Available Coupons
                        </button>

                        {/* Available Coupons List */}
                        {showCouponList && (
                          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                            <div className="bg-gray-50 px-3 py-2 flex items-center justify-between border-b border-gray-200">
                              <span className="text-xs font-semibold text-gray-700">Available Coupons</span>
                              <button onClick={() => setShowCouponList(false)} className="text-gray-400 hover:text-gray-600">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            {loadingCoupons ? (
                              <div className="p-4 text-center text-xs text-gray-500">Loading coupons...</div>
                            ) : availableCoupons.length === 0 ? (
                              <div className="p-4 text-center text-xs text-gray-500">No coupons available right now</div>
                            ) : (
                              <div className="max-h-48 overflow-y-auto divide-y divide-gray-100">
                                {availableCoupons.map((c, idx) => (
                                  <div
                                    key={idx}
                                    className="px-3 py-2.5 hover:bg-amber-50/50 transition-colors cursor-pointer flex items-center justify-between gap-2"
                                    onClick={() => handleSelectCoupon(c.code)}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono font-bold text-xs text-gray-900">{c.code}</span>
                                        <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                          {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                                        </span>
                                        {c.forNewUsers && (
                                          <span className="bg-blue-100 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded">NEW USER</span>
                                        )}
                                        {c.forExistingUsers && (
                                          <span className="bg-purple-100 text-purple-700 text-[9px] font-bold px-1.5 py-0.5 rounded">OLD USER</span>
                                        )}
                                      </div>
                                      {c.description && <p className="text-[10px] text-gray-500 mt-0.5 truncate">{c.description}</p>}
                                      {c.minOrderAmount > 0 && <p className="text-[10px] text-gray-400">Min order: ₹{c.minOrderAmount}</p>}
                                    </div>
                                    <button className="flex-shrink-0 px-2.5 py-1 bg-gray-900 text-white text-[10px] font-bold rounded-md hover:bg-gray-800 transition-colors">
                                      Apply
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {couponError && (
                          <p className="mt-2 text-xs text-red-500 font-medium">{couponError}</p>
                        )}
                        {couponSuccess && (
                          <p className="mt-2 text-xs text-green-600 font-medium">{couponSuccess}</p>
                        )}
                      </>
                    )}
                  </div>
                </details>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full flex items-center justify-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm"
                >
                  Proceed to Checkout
                </button>
                <p className="mt-3 text-center text-xs text-gray-500">
                  Free shipping on orders over ₹2,000
                </p>
              </div>

              {/* Payment Icons */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-xs font-medium text-gray-500 mb-3 text-center">Secure Payment</p>
                <div className="flex justify-center gap-4 opacity-60">
                  {/* Visa */}
                  <svg className="h-6" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="4" fill="#F3F4F6" /><path d="M14.07 15.631H16.485L18 8.42H15.657C15.12 8.42 14.628 8.736 14.436 9.197L12.333 14.238L10.153 9.197C9.972 8.71 9.564 8.42 8.949 8.42H5.733L5.617 8.974C6.828 9.243 7.824 9.612 8.718 10.536C9.564 11.433 9.513 11.248 9.87 13.069L8.475 19.82H11.025L14.07 15.631ZM25.047 15.631H27.423L29.562 8.42H27.051L25.047 15.631ZM30.048 15.631H32.412L34.347 8.42H32.001L30.048 15.631ZM23.355 8.42L21.498 17.544C21.396 17.925 21.6 18.2 21.996 18.2H24.288L26.31 8.42H23.355Z" fill="#1A1F71" /></svg>
                  {/* Mastercard */}
                  <svg className="h-6" viewBox="0 0 38 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="38" height="24" rx="4" fill="#F3F4F6" /><path d="M13.6 12C13.6 14.333 14.65 16.433 16.3 17.9C15.033 18.8 13.516 19.333 11.85 19.333C7.8 19.333 4.51667 16.05 4.51667 12C4.51667 7.95 7.8 4.66667 11.85 4.66667C13.516 4.66667 15.033 5.2 16.3 6.1C14.65 7.56667 13.6 9.66667 13.6 12Z" fill="#EB001B" /><path d="M26.2667 12C26.2667 16.05 22.9833 19.333 18.9333 19.333C17.2667 19.333 15.75 18.8 14.4833 17.9C16.1333 16.433 17.1833 14.333 17.1833 12C17.1833 9.66667 16.1333 7.56667 14.4833 6.1C15.75 5.2 17.2667 4.66667 18.9333 4.66667C22.9833 4.66667 26.2667 7.95 26.2667 12Z" fill="#F79E1B" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;