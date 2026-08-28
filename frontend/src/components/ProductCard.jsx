import { useState, memo } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import LoginModal from './LoginModal';
import { handleImageError } from '../utils/imageFallback';

const ProductCard = ({ product }) => {
  const { addToCart, isProductInCart } = useCart();
  const { isAuthenticated } = useAuth();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const [isHovered, setIsHovered] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hoverImageLoaded, setHoverImageLoaded] = useState(false);
  const [shouldLoadHoverImage, setShouldLoadHoverImage] = useState(false);
  const [cartSuccessPopup, setCartSuccessPopup] = useState(false);

  // Data Normalization - support array, object { image1, image2, ... }, or single image/thumbnail
  let productImages = [];
  if (product.images) {
    if (Array.isArray(product.images)) {
      productImages = product.images.filter(img => img && typeof img === 'string' && img.trim() !== '');
    } else if (typeof product.images === 'object') {
      const keys = Object.keys(product.images).filter(k => product.images[k] && typeof product.images[k] === 'string' && product.images[k].trim() !== '');
      keys.sort((a, b) => {
        const nA = parseInt(String(a).replace(/\D/g, ''), 10) || 0;
        const nB = parseInt(String(b).replace(/\D/g, ''), 10) || 0;
        return nA - nB;
      });
      productImages = keys.map(k => product.images[k].trim());
    }
  }
  // Extract colorVariant images if product.images is empty
  if (productImages.length === 0 && Array.isArray(product.colorVariants) && product.colorVariants.length > 0) {
    const vImgs = product.colorVariants.map(v => typeof v === 'object' ? v.image : null).filter(img => img && typeof img === 'string' && img.trim() !== '');
    if (vImgs.length > 0) productImages = vImgs;
  }

  if (productImages.length === 0) {
    const fallbackImage =
      product.image ||
      product.thumbnail ||
      (product.images && product.images.image1) ||
      (product.images && product.images.image2) ||
      (product.images && product.images.image3) ||
      (product.images && product.images.image4);
    if (fallbackImage && typeof fallbackImage === 'string' && fallbackImage.trim() !== '') {
      productImages = [fallbackImage.trim()];
    }
  }
  
  const isWatch = (product.category || '').toLowerCase().includes('watch');
  const isLens = (product.category || '').toLowerCase().includes('lens');
  const sizes = isWatch ? [] : (product.sizes || ['S', 'M', 'L', 'XL']); 
  // Use price (admin's selling price) first, fallback to finalPrice
  const finalPrice = product.price || product.finalPrice || product.mrp || 0;
  const originalPrice = product.originalPrice || product.mrp || 0;
  const hasDiscount = originalPrice > 0 && originalPrice > finalPrice && finalPrice > 0;
  const productId = product._id || product.id;
  const isAlreadyInCart = isProductInCart(productId);

  // Stock logic (support multiple possible field names)
  const inStockFlag =
    typeof product?.inStock === 'boolean'
      ? product.inStock
      : typeof product?.in_stock === 'boolean'
        ? product.in_stock
        : null;

  const rawStock = product?.stock ?? product?.availableStock ?? product?.qtyInStock ?? null;
  const parsedStock = rawStock === null || rawStock === undefined ? null : Number(rawStock);
  const isOutOfStock = inStockFlag !== null ? !inStockFlag : parsedStock !== null && !Number.isNaN(parsedStock) ? parsedStock <= 0 : false;
  
  // Get the image source with fallback
  // For lenses, use the 2nd image (index 1) as default if available
  let defaultImageIndex = 0;
  if (isLens && productImages.length > 1) {
    defaultImageIndex = 1; // Use 2nd image (image2) for lenses
  }
  
  // Determine which images to show
  let defaultImageSrc = 'https://via.placeholder.com/400x500?text=No+Image';
  let hoverImageSrc = null;
  
  if (productImages.length > 0) {
    defaultImageSrc = productImages[defaultImageIndex];
    // Get hover image (next image if available)
    const hoverIndex = defaultImageIndex + 1;
    if (productImages.length > hoverIndex) {
      hoverImageSrc = productImages[hoverIndex];
    } else if (productImages.length > 0 && defaultImageIndex > 0) {
      // If no next image, try the first image as hover
      hoverImageSrc = productImages[0];
    }
  }

  const handleAddClick = (e) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (isOutOfStock) return;
    if (isAlreadyInCart) return;
    if (sizes.length > 0) {
      setShowSizes(true);
    } else {
      handleAddToCart(null);
    }
  };

  const handleAddToCart = async (selectedSize) => {
    if (!isAuthenticated) return setShowLoginModal(true);
    
    setIsAdding(true);
    try {
      await addToCart({ ...product, selectedSize });
      setCartSuccessPopup(true);
      setTimeout(() => setCartSuccessPopup(false), 2500);
      setTimeout(() => {
        setIsAdding(false);
        setShowSizes(false);
      }, 1000);
    } catch (err) {
      setIsAdding(false);
      if (err.message.includes('login')) setShowLoginModal(true);
    }
  };


  const wishlisted = productId ? isInWishlist(productId) : false;

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) return setShowLoginModal(true);
    try {
      await toggleWishlist(productId);
    } catch (error) {
      console.error('Wishlist error:', error);
    }
  };

  // Use stored discount % from admin directly, fallback to calculation
  const discountPercent = product.discountPercent > 0
    ? product.discountPercent
    : (hasDiscount ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0);

  return (
    <>
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      {cartSuccessPopup && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg whitespace-nowrap">
          Product added successfully
        </div>
      )}
      <div 
        className="group relative w-full h-full select-none transform-gpu bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col" 
        onMouseEnter={() => {
          setIsHovered(true);
          if (hoverImageSrc) setShouldLoadHoverImage(true);
        }}
        onMouseLeave={() => {
          setIsHovered(false);
          setShowSizes(false);
        }}
      >
        <Link to={`/product/${productId}`} className="flex flex-col flex-1">
          
          {/* IMAGE AREA */}
          <div className="relative aspect-square w-full overflow-hidden bg-gray-50">
            
            {/* Sale Badge */}
            {product.onSale && (
              <span className="absolute top-2 left-2 z-20 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wide">
                SALE
              </span>
            )}

            {/* Out of Stock Badge */}
            {isOutOfStock && (
              <span className="absolute top-2 left-2 z-20 bg-gray-900/90 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wide">
                OUT OF STOCK
              </span>
            )}

            {/* Wishlist Heart */}
            <button
              onClick={handleWishlistClick}
              className={`absolute top-2 right-2 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md hover:shadow-lg hover:scale-110 active:scale-95 ${
                wishlisted
                  ? 'bg-white ring-2 ring-red-400'
                  : 'bg-white/90 backdrop-blur-sm hover:bg-white'
              }`}
              aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            >
              <svg
                className={`w-[18px] h-[18px] transition-all duration-200 ${wishlisted ? 'text-red-500 fill-red-500 scale-110' : 'text-gray-500 hover:text-red-400'}`}
                fill={wishlisted ? 'currentColor' : 'none'}
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>

            {/* Base Image */}
            {defaultImageSrc && (
              <img
                src={defaultImageSrc}
                alt={product.name || product.title || 'Product'}
                onLoad={() => setImageLoaded(true)}
                decoding="async"
                loading="lazy"
                className={`
                  absolute inset-0 w-full h-full object-cover transition-all duration-500
                  ${imageLoaded ? 'opacity-100' : 'opacity-0'}
                  ${isHovered && hoverImageSrc && hoverImageLoaded ? 'opacity-0' : 'opacity-100'}
                `}
                onError={handleImageError}
              />
            )}

            {/* Hover Image */}
            {hoverImageSrc && shouldLoadHoverImage && (
              <>
                <img
                  src={hoverImageSrc}
                  alt=""
                  className="hidden"
                  onLoad={() => setHoverImageLoaded(true)}
                  decoding="async"
                  loading="lazy"
                />
                <img
                  src={hoverImageSrc}
                  alt={product.name || product.title || 'Product'}
                  className={`
                    absolute inset-0 w-full h-full object-cover transition-opacity duration-500
                    ${isHovered && hoverImageLoaded ? 'opacity-100' : 'opacity-0'}
                  `}
                  loading="lazy"
                  decoding="async"
                  onError={handleImageError}
                />
              </>
            )}

          </div>

          {/* PRODUCT INFO */}
          <div className="p-3 flex flex-col flex-1">
            {/* Brand / Category */}
            <p className="text-[11px] text-gray-400 uppercase tracking-wide font-medium mb-1">
              {product.brand || product.category || 'Brand'}
            </p>
            
            {/* Product Name - takes remaining space */}
            <h3 className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2 mb-2 flex-1">
              {product.name || product.title || 'Product Name'}
            </h3>
            
            {/* Price Section - pushed to bottom */}
            <div className="flex items-center gap-2 flex-wrap mt-auto">
              <span className="text-lg font-bold text-gray-900">
                ₹{finalPrice > 0 ? finalPrice.toLocaleString() : '0'}
              </span>
              {hasDiscount && (
                <span className="text-sm text-gray-400 line-through">
                  ₹{originalPrice.toLocaleString()}
                </span>
              )}
              {hasDiscount && (
                <span className="bg-green-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            
            {/* Rating - only show if rating exists and is greater than 0 */}
            {product.rating > 0 && (
              <div className="flex items-center gap-1 mt-1.5">
                <div className="flex items-center gap-0.5 bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                  <span>{product.rating}</span>
                  <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
                {product.reviewCount > 0 && (
                  <span className="text-[10px] text-gray-400">({product.reviewCount})</span>
                )}
              </div>
            )}
          </div>
        </Link>
        
        {/* Add to Cart Button - Always at the bottom */}
        <div className="px-3 pb-3 mt-auto">
          {isOutOfStock ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg bg-gray-200 text-gray-500 border border-gray-300 cursor-not-allowed"
              >
                Out of Stock
              </button>
            </div>
          ) : !showSizes ? (
            <button
              onClick={handleAddClick}
              disabled={isAlreadyInCart}
              className={`w-full py-2.5 text-xs font-bold uppercase tracking-wide rounded-lg transition-colors ${
                isAlreadyInCart
                  ? 'bg-green-100 text-green-800 border border-green-200 cursor-not-allowed'
                  : 'bg-black text-white hover:bg-gray-800'
              }`}
            >
              {isAlreadyInCart ? 'Already in Cart' : (sizes.length > 0 ? 'Select Size' : 'Add to Cart')}
            </button>
          ) : (
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Select Size</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowSizes(false); }}
                  className="p-1 text-gray-400 hover:text-gray-900"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {sizes.slice(0, 4).map((size) => (
                  <button
                    key={size}
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAddToCart(size); }}
                    disabled={isAdding}
                    className={`h-8 rounded text-xs font-bold border transition-colors
                      ${isAdding ? 'bg-gray-200 text-gray-400' : 'bg-white border-gray-300 hover:bg-black hover:text-white'}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// PERFORMANCE FIX: 
// Only re-render if the product ID changes. 
// This prevents the "stutter" when infinite scroll adds new items.
export default memo(ProductCard, (prev, next) => {
  return (prev.product._id || prev.product.id) === (next.product._id || next.product.id);
});