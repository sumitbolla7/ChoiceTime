import mongoose from 'mongoose';

const watchSchema = new mongoose.Schema({
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
    default: 'watches',
    immutable: true,
  },
  subCategory: {
    type: mongoose.Schema.Types.Mixed,
    default: ''
  },
  gender: {
    type: String,
    enum: ['men', 'women', 'unisex'],
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  originalPrice: {
    type: Number,
    min: 0,
  },
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  finalPrice: {
    type: Number,
    min: 0,
  },
  images: [{
    type: String,
  }],
  thumbnail: {
    type: String,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  ratingsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  reviewsCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  dialColor: String,
  bandColor: String,
  bandMaterial: String,
  displayType: String,
  movementType: String,
  glassMaterial: String,
  waterResistance: String,
  caseMaterial: String,
  caseShape: String,
  caseWidth: String,
  caseLength: String,
  caseThickness: String,
  warranty: String,
  productDetails: {
    modelNumber: String,
    function: String,
    collection: String,
    strapMaterial: String,
    strapColor: String,
    lockMechanism: String,
    movement: String,
    sunMoonPhase: Boolean,
    specialFeatures: [String],
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

// Calculate finalPrice before saving
watchSchema.pre('save', function (next) {
  if (this.discountPercent > 0 && this.price) {
    this.finalPrice = this.price - (this.price * this.discountPercent / 100);
  } else if (this.originalPrice && this.price) {
    this.finalPrice = this.price;
  } else {
    this.finalPrice = this.price;
  }
  this.updatedAt = Date.now();
  next();
});

// Indexes
watchSchema.index({ category: 1, gender: 1 });
watchSchema.index({ name: 'text', brand: 'text', description: 'text' });

const Watch = mongoose.model('Watch', watchSchema, 'watches');

export default Watch;

