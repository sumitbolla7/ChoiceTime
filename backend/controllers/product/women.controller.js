import Women from '../../models/product/womenModel.js';
import Saree from '../../models/product/saree.model.js';

// Helper function to normalize old women schema
const normalizeOldWomen = (product) => ({
  ...product,
  _id: product._id,
  id: product._id,
  name: product.name || product.title,
  title: product.name || product.title,
  price: product.finalPrice || product.price,
  mrp: product.originalPrice || product.price,
  images: Array.isArray(product.images) ? product.images : (product.thumbnail ? [product.thumbnail] : []),
  category: 'women',
});

// Helper function to normalize saree schema
const normalizeSaree = (product) => {
  const normalized = product.toObject ? product.toObject() : product;
  
  // Convert images object to array format (frontend expects array)
  let imagesArray = [];
  if (normalized.images && typeof normalized.images === 'object' && !Array.isArray(normalized.images)) {
    imagesArray = [
      normalized.images.image1,
      normalized.images.image2,
      normalized.images.image3,
      normalized.images.image4,
    ].filter(Boolean);
  } else if (Array.isArray(normalized.images)) {
    imagesArray = normalized.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
  }

  // Calculate prices
  const mrp = normalized.mrp || 0;
  const discountPercent = normalized.discountPercent || 0;
  const finalPrice = normalized.finalPrice || (discountPercent > 0 ? mrp - (mrp * discountPercent / 100) : mrp);
  const originalPrice = mrp;

  // Extract brand from product_info
  const brand = normalized.product_info?.brand || normalized.brand || '';

  return {
    ...normalized,
    _id: normalized._id,
    id: normalized._id,
    name: normalized.title || normalized.name,
    title: normalized.title || normalized.name,
    price: finalPrice,
    mrp: mrp,
    originalPrice: originalPrice,
    finalPrice: finalPrice,
    discountPercent: discountPercent,
    images: imagesArray,
    brand: brand, // Extract brand to top level for filtering
    category: 'women',
    subCategory: 'saree',
    product_info: normalized.product_info || {},
  };
};

// Helper function to build query for old women schema
const buildOldWomenQuery = (reqQuery) => {
  const query = {};

  if (reqQuery.subCategory) {
    const normalizedSubCategory = reqQuery.subCategory.toLowerCase().trim().replace(/-/g, '');
    // Exclude saree from old schema
    if (normalizedSubCategory === 'saree') {
      query._id = null; // Return no results
      query.isActive = { $ne: false };
  return query;
    }
    query.subCategory = { $regex: new RegExp(`^${normalizedSubCategory}$`, 'i') };
  }

  if (reqQuery.isNewArrival === 'true') query.isNewArrival = true;
  if (reqQuery.onSale === 'true') query.onSale = true;
  if (reqQuery.isFeatured === 'true') query.isFeatured = true;

  if (reqQuery.search) {
    query.$text = { $search: reqQuery.search };
  }

  query.isActive = { $ne: false };
  return query;
};

// Helper function to build query for saree schema
const buildSareeQuery = (reqQuery) => {
  const query = {};

  // Since we're querying the Saree collection directly, all documents are sarees
  // No need to filter by category since the collection itself contains only sarees
  // But we can optionally match category if it contains "saree" or "sari"
  // This handles cases like "Banarasi Sarees", "Silk Saree", etc.
  
  if (reqQuery.subCategory) {
    const normalizedSubCategory = reqQuery.subCategory.toLowerCase().trim().replace(/-/g, '');
    if (normalizedSubCategory !== 'saree' && normalizedSubCategory !== 'sari') {
      // For non-saree subcategories, return empty
      query._id = null; // This will return no results
      query.isActive = { $ne: false };
  return query;
    }
    // If subCategory is saree, query all sarees (no category filter needed)
  }
  // If no subCategory filter, return all sarees from the collection

  if (reqQuery.categoryId) {
    query.categoryId = reqQuery.categoryId;
  }

  if (reqQuery.isNewArrival === 'true') {
    query.isNewArrival = true;
  }

  if (reqQuery.onSale === 'true') {
    query.onSale = true;
  }

  if (reqQuery.search) {
    query.$text = { $search: reqQuery.search };
  }

  query.isActive = { $ne: false };
  return query;
};

// @desc    Get all women's products (shirts, tshirts, jeans, trousers, sarees)
// @route   GET /api/products/women
// @access  Public
export const getWomenItems = async (req, res) => {
  try {
    const {
      subCategory,
      category,
      categoryId,
      isNewArrival,
      onSale,
      isFeatured,
      search,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build queries for all schemas
    const oldQuery = buildOldWomenQuery({ subCategory, isNewArrival, onSale, isFeatured, search });
    const sareeQuery = buildSareeQuery({ subCategory, category, categoryId, isNewArrival, onSale, search });

    // Fetch from both collections in parallel
    const [oldProducts, sareeProducts] = await Promise.all([
      Women.find(oldQuery).lean(),
      Saree.find(sareeQuery).lean()
    ]);

    // Debug logging
    console.log(`[Women Controller] Found ${oldProducts.length} old products, ${sareeProducts.length} saree products`);
    if (sareeProducts.length > 0) {
      console.log(`[Women Controller] Sample saree product:`, {
        title: sareeProducts[0].title,
        category: sareeProducts[0].category,
        hasProductInfo: !!sareeProducts[0].product_info,
        brand: sareeProducts[0].product_info?.brand
      });
    }

    // Normalize all schemas to common format
    const normalizedOld = oldProducts.map(normalizeOldWomen);
    const normalizedSarees = sareeProducts.map(normalizeSaree);

    // Combine and sort all products
    let allProducts = [...normalizedOld, ...normalizedSarees];

    // Sort combined results
    const sortOrder = order === 'asc' ? 1 : -1;
    allProducts.sort((a, b) => {
      let aVal, bVal;

      switch (sort) {
        case 'price':
        case 'mrp':
          aVal = a.mrp || a.price || 0;
          bVal = b.mrp || b.price || 0;
          break;
        case 'discountPercent':
          aVal = a.discountPercent || 0;
          bVal = b.discountPercent || 0;
          break;
        case 'title':
        case 'name':
          aVal = (a.title || a.name || '').toLowerCase();
          bVal = (b.title || b.name || '').toLowerCase();
          break;
        case 'createdAt':
        default:
          aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
      }

      if (typeof aVal === 'string') {
        return aVal.localeCompare(bVal) * sortOrder;
      }
      return (aVal - bVal) * sortOrder;
    });

    // Apply pagination after sorting
    const total = allProducts.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedProducts = allProducts.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: {
        products: paginatedProducts,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });

  } catch (error) {
    console.error('Get women items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching women products',
      error: error?.message || "Unknown error",
    });
  }
};

// @desc    Get single women product from all collections
// @route   GET /api/products/women/:id
// @access  Public
export const getWomenItemById = async (req, res) => {
  try {
    // Try to find in all collections
    const [oldProduct, sareeProduct] = await Promise.all([
      Women.findById(req.params.id).lean(),
      Saree.findById(req.params.id).lean()
    ]);

    let product = null;
    if (oldProduct) {
      product = normalizeOldWomen(oldProduct);
    } else if (sareeProduct) {
      product = normalizeSaree(sareeProduct);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Women product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { product: product },
    });

  } catch (error) {
    console.error('Get women item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching women product',
      error: error?.message || "Unknown error",
    });
  }
};


