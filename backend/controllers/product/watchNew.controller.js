import WatchNew from '../../models/product/watchNew.model.js';

// @desc    Get all watches (new schema)
// @route   GET /api/products/watch-new
// @access  Public
export const getWatchesNew = async (req, res) => {
  try {
    const {
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

    const query = { isActive: { $ne: false } };

    if (category) {
      query.category = category.toUpperCase();
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (isNewArrival === 'true') {
      query.isNewArrival = true;
    }

    if (onSale === 'true') {
      query.onSale = true;
    }

    if (isFeatured === 'true') {
      query.isFeatured = true;
    }

    if (search) {
      query.$text = { $search: search };
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const sortObj = {};
    sortObj[sort] = order === 'asc' ? 1 : -1;

    const watches = await WatchNew.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const total = await WatchNew.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products: watches,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get watches (new) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching watches',
      error: error.message,
    });
  }
};

// @desc    Get single watch (new schema)
// @route   GET /api/products/watch-new/:id
// @access  Public
export const getWatchByIdNew = async (req, res) => {
  try {
    const watch = await WatchNew.findById(req.params.id);

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
    console.error('Get watch (new) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching watch',
      error: error.message,
    });
  }
};

// @desc    Create watch (new schema)
// @route   POST /api/products/watch-new
// @access  Private/Admin
export const createWatchNew = async (req, res) => {
  try {
    // Ensure category is uppercase
    if (req.body.category) {
      req.body.category = req.body.category.toUpperCase();
    }

    const watch = await WatchNew.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Watch created successfully',
      data: { product: watch },
    });
  } catch (error) {
    console.error('Create watch (new) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating watch',
      error: error.message,
    });
  }
};

// @desc    Update watch (new schema)
// @route   PUT /api/products/watch-new/:id
// @access  Private/Admin
export const updateWatchNew = async (req, res) => {
  try {
    // Ensure category is uppercase if provided
    if (req.body.category) {
      req.body.category = req.body.category.toUpperCase();
    }

    const watch = await WatchNew.findByIdAndUpdate(
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
    console.error('Update watch (new) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating watch',
      error: error.message,
    });
  }
};

// @desc    Delete watch (new schema)
// @route   DELETE /api/products/watch-new/:id
// @access  Private/Admin
export const deleteWatchNew = async (req, res) => {
  try {
    const watch = await WatchNew.findByIdAndDelete(req.params.id);

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
    console.error('Delete watch (new) error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting watch',
      error: error.message,
    });
  }
};

