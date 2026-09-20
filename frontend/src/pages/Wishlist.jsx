import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { productAPI } from '../utils/api';
import { handleImageError, getLiveImageUrl } from '../utils/imageFallback';
import { pickDefaultColor, productSnapshotForCart } from '../utils/colorVariants';

const Wishlist = () => {
  const { wishlist, wishlistIds, removeFromWishlist, loading: wishlistLoading } = useWishlist();
  const { addToCart, isProductInCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState(null);
  const [addingToCartId, setAddingToCartId] = useState(null);

  // Fetch full product details for all wishlisted items
  useEffect(() => {
    const fetchWishlistProducts = async () => {
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      const ids = Array.from(wishlistIds);
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const productPromises = ids.map(async (id) => {
          try {
            const res = await productAPI.getProductById(id);
            if (res.success && res.data?.product) {
              return res.data.product;
            }
            return null;
          } catch {
            return null;
          }
        });

        const results = await Promise.all(productPromises);
        setProducts(results.filter(Boolean));
      } catch (err) {
        console.error('Error fetching wishlist products:', err);
      } finally {
        setLoading(false);
      }
    };

    if (!wishlistLoading) {
      fetchWishlistProducts();
    }
  }, [wishlistIds, isAuthenticated, wishlistLoading]);

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    try {
      await removeFromWishlist(productId);
      setProducts((prev) => prev.filter((p) => (p._id || p.id) !== productId));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (product) => {
    const pid = product._id || product.id;
    const color = pickDefaultColor(product);
    if (isProductInCart(pid, color)) return;
    setAddingToCartId(pid);
    try {
      await addToCart(
        productSnapshotForCart(product, color),
        1,
        product.sizes?.[0] || '',
        color
      );
    } catch (err) {
      console.error('Error adding to cart:', err);
    } finally {
      setTimeout(() => setAddingToCartId(null), 800);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Wishlist</h2>
        <p className="text-gray-500 text-sm mb-6">Please login to view your wishlist</p>
        <Link
          to="/login"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm"
        >
          Login
        </Link>
      </div>
    );
  }

  if (loading || wishlistLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Wishlist</h1>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-[4/5] bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Wishlist is Empty</h2>
        <p className="text-gray-500 text-sm mb-6">Start adding items you love</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors shadow-sm"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">My Wishlist</h1>
          <p className="text-sm text-gray-500 mt-1">{products.length} item{products.length !== 1 ? 's' : ''}</p>
        </div>
        <Link
          to="/"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Continue Shopping
        </Link>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map((product) => {
          const pid = product._id || product.id;
          const productImage = product.images?.[0] || product.image || product.thumbnail || '';
          const finalPrice = product.price || product.finalPrice || 0;
          const originalPrice = product.originalPrice || product.mrp || product.price || 0;
          const discount = originalPrice > finalPrice ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;
          const isRemoving = removingId === pid;
          const isAddingToCart = addingToCartId === pid;
          const inCart = isProductInCart(pid);

          return (
            <div
              key={pid}
              className={`group bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 ${isRemoving ? 'opacity-50 scale-95' : ''}`}
            >
              {/* Image */}
              <div className="relative aspect-[4/5] overflow-hidden bg-gray-50">
                <Link to={`/product/${product.category || 'product'}/${pid}`}>
                  <img
                    src={getLiveImageUrl(productImage)}
                    alt={product.name || 'Product'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => handleImageError(e, 300, 375)}
                  />
                </Link>

                {/* Discount Badge */}
                {discount > 0 && (
                  <span className="absolute top-2 left-2 bg-red-500 text-white text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded">
                    {discount}% OFF
                  </span>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => handleRemove(pid)}
                  disabled={isRemoving}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm hover:bg-red-50 transition-colors group/btn"
                  aria-label="Remove from wishlist"
                >
                  <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={0.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
              </div>

              {/* Product Info */}
              <div className="p-3 sm:p-4">
                {product.brand && (
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{product.brand}</p>
                )}
                <Link to={`/product/${product.category || 'product'}/${pid}`}>
                  <h3 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2 hover:text-gray-600 transition-colors mb-2">
                    {product.name || 'Product'}
                  </h3>
                </Link>

                {/* Price */}
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-sm sm:text-base font-bold text-gray-900">₹{finalPrice.toLocaleString()}</span>
                  {discount > 0 && (
                    <span className="text-xs text-gray-400 line-through">₹{originalPrice.toLocaleString()}</span>
                  )}
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={isAddingToCart || inCart}
                  className={`w-full py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all active:scale-[0.97] ${
                    inCart
                      ? 'bg-green-100 text-green-800 border border-green-200 cursor-not-allowed'
                      : isAddingToCart
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                  }`}
                >
                  {inCart ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Already in Cart
                    </span>
                  ) : isAddingToCart ? (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Added!
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-1.5">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      Add to Cart
                    </span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Wishlist;
