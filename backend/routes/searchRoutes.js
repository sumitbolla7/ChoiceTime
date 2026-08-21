import express from 'express';
import Product from '../models/Product.js';

const router = express.Router();

/**
 * GET /api/search?q=keyword&limit=50&page=1
 * Search products by name, brand, category, subCategory, and description
 */
router.get('/', async (req, res) => {
  try {
    const { q, limit = 50, page = 1 } = req.query;

    if (!q || !String(q).trim()) {
      return res.status(200).json({
        success: true,
        data: { products: [], total: 0 },
      });
    }

    const searchTerm = String(q).trim();
    const limitNum = Math.min(parseInt(limit, 10) || 50, 200);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNum - 1) * limitNum;

    // Build search query - search across name, brand, category, subCategory, description
    const searchRegex = new RegExp(searchTerm, 'i');

    const searchQuery = {
      isActive: { $ne: false },
      $or: [
        { name: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { subCategory: searchRegex },
        { description: searchRegex },
      ],
    };

    const [products, total] = await Promise.all([
      Product.find(searchQuery)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Product.countDocuments(searchQuery),
    ]);

    res.status(200).json({
      success: true,
      data: {
        products,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching products',
      error: error.message,
    });
  }
});

export default router;
