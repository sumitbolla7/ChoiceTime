import Lens from '../../models/product/lens.model.js';

// @desc    Get all lenses
// @route   GET /api/products/lens
// @access  Public
export const getLenses = async (req, res) => {
  try {
    const {
      gender,
      subCategory,
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

    if (gender) {
      query.gender = gender.toLowerCase();
    }

    if (subCategory) {
      query.subCategory = subCategory;
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

    const lenses = await Lens.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum);

    const total = await Lens.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products: lenses,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    console.error('Get lenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lenses',
      error: error.message,
    });
  }
};

// @desc    Get single lens
// @route   GET /api/products/lens/:id
// @access  Public
export const getLensById = async (req, res) => {
  try {
    const lens = await Lens.findById(req.params.id);

    if (!lens) {
      return res.status(404).json({
        success: false,
        message: 'Lens not found',
      });
    }

    res.status(200).json({
      success: true,
      data: { product: lens },
    });
  } catch (error) {
    console.error('Get lens error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching lens',
      error: error.message,
    });
  }
};

// @desc    Create lens
// @route   POST /api/products/lens
// @access  Private/Admin
export const createLens = async (req, res) => {
  try {
    const lens = await Lens.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Lens created successfully',
      data: { product: lens },
    });
  } catch (error) {
    console.error('Create lens error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating lens',
      error: error.message,
    });
  }
};

// @desc    Update lens
// @route   PUT /api/products/lens/:id
// @access  Private/Admin
export const updateLens = async (req, res) => {
  try {
    const lens = await Lens.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!lens) {
      return res.status(404).json({
        success: false,
        message: 'Lens not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lens updated successfully',
      data: { product: lens },
    });
  } catch (error) {
    console.error('Update lens error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating lens',
      error: error.message,
    });
  }
};

// @desc    Delete lens
// @route   DELETE /api/products/lens/:id
// @access  Private/Admin
export const deleteLens = async (req, res) => {
  try {
    const lens = await Lens.findByIdAndDelete(req.params.id);

    if (!lens) {
      return res.status(404).json({
        success: false,
        message: 'Lens not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Lens deleted successfully',
    });
  } catch (error) {
    console.error('Delete lens error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting lens',
      error: error.message,
    });
  }
};

