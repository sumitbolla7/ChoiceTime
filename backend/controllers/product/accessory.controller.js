import Accessory from '../../models/product/accessory.model.js';
import Shoes from '../../models/product/shoes.model.js';

// Helper function to normalize old schema to common format
const normalizeOldAccessory = (product) => {
  const normalized = product.toObject ? product.toObject() : product;
  
  // Keep images as array (frontend expects array format)
  let imagesArray = [];
  if (normalized.images && Array.isArray(normalized.images)) {
    imagesArray = normalized.images.filter(img => img);
  } else if (normalized.thumbnail) {
    imagesArray = [normalized.thumbnail];
  } else if (normalized.image) {
    imagesArray = [normalized.image];
  }

  // Calculate prices
  const mrp = normalized.price || normalized.mrp || normalized.originalPrice || 0;
  const discountPercent = normalized.discountPercent || 0;
  const finalPrice = normalized.finalPrice || (discountPercent > 0 ? mrp - (mrp * discountPercent / 100) : mrp);
  const originalPrice = normalized.originalPrice || mrp;

  return {
    ...normalized,
    title: normalized.name || normalized.title,
    name: normalized.name || normalized.title,
    mrp: mrp,
    price: mrp,
    originalPrice: originalPrice,
    finalPrice: finalPrice,
    discountPercent: discountPercent,
    images: imagesArray.length > 0 ? imagesArray : [],
    product_info: normalized.product_info || {
      brand: normalized.brand || '',
      manufacturer: normalized.specifications?.manufacturer || '',
    },
    category: normalized.category || 'Accessories',
    subCategory: normalized.subCategory || '',
    _schemaType: 'old'
  };
};

// Helper function to normalize new schema shoes to common format
const normalizeNewShoes = (product) => {
  const normalized = product.toObject ? product.toObject() : product;
  
  // Convert images object to array format
  let imagesArray = [];
  if (normalized.images && typeof normalized.images === 'object' && !Array.isArray(normalized.images)) {
    const imageKeys = Object.keys(normalized.images).sort((a, b) => {
      const numA = parseInt(a.replace('image', '')) || 0;
      const numB = parseInt(b.replace('image', '')) || 0;
      return numA - numB;
    });
    imagesArray = imageKeys
      .map(key => normalized.images[key])
      .filter(img => img && typeof img === 'string' && img.trim() !== '');
  } else if (Array.isArray(normalized.images)) {
    imagesArray = normalized.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
  }

  if (imagesArray.length === 0) {
    if (normalized.thumbnail) {
      imagesArray = [normalized.thumbnail];
    } else if (normalized.image) {
      imagesArray = [normalized.image];
    } else if (normalized.images && typeof normalized.images === 'object') {
      const firstImage = Object.values(normalized.images).find(img => img && typeof img === 'string' && img.trim() !== '');
      if (firstImage) {
        imagesArray = [firstImage];
      }
    }
  }

  const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;

  // Calculate prices
  const mrp = normalized.mrp || normalized.price || 0;
  const discountPercent = normalized.discountPercent || 0;
  const finalPrice = discountPercent > 0 ? mrp - (mrp * discountPercent / 100) : mrp;
  const originalPrice = mrp;

  // Extract sizes from product_info.availableSizes or use sizes field
  const sizes = normalized.product_info?.availableSizes || normalized.sizes || [];

  return {
    ...normalized,
    name: normalized.title || normalized.name,
    price: mrp,
    originalPrice: originalPrice,
    finalPrice: finalPrice,
    discountPercent: discountPercent,
    images: imagesArray,
    image: firstImage,
    thumbnail: firstImage,
    subCategory: 'shoes', // Map to subCategory for frontend compatibility
    sizes: sizes,
    imagesObject: normalized.images,
    _schemaType: 'new-shoes'
  };
};

// Helper function to build query for old schema
const buildOldAccessoryQuery = (reqQuery) => {
  const query = {};

  if (reqQuery.gender) {
    query.gender = reqQuery.gender.toLowerCase();
  }

  if (reqQuery.subCategory) {
    query.subCategory = reqQuery.subCategory;
  }

  if (reqQuery.isNewArrival === 'true') {
    query.isNewArrival = true;
  }

  if (reqQuery.onSale === 'true') {
    query.onSale = true;
  }

  if (reqQuery.isFeatured === 'true') {
    query.isFeatured = true;
  }

  if (reqQuery.search) {
    query.$text = { $search: reqQuery.search };
  }

  query.isActive = { $ne: false };
  return query;
};

// Helper function to build query for new schema shoes
const buildNewShoesQuery = (reqQuery) => {
  const query = {};

  // Always include shoe products from new schema
  query.category = { 
    $regex: /^shoe/i  // Matches Shoes, Shoe, shoes, SHOES, etc.
  };

  if (reqQuery.category) {
    const cat = reqQuery.category.toString().toLowerCase();
    if (!cat.includes('shoe')) {
      query._id = null; // Return no results for non-shoe categories
    }
  }

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

// @desc    Get all accessories from both collections
// @route   GET /api/products/accessories
// @access  Public
export const getAccessories = async (req, res) => {
  try {
    const {
      gender,
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

    // Build queries for both schemas
    const oldQuery = buildOldAccessoryQuery({ gender, subCategory, isNewArrival, onSale, isFeatured, search });
    const newQuery = buildNewShoesQuery({ category, categoryId, isNewArrival, onSale, search });

    // Always fetch from both collections (similar to watches)
    const [oldProducts, newProducts] = await Promise.all([
      Accessory.find(oldQuery).lean(),
      Shoes.find(newQuery).lean()
    ]);

    // Normalize both schemas to common format
    const normalizedOld = oldProducts.map(normalizeOldAccessory);
    const normalizedNew = newProducts.map(normalizeNewShoes);

    // Combine and sort all products
    let allProducts = [...normalizedOld, ...normalizedNew];

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
    console.error('Get accessories error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching accessories',
      error: error.message,
    });
  }
};

// @desc    Get single accessory from both collections
// @route   GET /api/products/accessories/:id
// @access  Public
export const getAccessoryById = async (req, res) => {
  try {
    // Try to find in both collections
    const [oldProduct, newProduct] = await Promise.all([
      Accessory.findById(req.params.id).lean(),
      Shoes.findById(req.params.id).lean()
    ]);

    let product = null;
    if (oldProduct) {
      product = normalizeOldAccessory(oldProduct);
    } else if (newProduct) {
      product = normalizeNewShoes(newProduct);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Accessory not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { product: product },
    });
  } catch (error) {
    console.error('Get accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching accessory',
      error: error.message,
    });
  }
};

// @desc    Create accessory
// @route   POST /api/products/accessories
// @access  Private/Admin
export const createAccessory = async (req, res) => {
  try {
    const accessory = await Accessory.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Accessory created successfully',
      data: { product: accessory },
    });
  } catch (error) {
    console.error('Create accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating accessory',
      error: error.message,
    });
  }
};

// @desc    Update accessory
// @route   PUT /api/products/accessories/:id
// @access  Private/Admin
export const updateAccessory = async (req, res) => {
  try {
    const accessory = await Accessory.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Accessory not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Accessory updated successfully',
      data: { product: accessory },
    });
  } catch (error) {
    console.error('Update accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating accessory',
      error: error.message,
    });
  }
};

// @desc    Delete accessory
// @route   DELETE /api/products/accessories/:id
// @access  Private/Admin
export const deleteAccessory = async (req, res) => {
  try {
    const accessory = await Accessory.findByIdAndDelete(req.params.id);

    if (!accessory) {
      return res.status(404).json({
        success: false,
        message: 'Accessory not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Accessory deleted successfully',
    });
  } catch (error) {
    console.error('Delete accessory error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting accessory',
      error: error.message,
    });
  }
};

