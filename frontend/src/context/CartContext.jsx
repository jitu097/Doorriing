import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../services/cart.service';
import { getPlatformSettings } from '../services/platform.service';
import { useAuth } from '../hooks/useAuth';

const PLATFORM_SETTINGS_CACHE_KEY = 'platform_settings';

const readCachedPlatformSettings = () => {
    try {
        const cached = localStorage.getItem(PLATFORM_SETTINGS_CACHE_KEY);
        if (!cached) return null;
        const parsed = JSON.parse(cached);
        return Array.isArray(parsed?.delivery_rules) ? parsed : null;
    } catch (error) {
        return null;
    }
};

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

const resolveApiItemId = (item, fallback = '') => {
    const candidates = [
        item?.id,
        item?.item_id,
        item?.serverItemId,
        item?.itemId,
        fallback,
    ];

    return candidates.find((candidate) => typeof candidate === 'string' && candidate.length > 0) || null;
};

const findCartItemByClientId = (items, targetId) => {
    const normalizedTarget = normalizeIdValue(targetId);
    if (!normalizedTarget) return null;
    return items.find((entry) => deriveClientItemId(entry) === normalizedTarget) || null;
};

const calculateDeliveryFee = (total, rules) => {
    if (!rules || rules.length === 0) return 0;

    const matched = rules.find(
        (rule) => total >= rule.min && total <= rule.max
    );

    return matched ? matched.fee : 0;
};

const calculateConvenienceFee = (settings) => {
    if (!settings) return 0;
    const fee = Number(settings.convenience_fee);
    return Number.isFinite(fee) ? fee : 0;
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
    const [platformSettings, setPlatformSettings] = useState(() => readCachedPlatformSettings());
    const [platformSettingsLoading, setPlatformSettingsLoading] = useState(() => !readCachedPlatformSettings());
    const navigate = useNavigate();

    const { user, loading: authLoading } = useAuth();
    const isAuthenticated = !!user;

    const applyCartPayload = useCallback((cartPayload) => {
        const shopIdFromPayload = cartPayload?.shop_id ?? null;
        const businessType = cartPayload?.business_type ?? null;
        const items = cartPayload?.cart_items ?? [];

        if (!items.length) {
            setCartItems([]);
            setCartMeta({ shopId: null, shopType: null });
            return;
        }

        const mappedItems = items.map((ci) => {
            const itemPayload = ci.items || {};
            const fallbackId = itemPayload?.id ?? ci.item_id ?? ci.id;
            const derivedVariant = itemPayload?.portion || ci.variant;
            const resolvedImage = itemPayload?.image ?? itemPayload?.image_url ?? null;
            const rawName = itemPayload?.name ?? itemPayload?.title ?? '';
            const normalizedName = derivedVariant && rawName
                ? (rawName.toLowerCase().includes(derivedVariant.toLowerCase()) ? rawName : `${rawName} (${derivedVariant})`)
                : rawName;
            const enrichedPayload = {
                ...itemPayload,
                name: normalizedName || itemPayload?.name,
                image: resolvedImage,
                image_url: itemPayload?.image_url ?? resolvedImage,
                variant: derivedVariant,
                shopType: itemPayload?.shopType || businessType || itemPayload?.shops?.business_type || null,
                shopId: itemPayload?.shop_id || shopIdFromPayload,
            };
            const clientItemId = deriveClientItemId(enrichedPayload, fallbackId);

            return {
                ...enrichedPayload,
                clientItemId,
                cartItemId: ci.id,
                quantity: ci.quantity,
            };
        });

        setCartItems(mappedItems);
        setCartMeta({
            shopId: shopIdFromPayload,
            shopType: mappedItems[0]?.shopType || businessType || null,
        });
    }, []);

    const fetchCart = useCallback(async () => {
        if (authLoading || !isAuthenticated) return;
        try {
            setLoading(true);
            setError(null);
            const response = await cartService.getCart();
            if (response && response.data) {
                applyCartPayload(response.data);
            } else {
                setCartItems([]);
                setCartMeta({ shopId: null, shopType: null });
            }
        } catch (err) {
            console.error('Error fetching cart:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [isAuthenticated, authLoading, applyCartPayload]);

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

    useEffect(() => {
        let isMounted = true;

        const fetchSettings = async () => {
            try {
                if (!platformSettings) {
                    setPlatformSettingsLoading(true);
                }
                const data = await getPlatformSettings();
                if (!isMounted) return;
                const normalizedSettings = data?.delivery_rules
                    ? data
                    : (data?.data?.delivery_rules ? data.data : null);
                setPlatformSettings(normalizedSettings);
                if (normalizedSettings?.delivery_rules) {
                    localStorage.setItem(PLATFORM_SETTINGS_CACHE_KEY, JSON.stringify(normalizedSettings));
                }
            } catch (err) {
                console.error('Platform settings error:', err);
                if (isMounted) {
                    // Keep cached settings if available; avoid visual jumps.
                    if (!platformSettings) {
                        setPlatformSettings(null);
                    }
                }
            } finally {
                if (isMounted) {
                    setPlatformSettingsLoading(false);
                }
            }
        };

        fetchSettings();

        return () => {
            isMounted = false;
        };
    }, []);

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
                    image: item.image ?? item.image_url ?? null,
                    image_url: item.image_url ?? item.image ?? null,
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

            // API call; response already returns latest cart snapshot
            const apiResponse = await cartService.addToCart(item.shopId, payloadItemId, 1);
            if (apiResponse?.data) {
                applyCartPayload(apiResponse.data);
            } else {
                await fetchCart();
            }
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

            const isTempId = !item.cartItemId || item.cartItemId.toString().startsWith('temp-');

            if (isTempId) {
                const apiItemId = resolveApiItemId(item, targetClientId);
                if (item.shopId && apiItemId) {
                    await cartService.addToCart(item.shopId, apiItemId, 1);
                    await fetchCart();
                } else {
                    await fetchCart();
                }
                return;
            }

            await cartService.updateCartItem(item.cartItemId, newQty);
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

    const getDeliveryFee = (total = getCartTotal()) => {
        if (platformSettingsLoading && !platformSettings) {
            return null;
        }
        return calculateDeliveryFee(total, platformSettings?.delivery_rules);
    };

    const getConvenienceFee = () => {
        if (platformSettingsLoading && !platformSettings) {
            return null;
        }
        return calculateConvenienceFee(platformSettings);
    };

    const subtotal = getCartTotal();
    const deliveryFee = getDeliveryFee(subtotal);
    const convenienceFee = getConvenienceFee();

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
        platformSettings,
        platformSettingsLoading,
        calculateDeliveryFee,
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        getCartTotal,
        getDeliveryFee,
        getConvenienceFee,
        deliveryFee,
        convenienceFee,
        getCartCount,
        isInCart,
        getCartItem,
    };

    return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
