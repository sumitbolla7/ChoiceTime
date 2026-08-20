import Men from '../../models/product/menModel.js';
import MenTshirt from '../../models/product/menTshirt.model.js';
import Shoes from '../../models/product/shoes.model.js';

// Helper function to normalize old schema to common format
const normalizeOldMen = (product) => {
  const normalized = product.toObject ? product.toObject() : product;
  
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
    },
    // Ensure category is set
    category: normalized.category || 'men',
    subCategory: normalized.subCategory || '',
    // Keep original schema indicator
    _schemaType: 'old'
  };
};

// Helper function to normalize new schema shoes to common format (for men's section)
const normalizeNewShoesForMen = (product) => {
  const normalized = product.toObject ? product.toObject() : product;
  
  // Convert images object to array format (frontend expects array)
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
    category: 'men', // Set category to men for men's section
    imagesObject: normalized.images,
    _schemaType: 'new-shoes'
  };
};

// Helper function to normalize new schema to common format
const normalizeNewMenTshirt = (product) => {
  const normalized = product.toObject ? product.toObject() : product;
  
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
    // Map category to subCategory for frontend compatibility
    // New schema uses 'category' field (Tshirts, Tshirt, etc.), always map to 'tshirt' for consistency
    subCategory: 'tshirt', // Always set to 'tshirt' for new schema products since they're all t-shirts
    // Keep original images object for reference
    imagesObject: normalized.images,
    // New schema already has the right format, just add indicator
    _schemaType: 'new'
  };
};

// Helper function to build query for old schema
const buildOldMenQuery = (reqQuery) => {
  const query = {};

  // Subcategory filter (safe)
  if (reqQuery.subCategory) {
    const normalizedSubCategory = reqQuery.subCategory
      .toLowerCase()
      .trim()
      .replace(/-/g, '');

    query.subCategory = {
      $regex: new RegExp(`^${normalizedSubCategory}$`, 'i'),
    };
  }

  // Safe Boolean Filters
  if (reqQuery.isNewArrival === 'true') query.isNewArrival = true;
  if (reqQuery.onSale === 'true') query.onSale = true;

  // Safe Search Filter
  if (reqQuery.search) {
    query.$text = { $search: reqQuery.search };
  }

  query.isActive = { $ne: false };
  return query;
};

// Helper function to build query for new schema t-shirts
const buildNewMenTshirtQuery = (reqQuery) => {
  const query = {};

  // Always include t-shirt products from new schema (similar to watches)
  // The new schema only contains t-shirts, so we always query for them
  // Use case-insensitive regex to match any variation
  query.category = { 
    $regex: /^tshirt/i  // Matches Tshirts, Tshirt, tshirt, TSHIRT, etc.
  };

  // Only override if a specific category is provided and it's NOT a t-shirt variant
  if (reqQuery.category) {
    const cat = reqQuery.category.toString().toLowerCase();
    if (!cat.includes('tshirt')) {
      // For non-tshirt categories, return empty
      query._id = null; // This will return no results
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

// Helper function to build query for new schema shoes
const buildNewShoesQuery = (reqQuery) => {
  const query = {};

  // Always include shoe products from new schema
  // Use case-insensitive regex to match any variation
  query.category = { 
    $regex: /^shoe/i  // Matches Shoes, Shoe, shoes, SHOES, etc.
  };

  // Only override if a specific category is provided and it's NOT a shoe variant
  if (reqQuery.category) {
    const cat = reqQuery.category.toString().toLowerCase();
    if (!cat.includes('shoe')) {
      // For non-shoe categories, return empty
      query._id = null; // This will return no results
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

// @desc    Get all men's products from both collections
// @route   GET /api/products/men
// @access  Public
export const getMenItems = async (req, res) => {
  try {
    const {
      subCategory,
      category,
      categoryId,
      isNewArrival,
      onSale,
      search,
      page = 1,
      limit = 20,
      sort = 'createdAt',
      order = 'desc',
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Build queries for all schemas
    const oldQuery = buildOldMenQuery({ subCategory, isNewArrival, onSale, search });
    const newTshirtQuery = buildNewMenTshirtQuery({ subCategory, category, categoryId, isNewArrival, onSale, search });
    const newShoesQuery = buildNewShoesQuery({ subCategory, category, categoryId, isNewArrival, onSale, search });

    // Always fetch from all collections (similar to watches)
    // For t-shirts and shoes, we want both old and new schema products
    // For other subcategories, old schema will have results, new schemas might be empty
    const [oldProducts, newTshirtProducts, newShoesProducts] = await Promise.all([
      Men.find(oldQuery).lean(),
      MenTshirt.find(newTshirtQuery).lean(),
      Shoes.find(newShoesQuery).lean()
    ]);

    // Normalize all schemas to common format
    const normalizedOld = oldProducts.map(normalizeOldMen);
    const normalizedNewTshirts = newTshirtProducts.map(normalizeNewMenTshirt);
    const normalizedNewShoes = newShoesProducts.map(normalizeNewShoesForMen);

    // Combine and sort all products
    let allProducts = [...normalizedOld, ...normalizedNewTshirts, ...normalizedNewShoes];

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
    console.error('Get men items error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching men products',
      error: error?.message || "Unknown error",
    });
  }
};

// @desc    Get single men product from all collections
// @route   GET /api/products/men/:id
// @access  Public
export const getMenItemById = async (req, res) => {
  try {
    // Try to find in all collections
    const [oldProduct, newTshirtProduct, newShoesProduct] = await Promise.all([
      Men.findById(req.params.id).lean(),
      MenTshirt.findById(req.params.id).lean(),
      Shoes.findById(req.params.id).lean()
    ]);

    let product = null;
    if (oldProduct) {
      product = normalizeOldMen(oldProduct);
    } else if (newTshirtProduct) {
      product = normalizeNewMenTshirt(newTshirtProduct);
    } else if (newShoesProduct) {
      product = normalizeNewShoesForMen(newShoesProduct);
    }

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Men product not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { product: product },
    });

  } catch (error) {
    console.error('Get men item error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching men product',
      error: error?.message || "Unknown error",
    });
  }
};
