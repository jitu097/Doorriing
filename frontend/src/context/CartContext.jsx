import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState(() => {
        // Initialize from localStorage
        try {
            const savedCart = localStorage.getItem('cartItems');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error loading cart from localStorage:', error);
            return [];
        }
    });

    const [cartMeta, setCartMeta] = useState(() => {
        // Initialize cart metadata (shop info)
        try {
            const savedMeta = localStorage.getItem('cartMeta');
            return savedMeta ? JSON.parse(savedMeta) : { shopId: null, shopType: null };
        } catch (error) {
            console.error('Error loading cart metadata:', error);
            return { shopId: null, shopType: null };
        }
    });

    // Sync to localStorage whenever cart changes
    useEffect(() => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
            localStorage.setItem('cartMeta', JSON.stringify(cartMeta));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [cartItems, cartMeta]);

    // Add item to cart or increase quantity if already exists
    const addToCart = (item) => {
        setCartItems((prevItems) => {
            // Check for shop conflicts
            const hasItems = prevItems.length > 0;
            
            if (hasItems) {
                const firstItem = prevItems[0];
                const isDifferentShopType = item.shopType && firstItem.shopType && item.shopType !== firstItem.shopType;
                const isDifferentShop = item.shopId && firstItem.shopId && item.shopId !== firstItem.shopId;
                
                if (isDifferentShopType || isDifferentShop) {
                    // Different shop type or different shop - clear cart and add new item
                    const shopTypeMsg = isDifferentShopType 
                        ? `Cannot add ${item.shopType} items to cart with ${firstItem.shopType} items.`
                        : `Cannot add items from different shops.`;
                    
                    const confirmMsg = `${shopTypeMsg}\n\nYour cart will be cleared to add items from the new ${item.shopType || 'shop'}. Continue?`;
                    
                    if (window.confirm(confirmMsg)) {
                        // Clear cart and add new item
                        setCartMeta({ shopId: item.shopId, shopType: item.shopType });
                        return [{ ...item, quantity: 1 }];
                    } else {
                        // User cancelled, keep existing cart
                        return prevItems;
                    }
                }
            } else {
                // First item in cart - set shop metadata
                setCartMeta({ shopId: item.shopId, shopType: item.shopType });
            }
            
            // Check if item already exists
            const existingItem = prevItems.find((i) => i.id === item.id);

            if (existingItem) {
                // Item exists, increase quantity
                return prevItems.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                // New item from same shop, add with quantity 1
                return [...prevItems, { ...item, quantity: 1 }];
            }
        });
    };

    // Remove item completely from cart
    const removeFromCart = (id) => {
        setCartItems((prevItems) => {
            const newItems = prevItems.filter((item) => item.id !== id);
            // Clear metadata if cart becomes empty
            if (newItems.length === 0) {
                setCartMeta({ shopId: null, shopType: null });
            }
            return newItems;
        });
    };

    // Increase quantity by 1
    const increaseQty = (id) => {
        setCartItems((prevItems) =>
            prevItems.map((item) =>
                item.id === id ? { ...item, quantity: item.quantity + 1 } : item
            )
        );
    };

    // Decrease quantity by 1, remove if quantity becomes 0
    const decreaseQty = (id) => {
        setCartItems((prevItems) => {
            const item = prevItems.find((i) => i.id === id);

            if (item && item.quantity === 1) {
                // Remove item if quantity is 1
                const newItems = prevItems.filter((i) => i.id !== id);
                // Clear metadata if cart becomes empty
                if (newItems.length === 0) {
                    setCartMeta({ shopId: null, shopType: null });
                }
                return newItems;
            } else {
                // Decrease quantity
                return prevItems.map((i) =>
                    i.id === id ? { ...i, quantity: i.quantity - 1 } : i
                );
            }
        });
    };

    // Clear entire cart
    const clearCart = () => {
        setCartItems([]);
        setCartMeta({ shopId: null, shopType: null });
    };

    // Get cart total price
    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            const price = parseFloat(item.price) || 0;
            return total + price * item.quantity;
        }, 0);
    };

    // Get total item count (sum of all quantities)
    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    // Check if item is in cart
    const isInCart = (id) => {
        return cartItems.some((item) => item.id === id);
    };

    // Get item from cart by id
    const getCartItem = (id) => {
        return cartItems.find((item) => item.id === id);
    };

    const value = {
        cartItems,
        cartMeta,
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        getCartTotal,
        getCartCount,
        isInCart,
        getCartItem,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
