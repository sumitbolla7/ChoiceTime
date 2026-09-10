import { useState, useEffect } from 'react';
import { X, ShoppingCart, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastContainer';
import { Link } from 'react-router-dom';
import {
  listProductColorVariants,
  pickDefaultColor,
  galleryForColor,
  findVariantByColor,
  isVariantInStock,
  swatchCssColor,
  productSnapshotForCart,
  colorSlug,
} from '../utils/colorVariants';

const ProductQuickView = ({ product, isOpen, onClose }) => {
  const { addToCart, isProductInCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { success, error: showError } = useToast();
  
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedBoxType, setSelectedBoxType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState(product?.images?.[0] || product?.image || '');

  const isWatch = (product?.category || '').toLowerCase().includes('watch');

  useEffect(() => {
    if (product) {
      setSelectedSize(isWatch ? '' : (product.sizes?.[0] || ''));
      const initialColor = pickDefaultColor(product);
      setSelectedColor(initialColor);
      const gallery = galleryForColor(product, initialColor);
      setMainImage(gallery[0] || product.images?.[0] || product.image || '');
      const firstBox = product.boxOptions?.[0];
      setSelectedBoxType(firstBox ? (typeof firstBox === 'string' ? firstBox : firstBox.name) : '');
    }
  }, [product, isWatch]);

  if (!isOpen || !product) return null;

  const quickViewProductId = product._id || product.id;
  const colorChoices = listProductColorVariants(product);
  const alreadyInCart = isProductInCart(quickViewProductId, selectedColor);
  const activeColor = findVariantByColor(product, selectedColor);
  const galleryImages = galleryForColor(product, selectedColor);
  const variantPrice =
    activeColor?.price !== null && activeColor?.price !== undefined ? Number(activeColor.price) : null;
  const price =
    variantPrice !== null && !Number.isNaN(variantPrice)
      ? variantPrice
      : product.price || product.finalPrice;
  const originalPrice = product.originalPrice || product.mrp || 0;
  const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;
  const outOfStock = activeColor ? !isVariantInStock(activeColor, product) : false;

  // Get box price for the selected box type
  const getQuickViewBoxPrice = () => {
    if (!selectedBoxType || !product?.boxOptions?.length) return 0;
    const found = product.boxOptions.find((opt) =>
      typeof opt === 'string' ? opt === selectedBoxType : opt.name === selectedBoxType
    );
    if (!found || typeof found === 'string') return 0;
    return Number(found.price) || 0;
  };

  const handleAddToCart = async () => {
    if (alreadyInCart || outOfStock) return;
    try {
      await addToCart(
        productSnapshotForCart(product, selectedColor),
        quantity,
        selectedSize,
        selectedColor,
        selectedBoxType,
        getQuickViewBoxPrice()
      );
      success('Product added to cart');
      onClose();
    } catch (err) {
      showError(err.message || 'Failed to add to cart');
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      showError('Please login to add items to wishlist');
      return;
    }
    try {
      await toggleWishlist(product._id || product.id);
      success(isInWishlist(product._id || product.id) ? 'Removed from wishlist' : 'Added to wishlist');
    } catch (err) {
      showError(err.message || 'Failed to update wishlist');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium text-gray-900">Quick View</h3>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Images */}
              <div>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img src={mainImage || galleryImages[0]} alt={product.name} className="w-full h-full object-cover" />
                </div>
                {galleryImages.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {galleryImages.slice(0, 4).map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMainImage(img)}
                        className={`flex-shrink-0 w-20 h-20 rounded border-2 overflow-hidden ${
                          mainImage === img ? 'border-gray-900' : 'border-gray-200'
                        }`}
                      >
                        <img src={img} alt={`${product.name} ${idx + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h2>
                {product.brand && <p className="text-sm text-gray-600 mb-4">{product.brand}</p>}

                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-2xl font-bold text-gray-900">₹{price.toLocaleString()}</span>
                  {discount > 0 && (
                    <>
                      <span className="text-lg text-gray-500 line-through">₹{originalPrice.toLocaleString()}</span>
                      <span className="text-sm font-medium text-green-600">{discount}% OFF</span>
                    </>
                  )}
                </div>

                {/* Sizes (skip for watches) */}
                {!isWatch && product.sizes && product.sizes.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                    <div className="flex flex-wrap gap-2">
                      {product.sizes.map((size) => (
                        <button
                          key={size}
                          onClick={() => setSelectedSize(size)}
                          className={`px-4 py-2 border rounded-lg text-sm ${
                            selectedSize === size
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Colors */}
                {colorChoices.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                    <div className="flex gap-2 flex-wrap">
                      {colorChoices.map((variant) => {
                        const isSelected = selectedColor?.toLowerCase() === variant.color?.toLowerCase();
                        const cssColor = swatchCssColor(variant);
                        const thumb = variant.images?.[0];
                        return (
                          <button
                            key={variant.color}
                            type="button"
                            title={variant.color}
                            onClick={() => {
                              setSelectedColor(variant.color);
                              const next = galleryForColor(product, variant.color);
                              if (next[0]) setMainImage(next[0]);
                            }}
                            className={`w-10 h-10 rounded-full border-2 overflow-hidden ${
                              isSelected ? 'border-gray-900' : 'border-gray-300'
                            }`}
                            style={!thumb && cssColor ? { backgroundColor: cssColor } : undefined}
                          >
                            {thumb ? (
                              <img src={thumb} alt={variant.color} className="w-full h-full object-cover" />
                            ) : !cssColor ? (
                              <span className="text-[9px] leading-none">{variant.color.slice(0, 3)}</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Box Type */}
                {product.boxOptions && product.boxOptions.length > 0 && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Box Type</label>
                    <div className="flex flex-wrap gap-2">
                      {product.boxOptions.map((boxOpt) => {
                        const boxName = typeof boxOpt === 'string' ? boxOpt : boxOpt.name;
                        const boxPrice = typeof boxOpt === 'string' ? 0 : (Number(boxOpt.price) || 0);
                        return (
                          <button
                            key={boxName}
                            onClick={() => setSelectedBoxType(boxName)}
                            className={`px-3 py-2 border rounded-lg text-sm ${
                              selectedBoxType === boxName
                                ? 'border-gray-900 bg-gray-900 text-white'
                                : 'border-gray-300 hover:border-gray-400'
                            }`}
                          >
                            {boxName} <span className="text-xs opacity-75">{boxPrice > 0 ? `+₹${boxPrice}` : 'FREE'}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center"
                    >
                      -
                    </button>
                    <span className="w-12 text-center font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-10 h-10 border border-gray-300 rounded-lg flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={alreadyInCart || outOfStock}
                    className={`flex-1 px-6 py-3 rounded-lg flex items-center justify-center gap-2 ${
                      alreadyInCart
                        ? 'bg-green-100 text-green-800 border border-green-200 cursor-not-allowed'
                        : outOfStock
                          ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                    }`}
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {alreadyInCart ? 'Already in Cart' : outOfStock ? 'Out of stock' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleWishlistToggle}
                    className={`px-4 py-3 border rounded-lg flex items-center justify-center ${
                      isInWishlist(product._id || product.id)
                        ? 'border-red-500 text-red-500'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isInWishlist(product._id || product.id) ? 'fill-current' : ''}`} />
                  </button>
                </div>

                <Link
                  to={`/product/${product._id || product.id}${selectedColor ? `?color=${encodeURIComponent(colorSlug(selectedColor))}` : ''}`}
                  onClick={onClose}
                  className="block mt-4 text-center text-sm text-gray-600 hover:text-gray-900 underline"
                >
                  View Full Details
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductQuickView;

