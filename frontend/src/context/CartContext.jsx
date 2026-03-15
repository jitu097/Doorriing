import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../services/cart.service';
import { useAuth } from '../hooks/useAuth';

const CartContext = createContext();

const normalizeIdValue = (value) => {
    if (value === undefined || value === null) return '';
    return typeof value === 'string' ? value : value.toString();
};

const ensureVariantSuffix = (idValue, variantLabel) => {
    const normalizedId = normalizeIdValue(idValue);
    if (!variantLabel) return normalizedId;

    const trimmedVariant = variantLabel.toString().trim().toLowerCase();
    if (!trimmedVariant) return normalizedId;

    if (normalizedId.endsWith(`-${trimmedVariant}`)) {
        return normalizedId;
    }

    const baseId = normalizedId.replace(/-(half|full)$/i, '');
    return `${baseId}-${trimmedVariant}`;
};

const deriveClientItemId = (item, fallback = '') => {
    if (!item) return normalizeIdValue(fallback);
    if (item.clientItemId) return ensureVariantSuffix(item.clientItemId, item.portion || item.variant);
    if (item.client_id) return ensureVariantSuffix(item.client_id, item.portion || item.variant);

    const rawId = item.serverItemId ?? item.server_id ?? item.item_id ?? item.id ?? fallback;
    return ensureVariantSuffix(rawId, item.portion || item.variant || item.portion_label || item.selectedPortion);
};

const findCartItemByClientId = (items, targetId) => {
    const normalizedTarget = normalizeIdValue(targetId);
    if (!normalizedTarget) return null;
    return items.find((entry) => deriveClientItemId(entry) === normalizedTarget) || null;
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const CartProvider = ({ children }) => {
    const [cartItems, setCartItems] = useState([]);
    const [cartMeta, setCartMeta] = useState({ shopId: null, shopType: null });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const { user, loading: authLoading } = useAuth();
    const isAuthenticated = !!user;

    const fetchCart = useCallback(async () => {
        if (authLoading || !isAuthenticated) return;
        try {
            setLoading(true);
            setError(null);
            const response = await cartService.getCart();
            if (response && response.data) {
                const { cart_items, shop_id } = response.data;
                if (!cart_items || cart_items.length === 0) {
                    setCartItems([]);
                    setCartMeta({ shopId: null, shopType: null });
                    return;
                }

                // Map backend structure to frontend structure
                const mappedItems = cart_items.map((ci) => {
                    const itemPayload = ci.items || {};
                    const fallbackId = itemPayload?.id ?? ci.item_id ?? ci.id;
                    const enrichedPayload = { ...itemPayload, variant: itemPayload?.portion || ci.variant };
                    const clientItemId = deriveClientItemId(enrichedPayload, fallbackId);

                    return {
                        ...enrichedPayload,
                        clientItemId,
                        cartItemId: ci.id,
                        quantity: ci.quantity,
                        shopId: shop_id,
                    };
                });

                setCartItems(mappedItems);
                setCartMeta({ shopId: shop_id, shopType: mappedItems[0]?.shopType || null });
            }
        } catch (err) {
            console.error('Error fetching cart:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, authLoading]);

    // Initial fetch when authenticated
    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated) {
                fetchCart();
            } else {
                setCartItems([]);
                setCartMeta({ shopId: null, shopType: null });
                setLoading(false);
            }
        }
    }, [fetchCart, isAuthenticated, authLoading]);

    // Add item to cart or increase quantity
    const addToCart = async (item) => {
        if (!isAuthenticated) {
            // Redirect to login page when user tries to add to cart without authentication
            navigate('/login');
            return;
        }

        try {
            const payloadItemId = item.id ?? item.itemId ?? item.serverItemId;
            if (!payloadItemId) {
                throw new Error('Unable to add item to cart: missing item identifier');
            }

            const clientItemId = deriveClientItemId(item, payloadItemId);

            // Check for shop conflicts locally first for quick UX
            const hasItems = cartItems.length > 0;
            if (hasItems) {
                const firstItem = cartItems[0];
                const isDifferentShopType = item.shopType && firstItem.shopType && item.shopType !== firstItem.shopType;
                const isDifferentShop = item.shopId && firstItem.shopId && item.shopId !== firstItem.shopId;

                if (isDifferentShopType || isDifferentShop) {
                    const shopTypeMsg = isDifferentShopType
                        ? `Cannot add ${item.shopType} items to cart with ${firstItem.shopType} items.`
                        : `Cannot add items from different shops.`;

                    const confirmMsg = `${shopTypeMsg}\n\nYour cart will be cleared to add items from the new ${item.shopType || 'shop'}. Continue?`;

                    if (window.confirm(confirmMsg)) {
                        await cartService.clearCart(firstItem.shopId);
                        await fetchCart(); // Reset local state
                    } else {
                        return; // User cancelled
                    }
                }
            }

            // Optimistically add item to local state so UI updates instantly
            setCartItems(prev => {
                const exists = prev.find(i => deriveClientItemId(i) === clientItemId);
                if (exists) {
                    return prev.map(i =>
                        deriveClientItemId(i) === clientItemId
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    );
                }
                return [...prev, {
                    ...item,
                    id: payloadItemId,
                    clientItemId,
                    quantity: 1,
                    shopId: item.shopId,
                    cartItemId: `temp-${Date.now()}` // Temporary ID until fetched
                }];
            });
            setCartMeta(prev => ({
                shopId: item.shopId,
                shopType: item.shopType || prev.shopType
            }));

            // Only show loading if it's not an optimistic update (we want the UI to be fast, so we skip the global block)
            // setLoading(true);

            // API Call in background
            await cartService.addToCart(item.shopId, payloadItemId, 1);

            // Re-fetch quietly to get real cartItemIds from DB
            await fetchCart();
        } catch (err) {
            console.error('Error adding to cart:', err);
            await fetchCart(); // Revert on failure
            alert(err.message || 'Failed to add item to cart');
        } finally {
            // setLoading(false);
        }
    };

    // Remove item completely from cart
    const removeFromCart = async (id) => {
        try {
            const item = findCartItemByClientId(cartItems, id);
            if (!item) return;

            // Optimistic update - UI updates instantly
            const targetClientId = deriveClientItemId(item);
            const newItems = cartItems.filter((i) => deriveClientItemId(i) !== targetClientId);
            setCartItems(newItems);
            if (newItems.length === 0) {
                setCartMeta({ shopId: null, shopType: null });
            }

            // If it's a real item in the DB, delete it
            if (item.cartItemId && !item.cartItemId.toString().startsWith('temp-')) {
                await cartService.removeFromCart(item.cartItemId);
            }
        } catch (err) {
            console.error('Error removing from cart:', err);
            await fetchCart(); // Revert on failure
        }
    };

    // Increase quantity by 1
    const increaseQty = async (id) => {
        try {
            const item = findCartItemByClientId(cartItems, id);
            if (!item) return;

            const newQty = item.quantity + 1;

            // Optimistically update
            const targetClientId = deriveClientItemId(item);
            setCartItems((prev) => prev.map(i =>
                deriveClientItemId(i) === targetClientId ? { ...i, quantity: newQty } : i
            ));

            if (item.cartItemId && !item.cartItemId.toString().startsWith('temp-')) {
                await cartService.updateCartItem(item.cartItemId, newQty);
            }
        } catch (err) {
            console.error('Error increasing quantity:', err);
            await fetchCart(); // Revert on failure
        }
    };

    // Decrease quantity by 1, remove if quantity becomes 0
    const decreaseQty = async (id) => {
        try {
            const item = findCartItemByClientId(cartItems, id);
            if (!item) return;

            if (item.quantity === 1) {
                await removeFromCart(id);
                return;
            }

            const newQty = item.quantity - 1;

            // Optimistically update
            const targetClientId = deriveClientItemId(item);
            setCartItems((prev) => prev.map(i =>
                deriveClientItemId(i) === targetClientId ? { ...i, quantity: newQty } : i
            ));

            if (item.cartItemId && !item.cartItemId.toString().startsWith('temp-')) {
                await cartService.updateCartItem(item.cartItemId, newQty);
            }
        } catch (err) {
            console.error('Error decreasing quantity:', err);
            await fetchCart(); // Revert on failure
        }
    };

    // Clear entire cart
    const clearCart = async () => {
        try {
            if (!cartMeta.shopId) return;
            setLoading(true);
            await cartService.clearCart(cartMeta.shopId);
            setCartItems([]);
            setCartMeta({ shopId: null, shopType: null });
        } catch (err) {
            console.error('Error clearing cart:', err);
            await fetchCart(); // Revert on failure
        } finally {
            setLoading(false);
        }
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
        return Boolean(findCartItemByClientId(cartItems, id));
    };

    // Get item from cart by id
    const getCartItem = (id) => {
        return findCartItemByClientId(cartItems, id);
    };

    const value = {
        cartItems,
        cartMeta,
        loading,
        error,
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
