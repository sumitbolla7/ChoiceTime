import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { paymentAPI, profileAPI, orderAPI, getShippingConfig as getShippingConfigAPI, couponAPI } from '../utils/api';
import { loadScript } from '../utils/razorpay';
import { Check, FileText } from 'lucide-react';

const Checkout = () => {
  const { cart, getCartTotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addressSaved, setAddressSaved] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('razorpay'); // 'razorpay' or 'cod'
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false); // Prevent cart redirect during order placement
  const [isProcessingOrder, setIsProcessingOrder] = useState(false); // Show processing state
  const [processingStep, setProcessingStep] = useState(0); // Track processing steps
  const [orderData, setOrderData] = useState(null); // Store order data for success page
  /** COD advance in ₹ — from GET /payment/cod-advance (same server as Razorpay create-order) */
  const [codAdvanceRupees, setCodAdvanceRupees] = useState(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState([]);

  // Load applied coupon from sessionStorage (set in Cart page)
  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = sessionStorage.getItem('appliedCoupon');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const couponDiscount = appliedCoupon?.discount || 0;

  // Coupon functions
  const loadAvailableCoupons = async () => {
    try {
      const response = await couponAPI.getAvailable();
      if (response.success && response.data) {
        setAvailableCoupons(response.data);
      }
    } catch (err) {
      console.error('Error loading available coupons:', err);
    }
  };

  const applyCoupon = async () => {
    if (!couponCode.trim()) {
      setCouponError('Please enter a coupon code');
      return;
    }

    setApplyingCoupon(true);
    setCouponError('');
    setError('');

    try {
      const response = await couponAPI.validate(couponCode.trim(), getCartTotal());
      
      if (response.success && response.data) {
        const coupon = response.data;
        setAppliedCoupon(coupon);
        sessionStorage.setItem('appliedCoupon', JSON.stringify(coupon));
        setCouponCode('');
        setError('');
        setSuccess(`Coupon "${coupon.code}" applied successfully! You saved ₹${coupon.discount}`);
      } else {
        setCouponError(response.message || 'Invalid coupon code');
      }
    } catch (err) {
      console.error('Error applying coupon:', err);
      setCouponError('Failed to apply coupon. Please try again.');
    } finally {
      setApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    sessionStorage.removeItem('appliedCoupon');
    setError('');
    setSuccess('');
  };
  const [shippingConfig, setShippingConfig] = useState({
    freeShippingThreshold: 2000,
    shippingCharge: 50,
  });
  const freeShippingThreshold = Number(shippingConfig.freeShippingThreshold) || 2000;
  const shippingCharge = Number(shippingConfig.shippingCharge) || 0;
  const subtotal = getCartTotal();
  const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
  const shippingAmount = discountedSubtotal > freeShippingThreshold ? 0 : shippingCharge;
  const finalPayable = discountedSubtotal + shippingAmount;
  const [shippingAddress, setShippingAddress] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address?.address || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zipCode: user?.address?.zipCode || '',
    country: user?.address?.country || 'India',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    // Don't redirect to cart if we're in the process of placing an order
    if (cart.length === 0 && !isPlacingOrder) {
      navigate('/cart');
      return;
    }

    // Load user profile to get saved address
    const loadUserProfile = async () => {
      try {
        const response = await profileAPI.getProfile();
        if (response.success && response.data.user) {
          const userData = response.data.user;
          // Update shipping address with saved address if available
          if (userData.address) {
            setShippingAddress({
              name: userData.address.name || userData.name || '',
              phone: userData.address.phone || userData.phone || '',
              address: userData.address.address || '',
              city: userData.address.city || '',
              state: userData.address.state || '',
              zipCode: userData.address.zipCode || '',
              country: userData.address.country || 'India',
            });
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };

    loadUserProfile();
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
    loadAvailableCoupons();
  }, [isAuthenticated, cart.length, navigate, isPlacingOrder]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await paymentAPI.getCodAdvanceConfig();
        if (cancelled || !res?.success || res.data?.rupees == null) return;
        const r = Number(res.data.rupees);
        if (Number.isFinite(r) && r >= 0) setCodAdvanceRupees(r);
      } catch (e) {
        console.error('COD advance config:', e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress((prev) => ({ ...prev, [name]: value }));
    // Reset saved status when user edits
    if (addressSaved) {
      setAddressSaved(false);
    }
  };

  const saveAddress = async () => {
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
      setError('Please fill in all required fields before saving');
      return;
    }

    setSavingAddress(true);
    setError('');

    try {
      const addressData = {
        name: shippingAddress.name,
        phone: shippingAddress.phone,
        address: {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          address: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state || '',
          zipCode: shippingAddress.zipCode || '',
          country: shippingAddress.country || 'India',
        },
      };

      const response = await profileAPI.updateProfile(addressData);
      if (response.success) {
        setAddressSaved(true);
        setTimeout(() => setAddressSaved(false), 3000);
        // Update user in AuthContext if available
        if (response.data?.user) {
          // The user data will be refreshed on next profile load
        }
      } else {
        setError('Failed to save address. Please try again.');
      }
    } catch (err) {
      console.error('Error saving address:', err);
      setError('Failed to save address. Please try again.');
    } finally {
      setSavingAddress(false);
    }
  };

  const handlePayment = async () => {
    console.log('Payment handler called with method:', paymentMethod);
    
    if (!shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city) {
      setError('Please fill in all required shipping address fields');
      return;
    }

    setLoading(true);
    setError('');
    setIsPlacingOrder(true);

    try {
      // Save address automatically before proceeding to payment
      try {
        const addressData = {
          name: shippingAddress.name,
          phone: shippingAddress.phone,
          address: {
            name: shippingAddress.name,
            phone: shippingAddress.phone,
            address: shippingAddress.address,
            city: shippingAddress.city,
            state: shippingAddress.state || '',
            zipCode: shippingAddress.zipCode || '',
            country: shippingAddress.country || 'India',
          },
        };
        await profileAPI.updateProfile(addressData);
      } catch (saveErr) {
        console.error('Error auto-saving address:', saveErr);
        // Continue with payment even if address save fails
      }

      if (paymentMethod === 'cod') {
        console.log('Processing COD order with advance payment...');
        // Handle Cash on Delivery order with advance payment
        await handleCODOrder();
      } else {
        console.log('Processing online payment...');
        // Handle online payment
        await handleOnlinePayment();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError(err.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
      setIsPlacingOrder(false);
    }
  };

  const handleCODOrder = async () => {
    const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

    if (!scriptLoaded) {
      throw new Error('Failed to load payment gateway. Please refresh the page and try again.');
    }

    if (!window.Razorpay) {
      throw new Error('Payment gateway is not available. Please refresh the page and try again.');
    }

    const response = await paymentAPI.createRazorpayOrder({
      purpose: 'cod_advance',
      shippingAddress,
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to create advance payment order');
    }

    const { orderId, amount, currency, key } = response.data;
    const amountPaise = Number(amount);
    if (!Number.isFinite(amountPaise) || amountPaise < 1) {
      throw new Error('Invalid advance amount from server. Check backend payment config.');
    }
    // Rupees actually charged (source of truth = API, avoids local/backend version mismatch)
    const advanceAmountPaid = amountPaise / 100;
    setCodAdvanceRupees(advanceAmountPaid);

    // Razorpay options for COD advance payment
    const options = {
      key: key,
      amount: amountPaise,
      currency: currency,
      name: 'ChoiceTime',
      description: `COD Advance Payment - ₹${advanceAmountPaid}`,
      order_id: orderId,
      handler: async function (response) {
        try {
          setIsProcessingOrder(true);
          setProcessingStep(5);

          // Verify advance payment
          const verifyResponse = await paymentAPI.verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          if (verifyResponse.success) {
            // Create COD order with advance payment info
            const orderResponse = await orderAPI.createOrder(
              shippingAddress,
              'COD',
              appliedCoupon?.code || '',
              {
                advancePayment: {
                  amount: advanceAmountPaid,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature
                }
              }
            );

            if (orderResponse.success) {
              setProcessingStep(6);
              setOrderData(orderResponse.data.order);
              setShowSuccessModal(true);
              setIsProcessingOrder(false);
              setLoading(false);

              // Clear cart and redirect after delay
              setTimeout(() => {
                setIsPlacingOrder(true);
                clearCart();
                const oid = orderResponse.data.order?._id;
                if (oid) navigate(`/orders/${String(oid)}?payment=cod`);
                else navigate('/profile?tab=orders&payment=cod');
              }, 2000);
            } else {
              throw new Error(orderResponse.message || 'Failed to create COD order');
            }
          } else {
            throw new Error('Advance payment verification failed');
          }
        } catch (err) {
          console.error('COD order error:', err);
          setError(err.message || 'Failed to place COD order. Please try again.');
          setIsProcessingOrder(false);
          setLoading(false);
          setProcessingStep(0);
        }
      },
      prefill: {
        name: shippingAddress.name,
        email: user?.email || '',
        contact: shippingAddress.phone,
      },
      notes: {
        address: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state}`,
        type: 'cod_advance',
      },
      theme: {
        color: '#111827',
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
          setIsPlacingOrder(false);
          setIsProcessingOrder(false);
          setProcessingStep(0);
          setError('Advance payment cancelled. Please try again.');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', function (response) {
      setError(`Advance payment failed: ${response.error.description}`);
      setLoading(false);
      setIsPlacingOrder(false);
      setIsProcessingOrder(false);
      setProcessingStep(0);
    });
    razorpay.open();
    // Razorpay modal is open — release checkout UI (button was disabled via isPlacingOrder)
    setLoading(false);
    setIsPlacingOrder(false);
  };

  const handleOnlinePayment = async () => {
    const scriptLoaded = await loadScript('https://checkout.razorpay.com/v1/checkout.js');

    if (!scriptLoaded) {
      throw new Error('Failed to load payment gateway. Please refresh the page and try again.');
    }

    if (!window.Razorpay) {
      throw new Error('Payment gateway is not available. Please refresh the page and try again.');
    }

    // Create Razorpay order for full amount (send coupon so backend charges the discounted price)
    const response = await paymentAPI.createRazorpayOrder({
      shippingAddress,
      couponCode: appliedCoupon?.code || '',
    });

    if (!response.success) {
      throw new Error(response.message || 'Failed to create payment order');
    }

    const { orderId, amount, currency, key } = response.data;

    // Razorpay options for full payment
    const options = {
      key: key,
      amount: amount,
      currency: currency,
      name: 'ChoiceTime',
      description: `Order for ${cart.length} item(s)`,
      order_id: orderId,
      handler: async function (response) {
        try {
          // Verify payment
          const verifyResponse = await paymentAPI.verifyPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );

          if (verifyResponse.success) {
            // Order is created on payment/create-order and finalized in verify-payment (cart cleared server-side).
            const paidOrder = verifyResponse.data?.order;
            if (!paidOrder?._id) {
              throw new Error('Order confirmation missing. Check My orders in your profile.');
            }

            setOrderData(paidOrder);
            setShowSuccessModal(true);
            setIsProcessingOrder(false);
            setLoading(false);

            const orderId = String(paidOrder._id);
            setTimeout(() => {
              setIsPlacingOrder(true);
              clearCart();
              navigate(`/orders/${orderId}?payment=success`);
            }, 2000);
          } else {
            throw new Error('Payment verification failed');
          }
        } catch (err) {
          console.error('Payment error:', err);
          setError(err.message || 'Payment verification failed. Please contact support.');
          setLoading(false);
          setIsPlacingOrder(false);
          setIsProcessingOrder(false);
          setProcessingStep(0);
        }
      },
      prefill: {
        name: shippingAddress.name,
        email: user?.email || '',
        contact: shippingAddress.phone,
      },
      notes: {
        address: `${shippingAddress.address}, ${shippingAddress.city}, ${shippingAddress.state}`,
      },
      theme: {
        color: '#111827',
      },
      modal: {
        ondismiss: function () {
          setLoading(false);
          setIsPlacingOrder(false);
          setIsProcessingOrder(false);
          setProcessingStep(0);
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.on('payment.failed', function (response) {
      setError(`Payment failed: ${response.error.description}`);
      setLoading(false);
      setIsPlacingOrder(false);
      setIsProcessingOrder(false);
      setProcessingStep(0);
    });
    razorpay.open();
    setLoading(false);
    setIsPlacingOrder(false);
  };

  // Don't return null if we're placing an order (to show the modal)
  if (!isAuthenticated || (cart.length === 0 && !isPlacingOrder)) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-brown-50 transition-opacity duration-300 overflow-x-hidden"
      style={{
        opacity: showSuccessModal ? 0.3 : 1,
        pointerEvents: showSuccessModal ? 'none' : 'auto',
        animation: 'fadeInPage 0.4s ease-out'
      }}
    >
      {/* Professional Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm overflow-x-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-gray-900 truncate">Checkout</h1>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{cart.length} {cart.length === 1 ? 'item' : 'items'}</p>
          </div>
          <button
            onClick={() => navigate('/cart')}
            className="text-xs sm:text-sm text-gray-600 hover:text-gray-900 font-medium flex-shrink-0"
          >
            ← Back to Cart
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 overflow-x-hidden">

        {/* Success Modal with Smooth Animations */}
        {showSuccessModal && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
            style={{
              animation: 'fadeIn 0.3s ease-out'
            }}
            onClick={(e) => {
              // Prevent closing on background click during redirect
              e.stopPropagation();
            }}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center transform transition-all duration-300"
              style={{
                animation: 'slideUp 0.4s ease-out'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-4">
                <div
                  className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center transform transition-all duration-500"
                  style={{
                    animation: 'scaleIn 0.5s ease-out, pulse 2s ease-in-out infinite'
                  }}
                >
                  <Check
                    className="w-12 h-12 text-green-600 transform transition-all duration-500"
                    style={{
                      animation: 'checkmark 0.6s ease-out 0.3s both'
                    }}
                  />
                </div>
              </div>
              <h2
                className="text-2xl font-bold text-gray-900 mb-2 transform transition-all duration-500"
                style={{
                  animation: 'fadeInUp 0.5s ease-out 0.2s both'
                }}
              >
                Order Placed Successfully!
              </h2>
              <p
                className="text-gray-600 mb-6 transform transition-all duration-500"
                style={{
                  animation: 'fadeInUp 0.5s ease-out 0.3s both'
                }}
              >
                Your order has been confirmed. Redirecting to order details...
              </p>
              <div className="flex justify-center">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin"></div>
              </div>
            </div>
          </div>
        )}

        {/* Add CSS animations */}
        <style>{`
          @keyframes fadeInPage {
            from { 
              opacity: 0;
            }
            to { 
              opacity: 1;
            }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { 
              opacity: 0;
              transform: translateY(20px) scale(0.95);
            }
            to { 
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes scaleIn {
            from { 
              transform: scale(0);
              opacity: 0;
            }
            to { 
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          @keyframes checkmark {
            0% { 
              transform: scale(0) rotate(-45deg);
              opacity: 0;
            }
            50% { 
              transform: scale(1.2) rotate(5deg);
            }
            100% { 
              transform: scale(1) rotate(0deg);
              opacity: 1;
            }
          }
          @keyframes fadeInUp {
            from { 
              opacity: 0;
              transform: translateY(10px);
            }
            to { 
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Enhanced Processing Order Overlay with Steps */}
        {isProcessingOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full mx-4 overflow-y-auto max-h-[90vh]">
              <div className="text-center">
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center">
                        <span className="text-white font-bold text-lg">{processingStep}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Placing Your Order</h3>
                <p className="text-sm text-gray-600 mb-6">Please wait while we process your order...</p>

                {/* Processing Steps */}
                <div className="space-y-3 text-left">
                  <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${processingStep >= 1 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${processingStep >= 1 ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                      {processingStep > 1 ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : processingStep === 1 ? (
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${processingStep >= 1 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Validating order details
                    </span>
                  </div>

                  <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${processingStep >= 2 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${processingStep >= 2 ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                      {processingStep > 2 ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : processingStep === 2 ? (
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${processingStep >= 2 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Processing payment method
                    </span>
                  </div>

                  <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${processingStep >= 3 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${processingStep >= 3 ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                      {processingStep > 3 ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : processingStep === 3 ? (
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${processingStep >= 3 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Confirming order
                    </span>
                  </div>

                  <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${processingStep >= 4 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${processingStep >= 4 ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                      {processingStep > 4 ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : processingStep === 4 ? (
                        <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${processingStep >= 4 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Creating order
                    </span>
                  </div>

                  <div className={`flex items-center gap-3 p-2.5 rounded-lg transition-all duration-300 ${processingStep >= 5 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'
                    }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300 ${processingStep >= 5 ? 'bg-green-600' : 'bg-gray-300'
                      }`}>
                      {processingStep >= 5 ? (
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                      )}
                    </div>
                    <span className={`text-sm font-medium transition-colors ${processingStep >= 5 ? 'text-gray-900' : 'text-gray-500'
                      }`}>
                      Order confirmed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Left Column - Shipping Address Form */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Shipping Address Card */}
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-gray-900">Shipping Address</h2>
                  {addressSaved && (
                    <div className="flex items-center gap-1.5 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded">
                      <Check size={12} />
                      <span>Saved</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="p-4 sm:p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={shippingAddress.name}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                    placeholder="Enter your full name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={shippingAddress.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                    placeholder="Enter your phone number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="address"
                    value={shippingAddress.address}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors resize-none"
                    placeholder="Enter your complete address"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={shippingAddress.city}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
                    <input
                      type="text"
                      name="state"
                      value={shippingAddress.state}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                      placeholder="State"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">ZIP Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={shippingAddress.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                      placeholder="ZIP Code"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                    <input
                      type="text"
                      name="country"
                      value={shippingAddress.country}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-gray-900 focus:border-gray-900 transition-colors"
                      placeholder="Country"
                    />
                  </div>
                </div>

                {/* Save Address Button */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={saveAddress}
                    disabled={savingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.address || !shippingAddress.city}
                    className="w-full px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-gray-200"
                  >
                    {savingAddress ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check size={14} />
                        Save Address
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm lg:sticky lg:top-24 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>
              </div>
              <div className="p-4 sm:p-6 space-y-4 max-h-64 overflow-y-auto">
                {cart.map((item) => {
                  const product = item.product || item;
                  const price = product.price || product.finalPrice || 0;
                  return (
                    <div key={item._id || item.id} className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                      {product.images?.[0] && (
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-50 rounded-md overflow-hidden border border-gray-200">
                          <img
                            src={product.images[0]}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 break-words">{product.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Qty: {item.quantity}</p>
                        <p className="text-sm font-semibold text-gray-900 mt-1">
                          ₹{(price * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Coupon Section */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Coupon Code</h3>
                {appliedCoupon ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          Coupon "{appliedCoupon.code}" applied
                        </p>
                        <p className="text-xs text-green-600">
                          You saved ₹{appliedCoupon.discount}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={removeCoupon}
                        className="text-green-600 hover:text-green-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value);
                          setCouponError('');
                        }}
                        placeholder="Enter coupon code"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        onKeyPress={(e) => e.key === 'Enter' && applyCoupon()}
                      />
                      <button
                        type="button"
                        onClick={applyCoupon}
                        disabled={applyingCoupon || !couponCode.trim()}
                        className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {applyingCoupon ? (
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          'Apply'
                        )}
                      </button>
                    </div>
                    {couponError && (
                      <p className="text-xs text-red-600">{couponError}</p>
                    )}
                    {availableCoupons.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-2">Available coupons:</p>
                        <div className="space-y-1">
                          {availableCoupons.slice(0, 3).map((coupon) => (
                            <div
                              key={coupon._id}
                              className="flex items-center justify-between p-2 bg-gray-50 border border-gray-200 rounded text-xs"
                            >
                              <div>
                                <span className="font-medium text-gray-900">{coupon.code}</span>
                                <span className="text-gray-500 ml-2">
                                  Save ₹{coupon.discount}
                                  {coupon.minAmount && ` (Min: ₹${coupon.minAmount})`}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCouponCode(coupon.code)}
                                className="text-gray-600 hover:text-gray-900"
                              >
                                Use
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-gray-50 space-y-2.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">₹{subtotal.toLocaleString()}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="flex items-center gap-1 text-green-600">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      Coupon ({appliedCoupon?.code})
                    </span>
                    <span className="font-medium text-green-600">-₹{couponDiscount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className={`font-medium ${shippingAmount === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {shippingAmount === 0 ? 'Free' : `₹${shippingAmount.toLocaleString()}`}
                  </span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">COD Advance Payment</span>
                    <span className="font-medium text-blue-600">
                      ₹{codAdvanceRupees == null ? '…' : codAdvanceRupees}
                    </span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-2.5 mt-2.5 flex justify-between">
                  <span className="text-base font-semibold text-gray-900">
                    {paymentMethod === 'cod' ? 'Payable Now' : 'Total'}
                  </span>
                  <span className="text-lg font-semibold text-gray-900">
                    ₹{paymentMethod === 'cod' ? (codAdvanceRupees == null ? '…' : codAdvanceRupees) : finalPayable.toLocaleString()}
                  </span>
                </div>
                {paymentMethod === 'cod' && (
                  <div className="border-t border-gray-200 pt-2.5 mt-2.5 flex justify-between">
                    <span className="text-xs text-gray-500">Remaining on delivery</span>
                    <span className="text-sm font-medium text-gray-700">
                      ₹{codAdvanceRupees == null ? '…' : Math.max(0, finalPayable - codAdvanceRupees).toLocaleString()}
                    </span>
                  </div>
                )}
                {couponDiscount > 0 && (
                  <p className="text-xs text-green-600 font-medium">You save ₹{couponDiscount.toLocaleString()}!</p>
                )}
                {shippingAmount > 0 && (
                  <p className="text-xs text-gray-500">Free shipping above ₹{freeShippingThreshold.toLocaleString()}</p>
                )}
              </div>

              {/* Payment Method Selection */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Payment Method</h3>
                <div className="space-y-2.5">
                  <label className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-all ${
                    paymentMethod === 'razorpay' 
                      ? 'border-gray-900 bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="razorpay"
                      checked={paymentMethod === 'razorpay'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Online Payment</div>
                      <div className="text-xs text-gray-500 mt-0.5">Cards, UPI, Net Banking, Wallets</div>
                    </div>
                  </label>
                  
                  <label className={`flex items-start gap-3 p-3 border rounded-md cursor-pointer transition-all ${
                    paymentMethod === 'cod' 
                      ? 'border-gray-900 bg-gray-50' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}>
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cod"
                      checked={paymentMethod === 'cod'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-4 h-4 text-gray-900 focus:ring-gray-900 mt-0.5"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Cash on Delivery</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Pay ₹{codAdvanceRupees == null ? '…' : codAdvanceRupees} advance online, remaining on delivery
                      </div>
                      <div className="text-xs text-gray-600 mt-1">Advance amount is non-refundable</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Payment Button */}
              <div className="px-4 sm:px-6 py-4 border-t border-gray-200 bg-white">
                <button
                  onClick={handlePayment}
                  disabled={loading || isProcessingOrder || isPlacingOrder}
                  className="w-full bg-gray-900 text-white py-2.5 rounded-md hover:bg-gray-800 transition-colors text-sm font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading || isProcessingOrder ? (
                    <>
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{paymentMethod === 'cod' ? 'Place Order' : isProcessingOrder ? 'Placing Order...' : 'Processing...'}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      <span>{paymentMethod === 'cod' ? 'Place Order' : 'Pay Now'}</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  By placing your order, you agree to our{' '}
                  <Link
                    to="/returns"
                    className="text-gray-600 underline hover:text-gray-900 transition-colors"
                  >
                    Terms & Conditions
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Checkout;
