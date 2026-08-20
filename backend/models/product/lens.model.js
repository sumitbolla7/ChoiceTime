import mongoose from 'mongoose';

const lensSchema = new mongoose.Schema({
  productId: {
    type: String,
    unique: true,
    sparse: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  brand: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    default: 'lens',
    immutable: true,
  },
  subCategory: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  mrp: {
    type: Number,
    min: 0,
  },
  gender: {
    type: String,
    enum: ['men', 'women', 'unisex', 'Men', 'Women'],
    trim: true,
  },
  frameColor: String,
  templeColor: String,
  frameMaterial: String,
  frameShape: String,
  rimDetails: String,
  warranty: String,
  sku: String,
  dimensions: {
    lensWidth: String,
    bridgeWidth: String,
    templeLength: String,
    lensHeight: String,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviews: {
    type: Number,
    default: 0,
    min: 0,
  },
  reviewsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  images: [{
    type: String,
  }],
  thumbnail: {
    type: String,
  },
  description: {
    type: String,
  },
  isNewArrival: {
    type: Boolean,
    default: false,
  },
  onSale: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  inStock: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

lensSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// Indexes
lensSchema.index({ category: 1, gender: 1 });
lensSchema.index({ name: 'text', brand: 'text', description: 'text' });

const Lens = mongoose.model('Lens', lensSchema, 'lenses');

export default Lens;

