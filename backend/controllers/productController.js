import Product from '../models/Product.js';

/**
 * GET /api/products?category=men&subCategory=tshirt&gender=men&limit=100&search=...
 * Single products collection - filter by category and optional params.
 */
export const getProducts = async (req, res) => {
  try {
    const { category, subCategory, gender, limit = 500, search, isNewArrival, onSale, sort: sortParam, order: orderParam } = req.query;
    const query = {};

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
        watch: [{ category: 'watches' }, { category: 'mens-watches' }, { category: 'womens-watches' }],
      };
      if (slugOr[cat]) {
        query.$or = slugOr[cat];
      } else if (['men', 'women', 'lens', 'lenses', 'accessories', 'accessory', 'shoes', 'saree'].includes(cat)) {
        if (cat === 'lenses') query.category = 'lens';
        else if (cat === 'accessory') query.category = 'accessories';
        else query.category = cat;
      } else {
        query.category = cat;
      }
    }

    if (subCategory) {
      const escaped = String(subCategory).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const spaced = escaped.replace(/-/g, '[\\s-]*');
      // Match single or multi-company subCategory strings (e.g. "fossil, tissot")
      query.subCategory = new RegExp(spaced, 'i');
    }
    if (gender) query.gender = String(gender).toLowerCase().trim();
    // Hide products the admin has turned off, without deleting them
    query.isActive = { $ne: false };
    if (isNewArrival === 'true') query.isNewArrival = true;
    if (onSale === 'true') query.onSale = true;
    if (search && String(search).trim()) {
      const term = String(search).trim();
      const searchOr = [
        { name: { $regex: term, $options: 'i' } },
        { brand: { $regex: term, $options: 'i' } },
        { description: { $regex: term, $options: 'i' } },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else {
        query.$or = searchOr;
      }
    }

    const limitNum = Math.min(parseInt(limit, 10) || 500, 1000);
    const orderVal = orderParam === 'asc' ? 1 : -1;
    // When sort=updatedAt or sort=createdAt, use that for "latest first" (e.g. home Latest Products)
    let sortOption = {};
    if (sortParam === 'updatedAt' || sortParam === 'createdAt') {
      sortOption = { [sortParam]: orderVal };
    } else {
      const sortField = category ? 'pageNumberCategory' : 'pageNumberAll';
      sortOption = { [sortField]: 1, updatedAt: -1 };
    }
    const products = await Product.find(query)
      .sort(sortOption)
      .limit(limitNum)
      .lean();

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: { products, total },
    });
  } catch (error) {
    if (error.name === 'MongoError' && error.code === 17007) {
      return res.status(200).json({ success: true, data: { products: [], total: 0 } });
    }
    res.status(500).json({
      success: false,
      message: 'Error fetching products',
      error: error.message,
    });
  }
};

/**
 * GET /api/products/:id
 * Get single product by _id from products collection.
 */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).lean();
    if (!product || product.isActive === false) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }
    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching product',
      error: error.message,
    });
  }
};
