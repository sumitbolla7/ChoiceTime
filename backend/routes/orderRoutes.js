import express from 'express';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import { protect } from '../middleware/authMiddleware.js';
import { applyCancellationRefunds } from '../services/orderCancellationRefunds.js';
import { pushCodOrderToParcelGuru } from '../controllers/orderController.js';

const router = express.Router();
const SHIPPING_CONFIG_KEY = 'shippingConfig';
const DEFAULT_SHIPPING_CONFIG = {
  freeShippingThreshold: 4000,
  shippingCharge: 50,
};

const getShippingConfig = async () => {
  try {
    const doc = await Setting.findOne({ key: SHIPPING_CONFIG_KEY }).lean();
    const value = doc?.value && typeof doc.value === 'object' ? doc.value : DEFAULT_SHIPPING_CONFIG;
    return {
      freeShippingThreshold: Math.max(0, Number(value.freeShippingThreshold ?? DEFAULT_SHIPPING_CONFIG.freeShippingThreshold) || DEFAULT_SHIPPING_CONFIG.freeShippingThreshold),
      shippingCharge: Math.max(0, Number(value.shippingCharge ?? DEFAULT_SHIPPING_CONFIG.shippingCharge) || 0),
    };
  } catch {
    return DEFAULT_SHIPPING_CONFIG;
  }
};

// Get user's orders
router.get('/', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message,
    });
  }
});

// Cancel order (pending, processing, or shipped — not delivered); Razorpay refunds per policy
router.patch('/:orderId/cancel', protect, async (req, res) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for cancellation',
      });
    }
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }
    const s = (order.status || '').toLowerCase();
    if (s === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled',
      });
    }
    if (s === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Delivered orders cannot be cancelled here. Use returns or contact support.',
      });
    }
    if (s !== 'pending' && s !== 'processing' && s !== 'shipped') {
      return res.status(400).json({
        success: false,
        message: 'This order cannot be cancelled',
      });
    }

    const previousStatus = order.status;
    const refundResult = await applyCancellationRefunds(order, previousStatus);
    if (!refundResult.ok) {
      return res.status(502).json({
        success: false,
        message: refundResult.error || 'Refund failed. Order was not cancelled. Please try again or contact support.',
      });
    }

    order.status = 'cancelled';
    order.cancelReason = reason;
    order.cancelledAt = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      data: {
        order,
        refund: {
          skipped: refundResult.skipped || null,
          amountRupees: order.cancellationRefund?.amountRupees ?? null,
          razorpayRefundId: order.cancellationRefund?.razorpayRefundId || null,
        },
      },
      message: 'Order cancelled',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling order',
      error: error.message,
    });
  }
});

// Get single order
router.get('/:orderId', protect, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.orderId,
      user: req.user._id,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { order },
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching order',
      error: error.message,
    });
  }
});

// Create order from cart
router.post('/create', protect, async (req, res) => {
  try {
    console.log('Order creation request received:', {
      body: req.body,
      user: req.user._id
    });
    
    const { shippingAddress, paymentMethod = 'COD', couponCode, advancePayment } = req.body;

    const advanceDoc =
      advancePayment && typeof advancePayment === 'object'
        ? { ...advancePayment, status: advancePayment.status || 'paid' }
        : undefined;

    const cart = await Cart.findOne({ user: req.user._id });
    console.log('Cart found:', cart ? `Items: ${cart.items.length}` : 'No cart found');

    if (!cart || cart.items.length === 0) {
      console.log('Cart is empty or not found');
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // Calculate total amount (product price + box price)
    const subtotal = cart.items.reduce((total, item) => {
      const boxPrice = Number(item.boxPrice) || 0;
      return total + (item.product.price + boxPrice) * item.quantity;
    }, 0);

    // Apply coupon if provided
    let couponDiscount = 0;
    let appliedCouponCode = '';
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase().trim(), isActive: true });
      if (coupon) {
        // Verify coupon is still valid
        const isExpired = coupon.expiryDate && new Date(coupon.expiryDate) < new Date();
        const isOverLimit = coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit;
        const userUsageCount = coupon.usedBy.filter(
          (u) => u.user.toString() === req.user._id.toString()
        ).length;
        const isOverUserLimit = coupon.perUserLimit && userUsageCount >= coupon.perUserLimit;

        if (!isExpired && !isOverLimit && !isOverUserLimit && subtotal >= coupon.minOrderAmount) {
          if (coupon.discountType === 'percentage') {
            couponDiscount = (subtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount && couponDiscount > coupon.maxDiscount) {
              couponDiscount = coupon.maxDiscount;
            }
          } else {
            couponDiscount = coupon.discountValue;
          }
          if (couponDiscount > subtotal) couponDiscount = subtotal;
          couponDiscount = Math.round(couponDiscount);
          appliedCouponCode = coupon.code;

          // Record usage
          coupon.usedCount += 1;
          coupon.usedBy.push({ user: req.user._id });
          await coupon.save();
        }
      }
    }

    const { freeShippingThreshold, shippingCharge } = await getShippingConfig();
    const amountAfterDiscount = subtotal - couponDiscount;
    const shippingAmount = amountAfterDiscount > freeShippingThreshold ? 0 : shippingCharge;
    const totalAmount = amountAfterDiscount + shippingAmount;

    // Create order
    console.log('Creating order with data:', {
      user: req.user._id,
      itemsCount: cart.items.length,
      totalAmount,
      paymentMethod,
      shippingAddress
    });
    
    const order = await Order.create({
      user: req.user._id,
      items: cart.items.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        boxType: item.boxType || '',
        boxPrice: Number(item.boxPrice) || 0,
        price: item.product.price + (Number(item.boxPrice) || 0),
      })),
      totalAmount,
      coupon: appliedCouponCode ? { code: appliedCouponCode, discount: couponDiscount } : { code: '', discount: 0 },
      shippingAddress: shippingAddress || req.user.address || {},
      paymentMethod,
      advancePayment: advanceDoc,
    });

    console.log('Order created successfully:', order._id);

    if (String(paymentMethod || 'COD').toUpperCase() === 'COD') {
      await pushCodOrderToParcelGuru(order, req.user?.email);
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    console.log('Sending success response');
    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: { order },
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating order',
      error: error.message,
    });
  }
});

export default router;

