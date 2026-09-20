import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { orderAPI, getShippingConfig } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { getLiveImageUrl, handleImageError } from '../utils/imageFallback';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  MapPin, 
  Phone, 
  User, 
  CheckCircle,
  Truck,
  Clock,
  FileText,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [shippingConfig, setShippingConfig] = useState({
    freeShippingThreshold: 2000,
    shippingCharge: 50,
  });

  useEffect(() => {
    const p = searchParams.get('payment');
    if (p === 'success') {
      setCheckoutSuccessMsg('Payment successful! Your order is confirmed.');
    } else if (p === 'cod') {
      setCheckoutSuccessMsg('Order placed successfully.');
    }
    if (p) {
      const next = new URLSearchParams(searchParams);
      next.delete('payment');
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot: read checkout redirect query once
  }, []);

  useEffect(() => {
    const fetchShippingConfig = async () => {
      try {
        const response = await getShippingConfig();
        if (response.success && response.data) {
          setShippingConfig({
            freeShippingThreshold: response.data.freeShippingThreshold || 2000,
            shippingCharge: response.data.shippingCharge || 50,
          });
        }
      } catch (err) {
        console.error('Error fetching shipping config:', err);
        // Keep default values if API fails
      }
    };

    fetchShippingConfig();
  }, []);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await orderAPI.getOrder(orderId);
        
        if (response.success) {
          setOrder(response.data.order);
        } else {
          setError(response.message || 'Order not found');
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchOrder();
    }
  }, [orderId]);

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const codAdvance = order?.advancePayment;
  const codAdvancePaid =
    order?.paymentMethod === 'COD' &&
    codAdvance &&
    codAdvance.status === 'paid' &&
    Number(codAdvance.amount) > 0;
  const codAdvanceAmount = codAdvancePaid ? Number(codAdvance.amount) : 0;
  const codDueOnDelivery =
    codAdvancePaid && order?.totalAmount != null
      ? Math.max(0, Number(order.totalAmount) - codAdvanceAmount)
      : null;

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'out_for_delivery':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'shipped':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'processing':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return <CheckCircle className="w-4 h-4" />;
      case 'out_for_delivery':
        return <Truck className="w-4 h-4" />;
      case 'shipped':
        return <Package className="w-4 h-4" />;
      case 'processing':
        return <Clock className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getShippingAmount = (order) => {
    if (!order || !order.items) return 0;
    
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const couponDiscount = order.coupon?.discount || 0;
    const discountedSubtotal = Math.max(0, subtotal - couponDiscount);
    
    return discountedSubtotal > shippingConfig.freeShippingThreshold ? 0 : shippingConfig.shippingCharge;
  };

  const handleReturnRequest = async () => {
    if (!returnReason.trim()) {
      setError('Please provide a reason for return');
      return;
    }

    setReturnLoading(true);
    setError('');

    try {
      const response = await fetch('/api/returns/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order._id,
          reason: returnReason.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setShowReturnForm(false);
        setReturnReason('');
        // Refresh order data to show updated return status
        const orderResponse = await orderAPI.getOrder(orderId);
        if (orderResponse.success) {
          setOrder(orderResponse.data.order);
        }
      } else {
        setError(data.message || 'Failed to submit return request');
      }
    } catch (err) {
      setError('Failed to submit return request');
    } finally {
      setReturnLoading(false);
    }
  };

  const getReturnStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'return_requested':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'return_approved':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'return_rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'picked_up':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'returned':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'refunded':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getReturnStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'return_requested':
        return 'Return Requested';
      case 'return_approved':
        return 'Return Approved';
      case 'return_rejected':
        return 'Return Rejected';
      case 'picked_up':
        return 'Pickup Scheduled';
      case 'returned':
        return 'Return Completed';
      case 'refunded':
        return 'Refunded';
      default:
        return 'No Return';
    }
  };

  const canRequestReturn = () => {
    return order.status === 'delivered' && 
           (!order.returnStatus || order.returnStatus === 'none');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Order Not Found</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            to="/profile?tab=orders"
            className="inline-flex items-center px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/profile?tab=orders"
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="h-6 w-px bg-gray-200"></span>
            <h1 className="text-lg font-semibold tracking-tight">Order Details</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {checkoutSuccessMsg ? (
          <div
            role="status"
            className="mb-4 rounded-lg bg-green-50 border border-green-200 text-green-800 px-4 py-3 text-sm font-medium"
          >
            {checkoutSuccessMsg}
          </div>
        ) : null}
        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Order #{order._id?.slice(-8).toUpperCase()}
              </h2>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(order.orderDate || order.createdAt)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatTime(order.orderDate || order.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getStatusIcon(order.status)}
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(order.status)}`}>
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items?.map((item, index) => {
                  const product = item.product || item;
                  const productName = product.name || product.title || 'Product';
                  const productImage = product.images?.[0] || product.image || product.thumbnail || product.images?.image1;
                  const itemPrice = item.price || product.finalPrice || product.price || product.mrp || 0;
                  const itemTotal = itemPrice * item.quantity;

                  return (
                    <div key={index} className="flex gap-4 p-4 border border-gray-200 rounded-lg">
                      {productImage && (
                        <div className="w-20 h-20 flex-shrink-0 bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                          <img
                            src={getLiveImageUrl(productImage)}
                            alt={productName}
                            className="w-full h-full object-cover"
                            onError={(e) => handleImageError(e, 80, 80)}
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{productName}</h4>
                        {product.brand && (
                          <p className="text-sm text-gray-500">{product.brand}</p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2 text-sm text-gray-600">
                          {item.size && <span>Size: {item.size}</span>}
                          {item.color && <span>Color: {item.color}</span>}
                          {item.boxType && <span>Box: {item.boxType}</span>}
                        </div>
                        <div className="flex justify-between items-center mt-3">
                          <div>
                            <span className="text-sm text-gray-600">Qty: {item.quantity}</span>
                            <span className="text-sm text-gray-600 ml-4">
                              ₹{itemPrice.toLocaleString()} each
                            </span>
                          </div>
                          <div className="text-lg font-semibold text-gray-900">
                            ₹{itemTotal.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Timeline</h3>
              <div className="space-y-4">
                {/* Order Placed - Always shown */}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Order Placed</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(order.orderDate || order.createdAt)} at {formatTime(order.orderDate || order.createdAt)}
                    </p>
                  </div>
                </div>
                
                {/* Processing */}
                {(order.status === 'processing' || order.status === 'shipped' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      order.status === 'processing' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <Clock className={`w-4 h-4 ${order.status === 'processing' ? 'text-blue-600' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Processing</p>
                      <p className="text-sm text-gray-600">Your order is being prepared</p>
                    </div>
                    {order.status !== 'processing' && (
                      <div className="text-green-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )}

                {/* Shipped */}
                {(order.status === 'shipped' || order.status === 'out_for_delivery' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      order.status === 'shipped' ? 'bg-blue-100' : 'bg-green-100'
                    }`}>
                      <Package className={`w-4 h-4 ${order.status === 'shipped' ? 'text-blue-600' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Shipped</p>
                      <p className="text-sm text-gray-600">Your order has been shipped</p>
                    </div>
                    {order.status !== 'shipped' && (
                      <div className="text-green-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )}

                {/* Out for Delivery */}
                {(order.status === 'out_for_delivery' || order.status === 'delivered') && (
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      order.status === 'out_for_delivery' ? 'bg-orange-100' : 'bg-green-100'
                    }`}>
                      <Truck className={`w-4 h-4 ${order.status === 'out_for_delivery' ? 'text-orange-600' : 'text-green-600'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Out for Delivery</p>
                      <p className="text-sm text-gray-600">Your order is out for delivery</p>
                    </div>
                    {order.status !== 'out_for_delivery' && (
                      <div className="text-green-600">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                )}

                {/* Delivered */}
                {order.status === 'delivered' && (
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Delivered</p>
                      <p className="text-sm text-gray-600">
                        {order.deliveredDate ? 
                          `${formatDate(order.deliveredDate)} at ${formatTime(order.deliveredDate)}` : 
                          'Order delivered successfully'
                        }
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Shipping Address</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">{order.shippingAddress?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{order.shippingAddress?.phone}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                  <div className="text-sm text-gray-600">
                    <p>{order.shippingAddress?.address}</p>
                    <p>
                      {order.shippingAddress?.city && `${order.shippingAddress.city}, `}
                      {order.shippingAddress?.state && `${order.shippingAddress?.state} `}
                      {order.shippingAddress?.zipCode && `- ${order.shippingAddress?.zipCode}`}
                    </p>
                    <p>{order.shippingAddress?.country}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    ₹{order.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                  </span>
                </div>
                {order.coupon?.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Coupon Discount ({order.coupon.code})</span>
                    <span className="font-medium text-green-600">
                      -₹{order.coupon.discount.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Shipping</span>
                  <span className={`font-medium ${getShippingAmount(order) === 0 ? 'text-green-600' : 'text-gray-900'}`}>
                    {getShippingAmount(order) === 0 ? 'Free' : `₹${getShippingAmount(order).toLocaleString()}`}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 flex justify-between">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-base font-bold text-gray-900">
                    ₹{order.totalAmount?.toLocaleString()}
                  </span>
                </div>
                {codAdvancePaid && (
                  <>
                    <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-200">
                      <span className="text-green-700 flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        Advance paid online
                      </span>
                      <span className="font-medium text-green-700">
                        ₹{codAdvanceAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Due on delivery (COD)</span>
                      <span className="font-semibold text-gray-900">
                        ₹{codDueOnDelivery?.toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {order.paymentMethod === 'COD' ? (
                    <FileText className="w-5 h-5 text-gray-600" />
                  ) : (
                    <CheckCircle className="w-5 h-5 text-gray-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900">
                    {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment'}
                  </p>
                  {codAdvancePaid ? (
                    <div className="text-sm text-gray-600 mt-1 space-y-0.5">
                      <p className="text-green-700 font-medium">
                        ₹{codAdvanceAmount.toLocaleString()} advance paid online
                      </p>
                      <p>
                        ₹{codDueOnDelivery?.toLocaleString()} to pay when you receive your order
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 mt-1">
                      {order.paymentMethod === 'COD' ? 'Pay when you receive your order' : 'Paid online'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Return Status */}
            {order.returnStatus && order.returnStatus !== 'none' && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-gray-600" />
                  Return Status
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Status</span>
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getReturnStatusColor(order.returnStatus)}`}>
                      {getReturnStatusText(order.returnStatus)}
                    </span>
                  </div>
                  
                  {order.returnReason && (
                    <div>
                      <span className="text-sm text-gray-600">Return Reason</span>
                      <p className="text-sm text-gray-900 mt-1">{order.returnReason}</p>
                    </div>
                  )}
                  
                  {order.returnRequestedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Requested On</span>
                      <span className="text-gray-900">{formatDate(order.returnRequestedAt)}</span>
                    </div>
                  )}
                  
                  {order.returnApprovedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Approved On</span>
                      <span className="text-gray-900">{formatDate(order.returnApprovedAt)}</span>
                    </div>
                  )}
                  
                  {order.returnCompletedAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Completed On</span>
                      <span className="text-gray-900">{formatDate(order.returnCompletedAt)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Return Request Button */}
            {canRequestReturn() && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-gray-600" />
                  Return Order
                </h3>
                
                {!showReturnForm ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-4">
                      Not satisfied with your order? You can request a return within 30 days of delivery.
                    </p>
                    <button
                      onClick={() => setShowReturnForm(true)}
                      className="w-full bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Request Return
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Return Reason *
                      </label>
                      <textarea
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                        placeholder="Please describe why you want to return this order..."
                      />
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={handleReturnRequest}
                        disabled={returnLoading}
                        className="flex-1 bg-gray-900 text-white py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {returnLoading ? 'Submitting...' : 'Submit Request'}
                      </button>
                      <button
                        onClick={() => {
                          setShowReturnForm(false);
                          setReturnReason('');
                          setError('');
                        }}
                        className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {(order.parcelGuru?.awbNumber || order.parcelGuru?.shipmentStatus || order.trackingId) && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-gray-600" />
                  Shipment tracking
                </h3>
                <div className="space-y-2 text-sm">
                  {order.trackingId && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Tracking ID</span>
                      <span className="font-mono font-medium text-gray-900 text-right break-all">
                        {order.trackingId}
                      </span>
                    </div>
                  )}
                  {order.parcelGuru?.awbNumber && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">AWB Number</span>
                      <span className="font-mono font-medium text-gray-900 text-right break-all">
                        {order.parcelGuru.awbNumber}
                      </span>
                    </div>
                  )}
                  {order.parcelGuru?.shipmentStatus && (
                    <div className="flex justify-between gap-2">
                      <span className="text-gray-600">Shipment Status</span>
                      <span className="font-medium text-gray-900 text-right capitalize">
                        {String(order.parcelGuru.shipmentStatus).replace(/_/g, ' ')}
                      </span>
                    </div>
                  )}
                  {order.parcelGuru?.lastMessage && (
                    <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">{order.parcelGuru.lastMessage}</p>
                  )}
                  {order.parcelGuru?.lastEventAt && (
                    <p className="text-xs text-gray-400">
                      Updated {formatDate(order.parcelGuru.lastEventAt)} {formatTime(order.parcelGuru.lastEventAt)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
