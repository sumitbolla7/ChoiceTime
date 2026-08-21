import User from '../models/User.js';
import Order from '../models/Order.js';
import { applyCancellationRefunds } from '../services/orderCancellationRefunds.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Review from '../models/Review.js';
import ShippingReturnPolicy from '../models/ShippingReturnPolicy.js';
import ReturnRequest from '../models/ReturnRequest.js';
import Setting from '../models/Setting.js';
import Watch from '../models/product/watch.model.js';
import WatchNew from '../models/product/watchNew.model.js';
import Men from '../models/product/menModel.js';
import Women from '../models/product/womenModel.js';
import Accessory from '../models/product/accessory.model.js';
import Lens from '../models/product/lens.model.js';
import Shoes from '../models/product/shoes.model.js';
import MenTshirt from '../models/product/menTshirt.model.js';

const sanitizeSubCategory = (sub) => {
  if (Array.isArray(sub)) {
    return sub.map(s => String(s).trim()).filter(Boolean);
  }
  return typeof sub === 'string' ? sub.trim() : sub;
};

export const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalOrders,
      pendingOrders,
      totalRevenue,
      totalProducts,
      categoryCountsArr,
    ] = await Promise.all([
      User.countDocuments(),
      Order.countDocuments(),
      Order.countDocuments({ status: 'pending' }),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Product.countDocuments(),
      Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
    ]);

    const categoryCounts = {};
    (categoryCountsArr || []).forEach(({ _id, count }) => {
      if (_id) categoryCounts[_id] = count;
    });
    const inventory = { ...categoryCounts };

    res.status(200).json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        pendingOrders,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalProducts,
        inventory,
        categoryCounts,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard summary',
      error: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email')
      .sort({ orderDate: -1 });

    res.status(200).json({
      success: true,
      data: { orders },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching orders',
      error: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value',
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const previousStatus = order.status;

    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      const refundResult = await applyCancellationRefunds(order, previousStatus);
      if (!refundResult.ok) {
        return res.status(502).json({
          success: false,
          message: refundResult.error || 'Refund failed. Order status was not changed.',
        });
      }
    }

    order.status = status;
    order.deliveredDate = status === 'delivered' ? new Date() : order.deliveredDate;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order status updated',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating order status',
      error: error.message,
    });
  }
};

/** Must match ParcelGuru shipment "order_id" in webhooks if not using MongoDB _id. */
export const updateOrderParcelGuruReference = async (req, res) => {
  try {
    const orderReference = typeof req.body.orderReference === 'string' ? req.body.orderReference.trim() : '';
    if (!orderReference) {
      return res.status(400).json({
        success: false,
        message: 'orderReference is required',
      });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (!order.parcelGuru) order.parcelGuru = {};
    order.parcelGuru.orderReference = orderReference;
    await order.save();

    res.status(200).json({
      success: true,
      message: 'ParcelGuru order reference updated',
      data: { order },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating ParcelGuru reference',
      error: error.message,
    });
  }
};

export const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting order',
      error: error.message,
    });
  }
};

export const getAdminProducts = async (req, res) => {
  try {
    const { category } = req.query;
    const query = category ? { category: String(category).toLowerCase() } : {};
    const products = await Product.find(query).sort({ updatedAt: -1 }).limit(200).lean();
    res.status(200).json({
      success: true,
      data: { products },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    let { category, subCategory, ...productData } = req.body;
    const cat = (category || 'men').toString().toLowerCase();
    const price = Number(productData.price ?? 0);
    const originalPrice = Number(productData.originalPrice ?? productData.price ?? 0);
    const stockNum = Number(productData.stock ?? 0);
    const imagesArr = Array.isArray(productData.images) ? productData.images : [];
    const createPayload = {
      name: (productData.name || '').trim(),
      brand: (productData.brand || '').trim(),
      category: cat,
      subCategory: sanitizeSubCategory(subCategory || productData.subCategory),
      gender: productData.gender || undefined,
      price,
      originalPrice: originalPrice || price,
      discountPercent: Number(productData.discountPercent ?? 0),
      finalPrice: price,
      stock: stockNum,
      images: imagesArr,
      description: (productData.description || '').trim(),
      isNewArrival: Boolean(productData.isNewArrival),
      onSale: Boolean(productData.onSale),
      isFeatured: Boolean(productData.isFeatured),
      isActive: productData.isActive !== undefined ? Boolean(productData.isActive) : true,
      inStock: stockNum > 0,
      rating: Number(productData.rating ?? 0),
      ratingsCount: Number(productData.ratingsCount ?? 0),
      reviewsCount: Number(productData.reviewsCount ?? 0),
      ...(productData.sizes && { sizes: productData.sizes }),
      ...(productData.thumbnail && { thumbnail: productData.thumbnail }),
      ...(productData.color && { color: productData.color }),
      ...(productData.colorOptions && { colorOptions: productData.colorOptions }),
      ...(productData.boxOptions && { boxOptions: productData.boxOptions }),
      ...(productData.productDetails && { productDetails: productData.productDetails }),
      // Page position fields
      pageNumberAll: Number(productData.pageNumberAll ?? 0),
      pageNumberCategory: Number(productData.pageNumberCategory ?? 0),
      // Watch specific fields
      ...(productData.model && { model: (productData.model || '').trim() }),
      ...(productData.functions && { functions: (productData.functions || '').trim() }),
      ...(productData.dialColor && { dialColor: (productData.dialColor || '').trim() }),
      ...(productData.dialSize && { dialSize: (productData.dialSize || '').trim() }),
      ...(productData.strapColor && { strapColor: (productData.strapColor || '').trim() }),
      ...(productData.strapMaterial && { strapMaterial: (productData.strapMaterial || '').trim() }),
      ...(productData.crystalMaterial && { crystalMaterial: (productData.crystalMaterial || '').trim() }),
      ...(productData.lockType && { lockType: (productData.lockType || '').trim() }),
      ...(productData.waterResistance && { waterResistance: (productData.waterResistance || '').trim() }),
      ...(productData.calendarType && { calendarType: (productData.calendarType || '').trim() }),
      ...(productData.movement && { movement: (productData.movement || '').trim() }),
      ...(productData.itemWeight && { itemWeight: (productData.itemWeight || '').trim() }),
      ...(productData.quality && { quality: (productData.quality || '').trim() }),
      ...(productData.warranty && { warranty: (productData.warranty || '').trim() }),
    };
    const product = await Product.create(createPayload);
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating product',
      error: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    let { category, subCategory, ...productData } = req.body;
    const price = Number(productData.price ?? 0);
    const originalPrice = Number(productData.originalPrice ?? productData.price ?? 0);
    const stockNum = Number(productData.stock ?? 0);
    const imagesArr = Array.isArray(productData.images) ? productData.images : [];
    const updatePayload = {
      ...(productData.name !== undefined && { name: (productData.name || '').trim() }),
      ...(productData.brand !== undefined && { brand: (productData.brand || '').trim() }),
      ...(category !== undefined && { category: String(category).toLowerCase() }),
      ...(subCategory !== undefined && { subCategory: sanitizeSubCategory(subCategory) }),
      ...(productData.gender !== undefined && { gender: productData.gender }),
      ...(productData.price !== undefined && { price, finalPrice: price }),
      ...(productData.originalPrice !== undefined && { originalPrice: originalPrice || price }),
      ...(productData.discountPercent !== undefined && { discountPercent: Number(productData.discountPercent) }),
      ...(productData.stock !== undefined && { stock: stockNum }),
      ...(productData.images !== undefined && { images: imagesArr }),
      ...(productData.description !== undefined && { description: (productData.description || '').trim() }),
      ...(productData.isNewArrival !== undefined && { isNewArrival: Boolean(productData.isNewArrival) }),
      ...(productData.onSale !== undefined && { onSale: Boolean(productData.onSale) }),
      ...(productData.isFeatured !== undefined && { isFeatured: Boolean(productData.isFeatured) }),
      ...(productData.isActive !== undefined && { isActive: Boolean(productData.isActive) }),
      ...(productData.stock !== undefined && { inStock: stockNum > 0 }),
      ...(productData.colorOptions !== undefined && { colorOptions: productData.colorOptions }),
      ...(productData.boxOptions !== undefined && { boxOptions: productData.boxOptions }),
      // Page position fields
      ...(productData.pageNumberAll !== undefined && { pageNumberAll: Number(productData.pageNumberAll ?? 0) }),
      ...(productData.pageNumberCategory !== undefined && { pageNumberCategory: Number(productData.pageNumberCategory ?? 0) }),
      // Watch specific fields
      ...(productData.model !== undefined && { model: (productData.model || '').trim() }),
      ...(productData.functions !== undefined && { functions: (productData.functions || '').trim() }),
      ...(productData.dialColor !== undefined && { dialColor: (productData.dialColor || '').trim() }),
      ...(productData.dialSize !== undefined && { dialSize: (productData.dialSize || '').trim() }),
      ...(productData.strapColor !== undefined && { strapColor: (productData.strapColor || '').trim() }),
      ...(productData.strapMaterial !== undefined && { strapMaterial: (productData.strapMaterial || '').trim() }),
      ...(productData.crystalMaterial !== undefined && { crystalMaterial: (productData.crystalMaterial || '').trim() }),
      ...(productData.lockType !== undefined && { lockType: (productData.lockType || '').trim() }),
      ...(productData.waterResistance !== undefined && { waterResistance: (productData.waterResistance || '').trim() }),
      ...(productData.calendarType !== undefined && { calendarType: (productData.calendarType || '').trim() }),
      ...(productData.movement !== undefined && { movement: (productData.movement || '').trim() }),
      ...(productData.itemWeight !== undefined && { itemWeight: (productData.itemWeight || '').trim() }),
      ...(productData.quality !== undefined && { quality: (productData.quality || '').trim() }),
      ...(productData.warranty !== undefined && { warranty: (productData.warranty || '').trim() }),
    };
    const product = await Product.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Sync update to secondary collections
    try {
      const syncFilter = { $or: [{ _id: req.params.id }, { name: product.name }, { title: product.name }] };
      const syncUpdate = { $set: updatePayload };
      await Promise.allSettled([
        Watch.updateMany(syncFilter, syncUpdate),
        WatchNew.updateMany(syncFilter, syncUpdate),
        Men.updateMany(syncFilter, syncUpdate),
        Women.updateMany(syncFilter, syncUpdate),
        Accessory.updateMany(syncFilter, syncUpdate),
        Lens.updateMany(syncFilter, syncUpdate),
        Shoes.updateMany(syncFilter, syncUpdate),
        MenTshirt.updateMany(syncFilter, syncUpdate),
      ]);
    } catch (syncErr) {
      console.error('Secondary collections update sync error:', syncErr);
    }
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating product',
      error: error.message,
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching users',
      error: error.message,
    });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting user',
      error: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    try {
      const syncFilter = { $or: [{ _id: req.params.id }] };
      await Promise.allSettled([
        Watch.deleteMany(syncFilter),
        WatchNew.deleteMany(syncFilter),
        Men.deleteMany(syncFilter),
        Women.deleteMany(syncFilter),
        Accessory.deleteMany(syncFilter),
        Lens.deleteMany(syncFilter),
        Shoes.deleteMany(syncFilter),
        MenTshirt.deleteMany(syncFilter),
      ]);
    } catch (delErr) {
      console.error('Secondary collections delete sync error:', delErr);
    }
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting product',
      error: error.message,
    });
  }
};

export const getAdminReviews = async (req, res) => {
  try {
    const { productId, status, search } = req.query;
    const query = {};

    if (productId) query.productId = String(productId).trim();
    if (status) query.status = String(status).trim().toLowerCase();
    if (search && String(search).trim()) {
      const term = String(search).trim();
      query.$or = [
        { title: { $regex: term, $options: 'i' } },
        { comment: { $regex: term, $options: 'i' } },
        { userName: { $regex: term, $options: 'i' } },
        { userEmail: { $regex: term, $options: 'i' } },
      ];
    }

    const reviews = await Review.find(query).sort({ createdAt: -1 }).limit(300).lean();

    res.status(200).json({
      success: true,
      data: { reviews },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching reviews',
      error: error.message,
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting review',
      error: error.message,
    });
  }
};

// --- Nav Categories (admin CRUD) ---
// Path = /{slug}; subItem path = /{slug}?subCategory={slugifiedName}
function slugify(text) {
  return (text || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'sub';
}

function normalizeSubItems(subItems, categorySlug) {
  if (!Array.isArray(subItems)) return [];
  return subItems.map((item) => {
    const name = (item.name || '').trim();
    if (!name) return null;
    const basePath = `/${categorySlug}`;
    const path = item.path && item.path.trim()
      ? item.path.trim()
      : `${basePath}?subCategory=${slugify(item.subCategory || name)}`;
    return { name, path };
  }).filter(Boolean);
}

export const getAdminCategories = async (req, res) => {
  try {
    const categories = await Category.find().sort({ order: 1 });
    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching categories',
      error: error.message,
    });
  }
};

export const createCategory = async (req, res) => {
  try {
    const { name, slug: slugInput, subItems, order } = req.body;
    if (!(name && (name || '').trim())) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
      });
    }
    const slugNorm = (slugInput && slugInput.trim())
      ? slugInput.trim().toLowerCase().replace(/\s+/g, '-')
      : (name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const path = `/${slugNorm}`;
    const normalizedSubItems = normalizeSubItems(subItems, slugNorm);
    const category = await Category.create({
      name: (name || '').trim(),
      slug: slugNorm,
      path,
      order: Number.isFinite(Number(order)) ? Number(order) : await Category.countDocuments(),
      subItems: normalizedSubItems,
    });
    res.status(201).json({
      success: true,
      message: 'Category created',
      data: { category },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this slug already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error creating category',
      error: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { name, slug: slugInput, subItems, order } = req.body;
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    if (name !== undefined && (name || '').trim()) category.name = (name || '').trim();
    const slugNorm = (slugInput !== undefined && slugInput && slugInput.trim())
      ? slugInput.trim().toLowerCase().replace(/\s+/g, '-')
      : (category.name || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    if (slugInput !== undefined) category.slug = slugNorm;
    category.path = `/${category.slug}`;
    if (Array.isArray(subItems)) {
      category.subItems = normalizeSubItems(subItems, category.slug);
    }
    if (order !== undefined && Number.isFinite(Number(order))) {
      category.order = Number(order);
    }
    await category.save();
    res.status(200).json({
      success: true,
      message: 'Category updated',
      data: { category },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A category with this slug already exists',
      });
    }
    res.status(500).json({
      success: false,
      message: 'Error updating category',
      error: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Category deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting category',
      error: error.message,
    });
  }
};

// ========== Shipping & Returns Policy (for product page) ==========
export const getShippingReturnPolicies = async (req, res) => {
  try {
    const policies = await ShippingReturnPolicy.find().sort({ order: 1 });
    res.status(200).json({
      success: true,
      data: { policies },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching shipping & returns policies',
      error: error.message,
    });
  }
};

export const createShippingReturnPolicy = async (req, res) => {
  try {
    const { title, description, iconColor, order } = req.body;
    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required',
      });
    }
    const policy = await ShippingReturnPolicy.create({
      title: (title || '').trim(),
      description: (description || '').trim(),
      iconColor: ['green', 'blue', 'purple'].includes(iconColor) ? iconColor : 'green',
      order: typeof order === 'number' ? order : await ShippingReturnPolicy.countDocuments(),
    });
    res.status(201).json({
      success: true,
      message: 'Policy created',
      data: { policy },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating policy',
      error: error.message,
    });
  }
};

export const updateShippingReturnPolicy = async (req, res) => {
  try {
    const { title, description, iconColor, order } = req.body;
    const policy = await ShippingReturnPolicy.findById(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found',
      });
    }
    if (title !== undefined) policy.title = (title || '').trim();
    if (description !== undefined) policy.description = (description || '').trim();
    if (['green', 'blue', 'purple'].includes(iconColor)) policy.iconColor = iconColor;
    if (typeof order === 'number') policy.order = order;
    await policy.save();
    res.status(200).json({
      success: true,
      message: 'Policy updated',
      data: { policy },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating policy',
      error: error.message,
    });
  }
};

export const deleteShippingReturnPolicy = async (req, res) => {
  try {
    const policy = await ShippingReturnPolicy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        message: 'Policy not found',
      });
    }
    res.status(200).json({
      success: true,
      message: 'Policy deleted',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting policy',
      error: error.message,
    });
  }
};

// ========== Return Order Management ==========
export const getReturnRequests = async (req, res) => {
  try {
    const list = await ReturnRequest.find()
      .populate('order', 'orderDate status totalAmount items')
      .populate('user', 'name email phone')
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: { returns: list } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching return requests',
      error: error.message,
    });
  }
};

export const updateReturnStatus = async (req, res) => {
  try {
    const { status, adminNotes } = req.body;
    const valid = ['pending', 'approved', 'rejected', 'completed'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    const doc = await ReturnRequest.findByIdAndUpdate(
      req.params.id,
      { status, adminNotes: adminNotes !== undefined ? adminNotes : undefined, updatedAt: new Date() },
      { new: true }
    )
      .populate('order', 'orderDate status totalAmount')
      .populate('user', 'name email phone');
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Return request not found' });
    }
    res.status(200).json({ success: true, data: { return: doc } });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating return request',
      error: error.message,
    });
  }
};

const SCRATCH_POPUP_KEY = 'scratchCardPopupActive';

export const getScratchCardPopupActive = async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: SCRATCH_POPUP_KEY });
    const active = doc != null && doc.value === false ? false : true;
    res.status(200).json({ success: true, data: { active } });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message, data: { active: true } });
  }
};

export const updateScratchCardPopupActive = async (req, res) => {
  try {
    const { active } = req.body;
    const value = active === true || active === 'true';
    await Setting.findOneAndUpdate(
      { key: SCRATCH_POPUP_KEY },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: { active: value } });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
};

const ORDER_TIMELINE_KEY = 'orderTimeline';
const SHIPPING_CONFIG_KEY = 'shippingConfig';
const DEFAULT_ORDER_TIMELINE = {
  deliveryDaysMin: 5,
  deliveryDaysMax: 7,
  steps: [
    { label: 'Order confirmed', timeEstimate: 'Just now' },
    { label: 'Processing', timeEstimate: 'Within 24hrs' },
    { label: 'Shipped', timeEstimate: '2-3 days' },
    { label: 'Delivered', timeEstimate: 'On delivery date' },
  ],
};
const DEFAULT_SHIPPING_CONFIG = {
  freeShippingThreshold: 2000,
  shippingCharge: 50,
};

export const getOrderTimeline = async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: ORDER_TIMELINE_KEY });
    const value = doc?.value && typeof doc.value === 'object' ? doc.value : DEFAULT_ORDER_TIMELINE;
    const merged = {
      deliveryDaysMin: value.deliveryDaysMin ?? DEFAULT_ORDER_TIMELINE.deliveryDaysMin,
      deliveryDaysMax: value.deliveryDaysMax ?? DEFAULT_ORDER_TIMELINE.deliveryDaysMax,
      steps: Array.isArray(value.steps) && value.steps.length > 0 ? value.steps : DEFAULT_ORDER_TIMELINE.steps,
    };
    res.status(200).json({ success: true, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message, data: DEFAULT_ORDER_TIMELINE });
  }
};

export const updateOrderTimeline = async (req, res) => {
  try {
    const { deliveryDaysMin, deliveryDaysMax, steps } = req.body;
    const value = {
      deliveryDaysMin: typeof deliveryDaysMin === 'number' ? deliveryDaysMin : parseInt(deliveryDaysMin, 10) || 5,
      deliveryDaysMax: typeof deliveryDaysMax === 'number' ? deliveryDaysMax : parseInt(deliveryDaysMax, 10) || 7,
      steps: Array.isArray(steps) && steps.length > 0 ? steps : DEFAULT_ORDER_TIMELINE.steps,
    };
    await Setting.findOneAndUpdate(
      { key: ORDER_TIMELINE_KEY },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: value });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
};

export const getShippingConfig = async (req, res) => {
  try {
    const doc = await Setting.findOne({ key: SHIPPING_CONFIG_KEY });
    const value = doc?.value && typeof doc.value === 'object' ? doc.value : DEFAULT_SHIPPING_CONFIG;
    const parsedThreshold = Number(value.freeShippingThreshold);
    const parsedShippingCharge = Number(value.shippingCharge);
    const merged = {
      freeShippingThreshold: Number.isFinite(parsedThreshold)
        ? Math.max(0, parsedThreshold)
        : DEFAULT_SHIPPING_CONFIG.freeShippingThreshold,
      shippingCharge: Number.isFinite(parsedShippingCharge)
        ? Math.max(0, parsedShippingCharge)
        : DEFAULT_SHIPPING_CONFIG.shippingCharge,
    };
    res.status(200).json({ success: true, data: merged });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message, data: DEFAULT_SHIPPING_CONFIG });
  }
};

export const updateShippingConfig = async (req, res) => {
  try {
    const { freeShippingThreshold, shippingCharge } = req.body;
    const value = {
      freeShippingThreshold: Math.max(0, Number(freeShippingThreshold) || DEFAULT_SHIPPING_CONFIG.freeShippingThreshold),
      shippingCharge: Math.max(0, Number(shippingCharge) || 0),
    };
    await Setting.findOneAndUpdate(
      { key: SHIPPING_CONFIG_KEY },
      { value, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    res.status(200).json({ success: true, data: value });
  } catch (err) {
    res.status(500).json({ success: false, message: err?.message });
  }
};
