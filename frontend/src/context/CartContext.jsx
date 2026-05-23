import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { cartService } from '../services/cart.service';
import { getPlatformSettings } from '../services/platform.service';
import { useAuth } from '../hooks/useAuth';
import { useAppAvailability } from './AppAvailabilityContext';

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

const resolveItemVariant = (item) => {
    const rawVariant = item?.portion || item?.variant || item?.portion_label || item?.selectedPortion || '';
    const normalizedVariant = rawVariant.toString().trim().toLowerCase();

    if (normalizedVariant === 'half') return 'Half';
    if (normalizedVariant === 'full') return 'Full';

    const idValue = normalizeIdValue(item?.id || item?.item_id || item?.clientItemId || item?.client_id);
    if (idValue.endsWith('-half')) return 'Half';
    if (idValue.endsWith('-full')) return 'Full';

    return null;
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

export const CartContext = createContext();
export const CartStateContext = createContext();
export const CartActionsContext = createContext();
export const CartSubscriptionContext = createContext();
export const CartItemAccessorContext = createContext();

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within CartProvider');
    }
    return context;
};

export const useCartState = () => {
    const context = useContext(CartStateContext);
    if (!context) {
        throw new Error('useCartState must be used within CartProvider');
    }
    return context;
};

export const useCartActions = () => {
    const context = useContext(CartActionsContext);
    if (!context) {
        throw new Error('useCartActions must be used within CartProvider');
    }
    return context;
};

export const useItemCartInfo = (clientItemId, hasVariants) => {
    const subscribeToItem = useContext(CartSubscriptionContext);
    const getCartItemRef = useContext(CartItemAccessorContext);

    const [cartState, setCartState] = useState(() => {
        const getCartItem = getCartItemRef;
        if (hasVariants) {
            return {
                cartItem: getCartItem(clientItemId),
                halfCartItem: getCartItem(`${clientItemId}-half`),
                fullCartItem: getCartItem(`${clientItemId}-full`),
            };
        } else {
            return {
                cartItem: getCartItem(clientItemId),
                halfCartItem: null,
                fullCartItem: null,
            };
        }
    });

    useEffect(() => {
        if (!subscribeToItem || !getCartItemRef) return;

        const updateItem = () => {
            const getCartItem = getCartItemRef;
            if (hasVariants) {
                const cartItem = getCartItem(clientItemId);
                const halfCartItem = getCartItem(`${clientItemId}-half`);
                const fullCartItem = getCartItem(`${clientItemId}-full`);

                setCartState((prev) => {
                    if (
                        prev.cartItem?.quantity === cartItem?.quantity &&
                        prev.halfCartItem?.quantity === halfCartItem?.quantity &&
                        prev.fullCartItem?.quantity === fullCartItem?.quantity
                    ) {
                        return prev;
                    }
                    return { cartItem, halfCartItem, fullCartItem };
                });
            } else {
                const cartItem = getCartItem(clientItemId);
                setCartState((prev) => {
                    if (prev.cartItem?.quantity === cartItem?.quantity) {
                        return prev;
                    }
                    return { cartItem, halfCartItem: null, fullCartItem: null };
                });
            }
        };

        const unsubBase = subscribeToItem(clientItemId, updateItem);
        let unsubHalf = null;
        let unsubFull = null;
        if (hasVariants) {
            unsubHalf = subscribeToItem(`${clientItemId}-half`, updateItem);
            unsubFull = subscribeToItem(`${clientItemId}-full`, updateItem);
        }

        updateItem();

        return () => {
            unsubBase();
            if (unsubHalf) unsubHalf();
            if (unsubFull) unsubFull();
        };
    }, [clientItemId, hasVariants, subscribeToItem, getCartItemRef]);

    return cartState;
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

    const { isOpen: appIsOpen, isLoading: appAvailabilityLoading, reason: appUnavailableReason } = useAppAvailability();

    // ── Refs for stable callback actions ─────────────────────────────────────
    const cartItemsRef = useRef(cartItems);
    cartItemsRef.current = cartItems;

    const cartMetaRef = useRef(cartMeta);
    cartMetaRef.current = cartMeta;

    const platformSettingsRef = useRef(platformSettings);
    platformSettingsRef.current = platformSettings;

    const platformSettingsLoadingRef = useRef(platformSettingsLoading);
    platformSettingsLoadingRef.current = platformSettingsLoading;

    const isAuthenticatedRef = useRef(isAuthenticated);
    isAuthenticatedRef.current = isAuthenticated;

    const authLoadingRef = useRef(authLoading);
    authLoadingRef.current = authLoading;

    const appIsOpenRef = useRef(appIsOpen);
    appIsOpenRef.current = appIsOpen;

    const appAvailabilityLoadingRef = useRef(appAvailabilityLoading);
    appAvailabilityLoadingRef.current = appAvailabilityLoading;

    const appUnavailableReasonRef = useRef(appUnavailableReason);
    appUnavailableReasonRef.current = appUnavailableReason;

    // ── Subscription Registry ────────────────────────────────────────────────
    const listenersRef = useRef(new Map());

    const subscribeToItem = useCallback((clientItemId, callback) => {
        if (!listenersRef.current.has(clientItemId)) {
            listenersRef.current.set(clientItemId, new Set());
        }
        listenersRef.current.get(clientItemId).add(callback);
        return () => {
            const set = listenersRef.current.get(clientItemId);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    listenersRef.current.delete(clientItemId);
                }
            }
        };
    }, []);

    // ── Notify specific subscribers when cart items change ───────────────────
    const prevCartItemsRef = useRef([]);
    useEffect(() => {
        const prevItems = prevCartItemsRef.current;
        const currentItems = cartItems;

        const changedIds = new Set();
        const currentMap = new Map(currentItems.map(i => [deriveClientItemId(i), i.quantity]));
        const prevMap = new Map(prevItems.map(i => [deriveClientItemId(i), i.quantity]));

        for (const [id, qty] of currentMap.entries()) {
            if (prevMap.get(id) !== qty) {
                changedIds.add(id);
            }
        }

        for (const id of prevMap.keys()) {
            if (!currentMap.has(id)) {
                changedIds.add(id);
            }
        }

        changedIds.forEach(id => {
            const callbacks = listenersRef.current.get(id);
            if (callbacks) {
                callbacks.forEach(cb => cb());
            }
        });

        prevCartItemsRef.current = currentItems;
    }, [cartItems]);

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
                baseQuantity: itemPayload?.baseQuantity ?? itemPayload?.base_quantity ?? null,
                unit: itemPayload?.unit ?? null,
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
        if (authLoadingRef.current || !isAuthenticatedRef.current) return;
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
    }, [applyCartPayload]);

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
    }, [platformSettings]);

    const addToCart = useCallback(async (item) => {
        if (!isAuthenticatedRef.current) {
            navigate('/login');
            return;
        }

        if (!appAvailabilityLoadingRef.current && !appIsOpenRef.current) {
            const reason = appUnavailableReasonRef.current || 'We are currently unavailable for orders. Please try again later.';
            const err = new Error(reason);
            err.code = 'APP_UNAVAILABLE';
            throw err;
        }

        try {
            const payloadItemId = item.id ?? item.itemId ?? item.serverItemId;
            if (!payloadItemId) {
                throw new Error('Unable to add item to cart: missing item identifier');
            }

            const clientItemId = deriveClientItemId(item, payloadItemId);
            console.log('=== CART CONTEXT ENTRY ===', {
                incomingItem: item,
                variant: item.variant,
                clientItemId,
            });

            const hasItems = cartItemsRef.current.length > 0;
            if (hasItems) {
                const firstItem = cartItemsRef.current[0];
                const isDifferentShopType = item.shopType && firstItem.shopType && item.shopType !== firstItem.shopType;
                const isDifferentShop = item.shopId && firstItem.shopId && item.shopId !== firstItem.shopId;

                if (isDifferentShopType || isDifferentShop) {
                    try {
                        await cartService.clearCart(firstItem.shopId);
                        await fetchCart();
                    } catch (clearErr) {
                        console.error('Failed to clear cart for shop change:', clearErr);
                        await fetchCart();
                        return;
                    }
                }
            }

            let optimisticCartItems = null;
            setCartItems(prev => {
                const exists = prev.find(i => deriveClientItemId(i) === clientItemId);
                if (exists) {
                    optimisticCartItems = prev.map(i =>
                        deriveClientItemId(i) === clientItemId
                            ? { ...i, quantity: i.quantity + 1 }
                            : i
                    );
                    return optimisticCartItems;
                }
                optimisticCartItems = [...prev, {
                    ...item,
                    id: payloadItemId,
                    clientItemId,
                    image: item.image ?? item.image_url ?? null,
                    image_url: item.image_url ?? item.image ?? null,
                    quantity: 1,
                    shopId: item.shopId,
                    cartItemId: `temp-${Date.now()}`
                }];
                return optimisticCartItems;
            });
            console.log('=== OPTIMISTIC INSERT COMPLETE ===', optimisticCartItems);
            setCartMeta(prev => ({
                shopId: item.shopId,
                shopType: item.shopType || prev.shopType
            }));

            const apiResponse = await cartService.addToCart(item.shopId, payloadItemId, 1, resolveItemVariant(item));
            if (apiResponse?.data) {
                applyCartPayload(apiResponse.data);
            } else {
                await fetchCart();
            }
        } catch (err) {
            console.error('Error adding to cart:', err);
            await fetchCart();
            alert(err.message || 'Failed to add item to cart');
        }
    }, [navigate, fetchCart, applyCartPayload]);

    const removeFromCart = useCallback(async (id) => {
        try {
            const item = findCartItemByClientId(cartItemsRef.current, id);
            if (!item) return;

            const targetClientId = deriveClientItemId(item);
            const newItems = cartItemsRef.current.filter((i) => deriveClientItemId(i) !== targetClientId);
            setCartItems(newItems);
            if (newItems.length === 0) {
                setCartMeta({ shopId: null, shopType: null });
            }

            if (item.cartItemId && !item.cartItemId.toString().startsWith('temp-')) {
                await cartService.removeFromCart(item.cartItemId);
            }
        } catch (err) {
            console.error('Error removing from cart:', err);
            await fetchCart();
        }
    }, [fetchCart]);

    const increaseQty = useCallback(async (id) => {
        if (!appAvailabilityLoadingRef.current && !appIsOpenRef.current) {
            const reason = appUnavailableReasonRef.current || 'We are currently unavailable for orders.';
            const err = new Error(reason);
            err.code = 'APP_UNAVAILABLE';
            throw err;
        }
        try {
            const item = findCartItemByClientId(cartItemsRef.current, id);
            if (!item) return;

            const newQty = item.quantity + 1;

            const targetClientId = deriveClientItemId(item);
            setCartItems((prev) => prev.map(i =>
                deriveClientItemId(i) === targetClientId ? { ...i, quantity: newQty } : i
            ));

            const isTempId = !item.cartItemId || item.cartItemId.toString().startsWith('temp-');

            if (isTempId) {
                const apiItemId = resolveApiItemId(item, targetClientId);
                if (item.shopId && apiItemId) {
                    await cartService.addToCart(item.shopId, apiItemId, 1, resolveItemVariant(item));
                    await fetchCart();
                } else {
                    await fetchCart();
                }
                return;
            }

            await cartService.updateCartItem(item.cartItemId, newQty);
        } catch (err) {
            console.error('Error increasing quantity:', err);
            await fetchCart();
        }
    }, [fetchCart]);

    const decreaseQty = useCallback(async (id) => {
        try {
            const item = findCartItemByClientId(cartItemsRef.current, id);
            if (!item) return;

            if (item.quantity === 1) {
                await removeFromCart(id);
                return;
            }

            const newQty = item.quantity - 1;

            const targetClientId = deriveClientItemId(item);
            setCartItems((prev) => prev.map(i =>
                deriveClientItemId(i) === targetClientId ? { ...i, quantity: newQty } : i
            ));

            if (item.cartItemId && !item.cartItemId.toString().startsWith('temp-')) {
                await cartService.updateCartItem(item.cartItemId, newQty);
            }
        } catch (err) {
            console.error('Error decreasing quantity:', err);
            await fetchCart();
        }
    }, [removeFromCart, fetchCart]);

    const clearCart = useCallback(async () => {
        try {
            if (!cartMetaRef.current.shopId) return;
            setLoading(true);
            await cartService.clearCart(cartMetaRef.current.shopId);
            setCartItems([]);
            setCartMeta({ shopId: null, shopType: null });
        } catch (err) {
            console.error('Error clearing cart:', err);
            await fetchCart();
        } finally {
            setLoading(false);
        }
    }, [fetchCart]);

    const getCartTotal = useCallback(() => {
        return cartItemsRef.current.reduce((total, item) => {
            const price = parseFloat(item.price) || 0;
            return total + price * item.quantity;
        }, 0);
    }, []);

    const getDeliveryFee = useCallback((total = getCartTotal()) => {
        if (platformSettingsLoadingRef.current && !platformSettingsRef.current) {
            return null;
        }
        return calculateDeliveryFee(total, platformSettingsRef.current?.delivery_rules);
    }, [getCartTotal]);

    const getConvenienceFee = useCallback(() => {
        if (platformSettingsLoadingRef.current && !platformSettingsRef.current) {
            return null;
        }
        return calculateConvenienceFee(platformSettingsRef.current);
    }, []);

    const subtotal = getCartTotal();
    const deliveryFee = getDeliveryFee(subtotal);
    const convenienceFee = getConvenienceFee();

    const getCartCount = useCallback(() => {
        return cartItemsRef.current.reduce((count, item) => count + item.quantity, 0);
    }, []);

    const isInCart = useCallback((id) => {
        return Boolean(findCartItemByClientId(cartItemsRef.current, id));
    }, []);

    const getCartItem = useCallback((id) => {
        return findCartItemByClientId(cartItemsRef.current, id);
    }, []);

    const getCartItemRef = useCallback((id) => {
        return findCartItemByClientId(cartItemsRef.current, id);
    }, []);

    const stateValue = useMemo(() => ({
        cartItems,
        cartMeta,
        loading,
        error,
        platformSettings,
        platformSettingsLoading,
        deliveryFee,
        convenienceFee,
        appIsOpen,
        appAvailabilityLoading,
        appUnavailableReason,
    }), [
        cartItems,
        cartMeta,
        loading,
        error,
        platformSettings,
        platformSettingsLoading,
        deliveryFee,
        convenienceFee,
        appIsOpen,
        appAvailabilityLoading,
        appUnavailableReason,
    ]);

    const actionsValue = useMemo(() => ({
        calculateDeliveryFee,
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        getCartTotal,
        getDeliveryFee,
        getConvenienceFee,
        getCartCount,
        isInCart,
        getCartItem,
    }), [
        addToCart,
        removeFromCart,
        increaseQty,
        decreaseQty,
        clearCart,
        getCartTotal,
        getDeliveryFee,
        getConvenienceFee,
        getCartCount,
        isInCart,
        getCartItem,
    ]);

    const unifiedValue = useMemo(() => ({
        ...stateValue,
        ...actionsValue,
    }), [stateValue, actionsValue]);

    return (
        <CartStateContext.Provider value={stateValue}>
            <CartActionsContext.Provider value={actionsValue}>
                <CartSubscriptionContext.Provider value={subscribeToItem}>
                    <CartItemAccessorContext.Provider value={getCartItemRef}>
                        <CartContext.Provider value={unifiedValue}>
                            {children}
                        </CartContext.Provider>
                    </CartItemAccessorContext.Provider>
                </CartSubscriptionContext.Provider>
            </CartActionsContext.Provider>
        </CartStateContext.Provider>
    );
};
