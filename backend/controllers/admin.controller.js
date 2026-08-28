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

const slugifySubCategory = (text) =>
  String(text || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const sanitizeSubCategory = (sub) => {
  const parts = Array.isArray(sub)
    ? sub
    : String(sub || '').split(',');
  return parts
    .map((s) => {
      const trimmed = String(s).trim();
      return slugifySubCategory(trimmed) || trimmed;
    })
    .filter(Boolean)
    .join(', ');
};

const parseBooleanFlag = (value) => {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return undefined;
};

/** Infer gender from nav category slug so mens/womens watch pages resolve correctly. */
const inferGenderFromCategory = (category, explicitGender) => {
  if (explicitGender !== undefined && explicitGender !== null && String(explicitGender).trim() !== '') {
    return String(explicitGender).trim().toLowerCase();
  }
  const cat = String(category || '').toLowerCase();
  if (cat.includes('womens-watch') || cat === 'women' || cat.startsWith('women')) return 'women';
  if (cat.includes('mens-watch') || cat === 'men' || cat.startsWith('men')) return 'men';
  if (cat.includes('watch')) return 'unisex';
  return undefined;
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
    let query = {};
    if (category) {
      const cat = String(category).toLowerCase().trim();
      const slugOr = {
        'mens-watches': [
          { category: 'mens-watches' },
          { category: 'watches', gender: /^men$/i },
          { category: 'watches', gender: /^unisex$/i },
        ],
        'womens-watches': [
          { category: 'womens-watches' },
          { category: 'watches', gender: /^women$/i },
          { category: 'watches', gender: /^unisex$/i },
        ],
        watches: [{ category: 'watches' }, { category: 'mens-watches' }, { category: 'womens-watches' }],
      };
      query = slugOr[cat] ? { $or: slugOr[cat] } : { category: cat };
    }
    const products = await Product.find(query).sort({ updatedAt: -1 }).limit(1000).lean();
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
    const inferredGender = inferGenderFromCategory(cat, productData.gender);
    const createPayload = {
      name: (productData.name || '').trim(),
      brand: (productData.brand || '').trim(),
      category: cat,
      subCategory: sanitizeSubCategory(subCategory || productData.subCategory),
      ...(inferredGender && { gender: inferredGender }),
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
      isActive: parseBooleanFlag(productData.isActive) !== false,
      inStock: stockNum > 0,
      rating: Number(productData.rating ?? 0),
      ratingsCount: Number(productData.ratingsCount ?? 0),
      reviewsCount: Number(productData.reviewsCount ?? 0),
      ...(productData.sizes && { sizes: productData.sizes }),
      ...(productData.thumbnail && { thumbnail: productData.thumbnail }),
      ...(productData.color && { color: productData.color }),
      ...(productData.colorOptions && { colorOptions: productData.colorOptions }),
        ...(productData.colorVariants && { colorVariants: productData.colorVariants }),
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
    // Only apply fields that are actually present — so Live on Site toggles
    // ({ isActive: false }) never wipe price/stock/subCategory by accident.
    const body = req.body || {};
    const { category, subCategory, ...productData } = body;
    const updatePayload = {};

    if (productData.name !== undefined) updatePayload.name = String(productData.name || '').trim();
    if (productData.brand !== undefined) updatePayload.brand = String(productData.brand || '').trim();
    if (category !== undefined) {
      const cat = String(category).toLowerCase();
      updatePayload.category = cat;
      const inferred = inferGenderFromCategory(cat, productData.gender);
      if (inferred) updatePayload.gender = inferred;
    } else if (productData.gender !== undefined) {
      updatePayload.gender = productData.gender;
    }
    if (subCategory !== undefined) updatePayload.subCategory = sanitizeSubCategory(subCategory);

    if (productData.price !== undefined) {
      const price = Number(productData.price);
      updatePayload.price = price;
      updatePayload.finalPrice = price;
    }
    if (productData.originalPrice !== undefined) {
      const price = Number(productData.price ?? productData.originalPrice ?? 0);
      updatePayload.originalPrice = Number(productData.originalPrice) || price;
    }
    if (productData.discountPercent !== undefined) {
      updatePayload.discountPercent = Number(productData.discountPercent);
    }
    if (productData.stock !== undefined) {
      const stockNum = Number(productData.stock ?? 0);
      updatePayload.stock = stockNum;
      updatePayload.inStock = stockNum > 0;
    }
    if (productData.images !== undefined) {
      updatePayload.images = Array.isArray(productData.images) ? productData.images : [];
    }
    if (productData.description !== undefined) {
      updatePayload.description = String(productData.description || '').trim();
    }
    if (productData.isNewArrival !== undefined) updatePayload.isNewArrival = Boolean(productData.isNewArrival);
    if (productData.onSale !== undefined) updatePayload.onSale = Boolean(productData.onSale);
    if (productData.isFeatured !== undefined) updatePayload.isFeatured = Boolean(productData.isFeatured);

    // Persist Live on Site even when it is the only field in the request
    if (Object.prototype.hasOwnProperty.call(body, 'isActive')) {
      const flag = parseBooleanFlag(body.isActive);
      if (flag !== undefined) updatePayload.isActive = flag;
    }

    if (productData.colorOptions !== undefined) updatePayload.colorOptions = productData.colorOptions;
    if (productData.colorVariants !== undefined) updatePayload.colorVariants = productData.colorVariants;
    if (productData.boxOptions !== undefined) updatePayload.boxOptions = productData.boxOptions;
    if (productData.pageNumberAll !== undefined) updatePayload.pageNumberAll = Number(productData.pageNumberAll ?? 0);
    if (productData.pageNumberCategory !== undefined) {
      updatePayload.pageNumberCategory = Number(productData.pageNumberCategory ?? 0);
    }
    if (productData.model !== undefined) updatePayload.model = String(productData.model || '').trim();
    if (productData.functions !== undefined) updatePayload.functions = String(productData.functions || '').trim();
    if (productData.dialColor !== undefined) updatePayload.dialColor = String(productData.dialColor || '').trim();
    if (productData.dialSize !== undefined) updatePayload.dialSize = String(productData.dialSize || '').trim();
    if (productData.strapColor !== undefined) updatePayload.strapColor = String(productData.strapColor || '').trim();
    if (productData.strapMaterial !== undefined) updatePayload.strapMaterial = String(productData.strapMaterial || '').trim();
    if (productData.crystalMaterial !== undefined) {
      updatePayload.crystalMaterial = String(productData.crystalMaterial || '').trim();
    }
    if (productData.lockType !== undefined) updatePayload.lockType = String(productData.lockType || '').trim();
    if (productData.waterResistance !== undefined) {
      updatePayload.waterResistance = String(productData.waterResistance || '').trim();
    }
    if (productData.calendarType !== undefined) updatePayload.calendarType = String(productData.calendarType || '').trim();
    if (productData.movement !== undefined) updatePayload.movement = String(productData.movement || '').trim();
    if (productData.itemWeight !== undefined) updatePayload.itemWeight = String(productData.itemWeight || '').trim();
    if (productData.quality !== undefined) updatePayload.quality = String(productData.quality || '').trim();
    if (productData.warranty !== undefined) updatePayload.warranty = String(productData.warranty || '').trim();

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields to update',
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: updatePayload },
      { new: true, runValidators: false }
    );
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
    let path = item.path && item.path.trim()
      ? item.path.trim()
      : `${basePath}?subCategory=${slugify(item.subCategory || name)}`;
    if (!/[?&]subCategory=/.test(path)) {
      path += `${path.includes('?') ? '&' : '?'}subCategory=${slugify(item.subCategory || name)}`;
    }
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
