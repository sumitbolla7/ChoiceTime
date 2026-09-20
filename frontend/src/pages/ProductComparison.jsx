import { useState, useEffect } from 'react';
import { X, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useToast } from '../components/ToastContainer';
import { pickDefaultColor, productSnapshotForCart } from '../utils/colorVariants';
import { getLiveImageUrl, handleImageError } from '../utils/imageFallback';

const ProductComparison = () => {
  const { addToCart, isProductInCart } = useCart();
  const { success, error: showError } = useToast();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const stored = localStorage.getItem('comparison_products');
    if (stored) {
      try {
        setProducts(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading comparison products:', error);
      }
    }
  }, []);

  const removeProduct = (productId) => {
    const updated = products.filter(p => (p._id || p.id) !== productId);
    setProducts(updated);
    localStorage.setItem('comparison_products', JSON.stringify(updated));
  };

  const clearAll = () => {
    setProducts([]);
    localStorage.removeItem('comparison_products');
  };

  const handleAddToCart = async (product) => {
    const pid = product._id || product.id;
    const color = pickDefaultColor(product);
    if (pid && isProductInCart(pid, color)) return;
    try {
      await addToCart(productSnapshotForCart(product, color), 1, product.sizes?.[0] || '', color);
      success('Product added to cart');
    } catch (err) {
      showError(err.message || 'Failed to add to cart');
    }
  };

  if (products.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products to compare</h3>
            <p className="text-gray-600 mb-4">Add products to compare by clicking the compare button on product pages</p>
            <Link to="/" className="inline-block px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800">
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const getValue = (product, key) => {
    return product[key] || 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Compare Products</h1>
          <button
            onClick={clearAll}
            className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
          >
            <Trash2 className="w-4 h-4" />
            Clear All
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Features</th>
                {products.map((product) => (
                  <th key={product._id || product.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase relative">
                    <button
                      onClick={() => removeProduct(product._id || product.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Image</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3">
                    <img
                      src={getLiveImageUrl(product.images?.[0] || product.image)}
                      alt={product.name}
                      className="w-24 h-24 object-cover rounded"
                      onError={(e) => handleImageError(e, 96, 96)}
                    />
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Name</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3">
                    <Link
                      to={`/product/${product.category || 'product'}/${product._id || product.id}`}
                      className="text-sm font-medium text-gray-900 hover:text-gray-600"
                    >
                      {product.name}
                    </Link>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Price</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3">
                    <div className="text-sm">
                      <span className="font-bold text-gray-900">₹{(product.price || product.finalPrice).toLocaleString()}</span>
                      {product.originalPrice && product.originalPrice > (product.price || product.finalPrice) && (
                        <span className="text-gray-500 line-through ml-2">₹{product.originalPrice.toLocaleString()}</span>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Brand</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3 text-sm text-gray-600">
                    {getValue(product, 'brand')}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Sizes</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3 text-sm text-gray-600">
                    {product.sizes ? product.sizes.join(', ') : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Colors</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3 text-sm text-gray-600">
                    {product.colors ? product.colors.join(', ') : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Description</td>
                {products.map((product) => (
                  <td key={product._id || product.id} className="px-4 py-3 text-sm text-gray-600">
                    {product.description ? product.description.substring(0, 100) + '...' : 'N/A'}
                  </td>
                ))}
              </tr>
              <tr>
                <td className="px-4 py-3 text-sm font-medium text-gray-900">Actions</td>
                {products.map((product) => {
                  const pid = product._id || product.id;
                  const inCart = isProductInCart(pid);
                  return (
                  <td key={pid} className="px-4 py-3">
                    <button
                      onClick={() => handleAddToCart(product)}
                      disabled={inCart}
                      className={`px-4 py-2 text-sm rounded-lg ${
                        inCart
                          ? 'bg-green-100 text-green-800 border border-green-200 cursor-not-allowed'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {inCart ? 'Already in Cart' : 'Add to Cart'}
                    </button>
                  </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProductComparison;

