import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cartAPI } from '../utils/api';
import { useAuth } from './AuthContext';
import { colorsMatch } from '../utils/colorVariants';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();

  // Load cart from backend when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadCart();
    } else {
      setCart([]);
    }
  }, [isAuthenticated]);

  const loadCart = async () => {
    try {
      setIsLoading(true);
      const response = await cartAPI.getCart();
      if (response.success) {
        setCart(response.data.cart.items || []);
      }
    } catch (error) {
      console.error('Error loading cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (product, quantity = 1, size = '', color = '', boxType = '', boxPrice = 0) => {
    if (!isAuthenticated) {
      throw new Error('Please login to add items to cart');
    }

    try {
      const response = await cartAPI.addToCart(product, quantity, size, color, boxType, boxPrice);
      if (response.success) {
        setCart(response.data.cart.items || []);
      }
    } catch (error) {
      throw error;
    }
  };

  const removeFromCart = async (itemId) => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await cartAPI.removeFromCart(itemId);
      if (response.success) {
        setCart(response.data.cart.items || []);
      }
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (!isAuthenticated) {
      return;
    }

    if (quantity <= 0) {
      await removeFromCart(itemId);
      return;
    }

    try {
      const response = await cartAPI.updateCartItem(itemId, quantity);
      if (response.success) {
        setCart(response.data.cart.items || []);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      await cartAPI.clearCart();
      setCart([]);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const product = item.product || item;
      const price = product.price || product.finalPrice || 0;
      const boxPrice = Number(item.boxPrice) || 0;
      return total + (price + boxPrice) * item.quantity;
    }, 0);
  };

  const getCartItemsCount = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  /** True if a cart line matches this product. Pass color to match that variant only. */
  const isProductInCart = useCallback(
    (productId, color) => {
      if (!productId || !Array.isArray(cart)) return false;
      return cart.some((item) => {
        const cartProduct = item.product || item;
        const cartProductId = cartProduct?._id || cartProduct?.id || item.productId;
        if (String(cartProductId) !== String(productId)) return false;
        if (color) return colorsMatch(item.color || item.selectedColor, color);
        return true;
      });
    },
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartItemsCount,
        isProductInCart,
        isLoading,
        loadCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

