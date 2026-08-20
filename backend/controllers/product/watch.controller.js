import Watch from '../../models/product/watch.model.js';
import WatchNew from '../../models/product/watchNew.model.js';

// Helper function to normalize old schema to common format
const normalizeOldWatch = (watch) => {
  const normalized = watch.toObject ? watch.toObject() : watch;
  
  // Keep images as array (frontend expects array format)
  let imagesArray = [];
  if (normalized.images && Array.isArray(normalized.images)) {
    imagesArray = normalized.images.filter(img => img); // Remove empty/null values
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
    // Map old schema fields to common format
    title: normalized.name || normalized.title,
    name: normalized.name || normalized.title, // Keep name for frontend compatibility
    mrp: mrp,
    price: mrp, // Keep price for frontend (use mrp as base)
    originalPrice: originalPrice,
    finalPrice: finalPrice, // Ensure finalPrice is always set
    discountPercent: discountPercent,
    // Keep images as array for frontend compatibility
    images: imagesArray.length > 0 ? imagesArray : [],
    // Map product_info if not present
    product_info: normalized.product_info || {
      brand: normalized.brand || '',
      manufacturer: normalized.productDetails?.manufacturer || '',
      IncludedComponents: normalized.productDetails?.IncludedComponents || ''
    },
    // Ensure category is set
    category: normalized.category || 'WATCHES',
    // Keep original schema indicator
    _schemaType: 'old'
  };
};

// Helper function to normalize new schema to common format
const normalizeNewWatch = (watch) => {
  const normalized = watch.toObject ? watch.toObject() : watch;
  
  // Convert images object to array format (frontend expects array)
  let imagesArray = [];
  if (normalized.images && typeof normalized.images === 'object' && !Array.isArray(normalized.images)) {
    // Convert object with image1, image2, etc. to array
    const imageKeys = Object.keys(normalized.images).sort((a, b) => {
      // Sort by image1, image2, image3, image4
      const numA = parseInt(a.replace('image', '')) || 0;
      const numB = parseInt(b.replace('image', '')) || 0;
      return numA - numB;
    });
    imagesArray = imageKeys
      .map(key => normalized.images[key])
      .filter(img => img && typeof img === 'string' && img.trim() !== ''); // Remove empty values
  } else if (Array.isArray(normalized.images)) {
    // If it's already an array, use it
    imagesArray = normalized.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
  }

  // Fallback to thumbnail or image if images array is empty
  if (imagesArray.length === 0) {
    if (normalized.thumbnail) {
      imagesArray = [normalized.thumbnail];
    } else if (normalized.image) {
      imagesArray = [normalized.image];
    } else if (normalized.images && typeof normalized.images === 'object') {
      // Try to get any image from the object
      const firstImage = Object.values(normalized.images).find(img => img && typeof img === 'string' && img.trim() !== '');
      if (firstImage) {
        imagesArray = [firstImage];
      }
    }
  }

  // Also set image and thumbnail fields for frontend fallback compatibility
  const firstImage = imagesArray.length > 0 ? imagesArray[0] : null;

  // Calculate prices
  const mrp = normalized.mrp || normalized.price || 0;
  const discountPercent = normalized.discountPercent || 0;
  const finalPrice = discountPercent > 0 ? mrp - (mrp * discountPercent / 100) : mrp;
  const originalPrice = mrp; // For new schema, mrp is the original price

  return {
    ...normalized,
    // Add name field for frontend compatibility (use title)
    name: normalized.title || normalized.name,
    // Add price field for frontend compatibility (use mrp)
    price: mrp,
    originalPrice: originalPrice,
    finalPrice: finalPrice, // Ensure finalPrice is always calculated
    discountPercent: discountPercent,
    // Convert images object to array for frontend
    images: imagesArray,
    // Add image and thumbnail fields for frontend fallback
    image: firstImage,
    thumbnail: firstImage,
    // Keep original images object for reference
    imagesObject: normalized.images,
    // New schema already has the right format, just add indicator
    _schemaType: 'new'
  };
};

// Helper function to build query for old schema
const buildOldWatchQuery = (reqQuery) => {
  const query = {};

  if (reqQuery.gender) {
    query.gender = reqQuery.gender.toLowerCase();
  }

  if (reqQuery.subCategory) {
    const normalized = (reqQuery.subCategory || '').toString().trim();
    if (normalized) {
      query.subCategory = { $regex: new RegExp(`^${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') };
    }
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

// Helper function to build query for new schema
const buildNewWatchQuery = (reqQuery) => {
  const query = {};

  if (reqQuery.category) {
    query.category = reqQuery.category.toUpperCase();
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

  if (reqQuery.isFeatured === 'true') {
    query.isFeatured = true;
  }

  if (reqQuery.search) {
    query.$text = { $search: reqQuery.search };
  }

  query.isActive = { $ne: false };
  return query;
};

// @desc    Get all watches from both collections
// @route   GET /api/products/watches
// @access  Public
export const getWatches = async (req, res) => {
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
    const oldQuery = buildOldWatchQuery({ gender, subCategory, isNewArrival, onSale, isFeatured, search });
    const newQuery = buildNewWatchQuery({ category, categoryId, isNewArrival, onSale, isFeatured, search });

    // Fetch from both collections in parallel
    const [oldWatches, newWatches] = await Promise.all([
      Watch.find(oldQuery).lean(),
      WatchNew.find(newQuery).lean()
    ]);

    // Normalize both schemas to common format
    const normalizedOld = oldWatches.map(normalizeOldWatch);
    const normalizedNew = newWatches.map(normalizeNewWatch);

    // Combine and sort all watches
    let allWatches = [...normalizedOld, ...normalizedNew];

    // Sort combined results
    const sortOrder = order === 'asc' ? 1 : -1;
    allWatches.sort((a, b) => {
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
    const total = allWatches.length;
    const skip = (pageNum - 1) * limitNum;
    const paginatedWatches = allWatches.slice(skip, skip + limitNum);

    res.status(200).json({
      success: true,
      data: {
        products: paginatedWatches,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get watches error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching watches',
      error: error.message,
    });
  }
};

// @desc    Get single watch from both collections
// @route   GET /api/products/watches/:id
// @access  Public
export const getWatchById = async (req, res) => {
  try {
    // Try to find in both collections
    const [oldWatch, newWatch] = await Promise.all([
      Watch.findById(req.params.id).lean(),
      WatchNew.findById(req.params.id).lean()
    ]);

    let watch = null;
    if (oldWatch) {
      watch = normalizeOldWatch(oldWatch);
    } else if (newWatch) {
      watch = normalizeNewWatch(newWatch);
    }

    if (!watch) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { product: watch },
    });
  } catch (error) {
    console.error('Get watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching watch',
      error: error.message,
    });
  }
};

// @desc    Create watch
// @route   POST /api/products/watches
// @access  Private/Admin
export const createWatch = async (req, res) => {
  try {
    const watch = await Watch.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Watch created successfully',
      data: { product: watch },
    });
  } catch (error) {
    console.error('Create watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating watch',
      error: error.message,
    });
  }
};

// @desc    Update watch
// @route   PUT /api/products/watches/:id
// @access  Private/Admin
export const updateWatch = async (req, res) => {
  try {
    const watch = await Watch.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!watch) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Watch updated successfully',
      data: { product: watch },
    });
  } catch (error) {
    console.error('Update watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating watch',
      error: error.message,
    });
  }
};

// @desc    Delete watch
// @route   DELETE /api/products/watches/:id
// @access  Private/Admin
export const deleteWatch = async (req, res) => {
  try {
    const watch = await Watch.findByIdAndDelete(req.params.id);

    if (!watch) {
      return res.status(404).json({
        success: false,
        message: 'Watch not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Watch deleted successfully',
    });
  } catch (error) {
    console.error('Delete watch error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting watch',
      error: error.message,
    });
  }
};

