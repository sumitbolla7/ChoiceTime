import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Coupon from '../models/Coupon.js';
import Setting from '../models/Setting.js';
import { protect } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
import { COD_ADVANCE_PAISE } from '../config/paymentConstants.js';
import { buildParcelGuruOrderPayload, pushOrder } from '../services/parcelGuru.js';

dotenv.config();

const router = express.Router();
const SHIPPING_CONFIG_KEY = 'shippingConfig';
const DEFAULT_SHIPPING_CONFIG = {
  freeShippingThreshold: 2000,
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

// Server-side coupon validation (never trust client-sent discount amounts)
const validateCouponForOrder = async (code, cartTotal, userId) => {
  if (!code) return { discount: 0, coupon: null };

  const coupon = await Coupon.findOne({ code: code.toUpperCase().trim() });
  if (!coupon || !coupon.isActive) return { discount: 0, coupon: null };
  if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) return { discount: 0, coupon: null };
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) return { discount: 0, coupon: null };

  const userUsageCount = coupon.usedBy.filter((u) => u.user.toString() === userId.toString()).length;
  if (coupon.perUserLimit && userUsageCount >= coupon.perUserLimit) return { discount: 0, coupon: null };

  if (cartTotal < coupon.minOrderAmount) return { discount: 0, coupon: null };

  let discount = 0;
  if (coupon.discountType === 'percentage') {
    discount = (cartTotal * coupon.discountValue) / 100;
    if (coupon.maxDiscount && discount > coupon.maxDiscount) discount = coupon.maxDiscount;
  } else {
    discount = coupon.discountValue;
  }
  if (discount > cartTotal) discount = cartTotal;

  return { discount: Math.round(discount), coupon };
};

// Test route to verify payment routes are working
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Payment routes are working',
  });
});

/** Public — COD advance matches `create-order` + Razorpay (restart server after changing COD_ADVANCE_PAISE). */
router.get('/cod-advance', (req, res) => {
  res.json({
    success: true,
    data: {
      paise: COD_ADVANCE_PAISE,
      rupees: COD_ADVANCE_PAISE / 100,
    },
  });
});

// Initialize Razorpay
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  Razorpay keys not found in environment variables. Payment gateway will not work.');
}

const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })
  : null;

// Create Razorpay order
router.post('/create-order', protect, async (req, res) => {
  try {
    if (!razorpay) {
      return res.status(500).json({
        success: false,
        message: 'Payment gateway is not configured. Please contact administrator.',
      });
    }

    const { shippingAddress, purpose, couponCode } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty',
      });
    }

    // COD: charge only advance online; order is created after payment via /orders/create
    if (purpose === 'cod_advance') {
      const razorpayOrder = await razorpay.orders.create({
        amount: COD_ADVANCE_PAISE,
        currency: 'INR',
        receipt: `cod_adv_${Date.now()}`,
        notes: {
          type: 'cod_advance',
          userId: req.user._id.toString(),
        },
      });

      return res.status(200).json({
        success: true,
        data: {
          orderId: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: 'INR',
          key: process.env.RAZORPAY_KEY_ID,
        },
      });
    }

    // Calculate total amount (in paise for Razorpay)
    const subtotal = cart.items.reduce((total, item) => {
      const itemPrice = item.product?.price || item.product?.finalPrice || item.price || 0;
      const boxPrice = Number(item.boxPrice) || 0;
      return total + (itemPrice + boxPrice) * item.quantity;
    }, 0);

    // Re-validate coupon on the server — never trust a discount amount sent from the browser
    const { discount, coupon: appliedCouponDoc } = await validateCouponForOrder(couponCode, subtotal, req.user._id);
    const discountedSubtotal = Math.max(0, subtotal - discount);

    const { freeShippingThreshold, shippingCharge } = await getShippingConfig();
    const shippingAmount = discountedSubtotal > freeShippingThreshold ? 0 : shippingCharge;
    const totalAmount = discountedSubtotal + shippingAmount;

    const amountInPaise = Math.round(totalAmount * 100); // Convert to paise

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: req.user._id.toString(),
        cartId: cart._id.toString(),
      },
    });

    // Create order in database (pending payment)
    const order = await Order.create({
      user: req.user._id,
      items: cart.items.map((item) => {
        const itemPrice = item.product?.price || item.product?.finalPrice || item.price || 0;
        return {
          product: item.product,
          quantity: item.quantity,
          size: item.size || '',
          color: item.color || '',
          price: itemPrice,
        };
      }),
      totalAmount,
      coupon: appliedCouponDoc ? { code: appliedCouponDoc.code, discount } : { code: '', discount: 0 },
      shippingAddress: shippingAddress || req.user.address || {},
      paymentMethod: 'razorpay',
      status: 'pending',
      razorpayOrderId: razorpayOrder.id,
    });

    res.status(200).json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        amount: amountInPaise,
        currency: 'INR',
        key: process.env.RAZORPAY_KEY_ID,
        order: order,
      },
    });
  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating payment order',
      error: error.message,
    });
  }
});

// Verify payment and update order
router.post('/verify-payment', protect, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed',
      });
    }

    // Find order by Razorpay order ID (full online prepay flow)
    let order = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
      user: req.user._id,
    });

    // COD advance: no DB order until /orders/create — verify signature + Razorpay order
    if (!order) {
      let rzOrder;
      try {
        rzOrder = await razorpay.orders.fetch(razorpay_order_id);
      } catch (e) {
        return res.status(400).json({
          success: false,
          message: 'Could not verify payment order',
        });
      }
      const notes = rzOrder.notes || {};
      const uid = notes.userId != null ? String(notes.userId) : '';
      if (
        Number(rzOrder.amount) !== COD_ADVANCE_PAISE ||
        String(notes.type || '') !== 'cod_advance' ||
        uid !== req.user._id.toString()
      ) {
        return res.status(400).json({
          success: false,
          message: 'Invalid advance payment',
        });
      }
      return res.status(200).json({
        success: true,
        message: 'Advance payment verified',
        data: { codAdvance: true },
      });
    }

    // Update order with payment details
    order.paymentId = razorpay_payment_id;
    order.paymentSignature = razorpay_signature;
    order.status = 'processing';
    order.paymentStatus = 'paid';
    await order.save();

    // Mark coupon as used (so usage limits / per-user limits actually work)
    if (order.coupon?.code) {
      try {
        await Coupon.updateOne(
          { code: order.coupon.code },
          {
            $inc: { usedCount: 1 },
            $push: { usedBy: { user: req.user._id, usedAt: new Date() } },
          }
        );
      } catch (couponErr) {
        console.error('Coupon usage update failed:', couponErr?.message || couponErr);
      }
    }

    try {
      const parcelGuruPayload = buildParcelGuruOrderPayload(order, {
        customerEmail: req.user?.email || '',
      });

      console.log("🚀 ParcelGuru Payload:", JSON.stringify(parcelGuruPayload, null, 2));

      const pgResult = await pushOrder(parcelGuruPayload);

      console.log("✅ ParcelGuru push result:", JSON.stringify(pgResult, null, 2));
    } catch (pgError) {
      console.error("❌ ParcelGuru push failed:", pgError?.message || pgError);
    }

    // Clear cart
    const cart = await Cart.findOne({ user: req.user._id });
    if (cart) {
      cart.items = [];
      await cart.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      data: { order },
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message,
    });
  }
});

export default router;
