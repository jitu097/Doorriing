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

    // Sync to localStorage whenever cart changes
    useEffect(() => {
        try {
            localStorage.setItem('cartItems', JSON.stringify(cartItems));
        } catch (error) {
            console.error('Error saving cart to localStorage:', error);
        }
    }, [cartItems]);

    // Add item to cart or increase quantity if already exists
    const addToCart = (item) => {
        setCartItems((prevItems) => {
            const existingItem = prevItems.find((i) => i.id === item.id);

            if (existingItem) {
                // Item exists, increase quantity
                return prevItems.map((i) =>
                    i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
                );
            } else {
                // New item, add with quantity 1
                return [...prevItems, { ...item, quantity: 1 }];
            }
        });
    };

    // Remove item completely from cart
    const removeFromCart = (id) => {
        setCartItems((prevItems) => prevItems.filter((item) => item.id !== id));
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
                return prevItems.filter((i) => i.id !== id);
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
