import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAddress } from "../../context/AddressContext";
import { useRecentOrder } from "../../context/RecentOrderContext";
import { orderService } from "../../services/order.service.js";
import { api } from "../../services/api";
import "./Checkout.css";

const CheckoutPayment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setOrderAsRecent } = useRecentOrder();

  const { cartItems, getCartTotal, clearCart, deliveryFee, convenienceFee, platformSettingsLoading,
    appIsOpen, appAvailabilityLoading, appUnavailableReason } = useCart();
  const { addresses, activeAddress } = useAddress();

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  // Derived: app is confirmed closed (not just loading first poll)
  const appClosed = !appAvailabilityLoading && !appIsOpen;

  // Synchronous lock — prevents duplicate payment attempts from double-tap
  // before React re-renders the disabled button state.
  const isProcessing = useRef(false);

  const subtotal = getCartTotal();
  const resolvedDeliveryFee = deliveryFee ?? 0;
  const resolvedConvenienceFee = convenienceFee ?? 0;
  const grandTotal = subtotal + resolvedDeliveryFee + resolvedConvenienceFee;

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      navigate("/home", { replace: true });
    }
  }, [cartItems, navigate]);

  // ── Payment Recovery Check ───────────────────────────────────────────────
  // On every mount of CheckoutPayment, silently check if there is a pending
  // Razorpay payment stored in localStorage from a previous session that was
  // interrupted before verifyPayment could complete.
  //
  // Recovery window: 30 minutes. After that the pending record is discarded
  // (Razorpay's own refund timelines make older recoveries unsafe to auto-retry).
  const PENDING_PAYMENT_KEY = 'doorriing_pending_razorpay';
  const RECOVERY_WINDOW_MS  = 30 * 60 * 1000; // 30 minutes

  useEffect(() => {
    const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
    if (!raw) return;

    let pending;
    try {
      pending = JSON.parse(raw);
    } catch {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      return;
    }

    const ageMs = Date.now() - (pending.timestamp || 0);
    if (ageMs > RECOVERY_WINDOW_MS) {
      console.log('[Recovery] Pending payment record expired — clearing');
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      return;
    }

    if (!pending.razorpayOrderId || !pending.addressId) {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      return;
    }

    console.log('[Recovery] Found pending payment, checking status...', {
      razorpayOrderId: pending.razorpayOrderId,
      ageMinutes: Math.round(ageMs / 60000),
    });

    // Non-blocking: run recovery silently in the background.
    // User sees the normal checkout screen while we check.
    orderService
      .recoverPayment(pending.razorpayOrderId, pending.addressId)
      .then((data) => {
        if (data?.status === 'recovered' || data?.status === 'already_exists') {
          const orderId = data?.data?.orderId;
          console.log('[Recovery] Payment recovered! Redirecting to confirmation.', { orderId });
          localStorage.removeItem(PENDING_PAYMENT_KEY);
          if (orderId) {
            navigate(`/order-confirmation?orderId=${orderId}&payment=success&recovered=1`, { replace: true });
          }
        } else if (data?.status === 'not_found' || data?.status === 'failed') {
          // Payment was never captured — safe to clear the record
          console.log('[Recovery] Payment not captured — clearing pending record', { status: data.status });
          localStorage.removeItem(PENDING_PAYMENT_KEY);
        } else {
          // status === 'pending': Razorpay is still processing, keep record and check next time
          console.log('[Recovery] Payment still pending — will retry on next mount');
        }
      })
      .catch((err) => {
        // Non-fatal: user can still checkout normally, recovery runs again next mount
        console.error('[Recovery] Recovery check failed:', err);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // ← intentionally run only on mount
  // ── End Recovery Check ───────────────────────────────────────────────────

  // ── Android Native SDK callbacks ─────────────────────────────────────────
  // Registered on mount so the Android JS bridge can call back after the
  // Razorpay Native SDK completes (success or failure).
  // These are ONLY exercised inside the Android app WebView — on desktop
  // browsers they are never called and have zero effect on the web flow.
  useEffect(() => {
    window.onRazorpaySuccess = (dbOrderId) => {
      console.log('[Payment][Android] Native SDK success — dbOrderId:', dbOrderId);
      clearCart();
      localStorage.removeItem(PENDING_PAYMENT_KEY);
      navigate(
        dbOrderId
          ? `/order-confirmation?orderId=${dbOrderId}&payment=success`
          : '/home'
      );
    };

    window.onRazorpayError = (message) => {
      console.error('[Payment][Android] Native SDK error:', message);
      setErrorMsg(message);
      setLoading(false);
      isProcessing.current = false;
      // Cart is intentionally NOT cleared — user can retry
    };

    return () => {
      // Clean up on unmount to prevent stale callbacks
      delete window.onRazorpaySuccess;
      delete window.onRazorpayError;
    };
  }, [navigate, clearCart]);
  // ─────────────────────────────────────────────────────────────────────────

  const selectedAddress = useMemo(() => {
    if (!addresses || addresses.length === 0) return null;

    if (activeAddress?.id) {
      const activeMatch = addresses.find(
        (addr) => String(addr.id) === String(activeAddress.id)
      );
      if (activeMatch) return activeMatch;
    }

    const defaultAddress = addresses.find((addr) => addr.isDefault);
    return defaultAddress || addresses[0];
  }, [addresses, activeAddress]);

  const selectedAddressId = selectedAddress ? String(selectedAddress.id) : null;

  const formatPrimaryLine = (addr) => {
    if (!addr) return "";
    return [addr.building, addr.area, addr.landmark]
      .filter(Boolean)
      .join(", ");
  };

  const formatSecondaryLine = (addr) => {
    if (!addr) return "";
    const secondaryParts = [addr.city, addr.state].filter(Boolean).join(", ");
    return addr.postalCode
      ? `${secondaryParts}${secondaryParts ? " - " : ""}${addr.postalCode}`
      : secondaryParts;
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // ── Duplicate-tap guard ──────────────────────────────────────────────
    // Synchronous ref check runs before any React state update, blocking
    // a second invocation that might fire before the button re-renders as
    // disabled (React state updates are async; refs are synchronous).
    if (isProcessing.current) {
      console.warn("[Payment] Blocked duplicate payment attempt — already processing");
      return;
    }
    isProcessing.current = true;
    // ────────────────────────────────────────────────────────────────────

    if (!selectedAddressId) {
      isProcessing.current = false;
      setErrorMsg(
        "Missing delivery address. Please go back and select one."
      );
      return;
    }

    if (platformSettingsLoading && deliveryFee === null) {
      isProcessing.current = false;
      setErrorMsg("Loading delivery charges. Please wait a moment.");
      return;
    }

    // -------- Razorpay Payment --------
    if (paymentMethod === "Online") {
      try {
        setLoading(true);

        console.log("[Payment] Initiating Razorpay payment", {
          paymentMethod,
          grandTotal,
          selectedAddressId,
          userAgent: navigator.userAgent,
          isAndroidWebView: /Android/.test(navigator.userAgent),
        });

        const order = await api.post("/user/orders/initiate-payment", {
          amount: grandTotal,
        });

        console.log("[Payment] Razorpay order created", {
          razorpayOrderId: order.id,
          amount: order.amount,
          currency: order.currency,
          status: order.status,
        });

        // ── Android WebView path — Native SDK ──────────────────────────────
        // When running inside the Android app, hand off to the Razorpay
        // Native SDK via the AndroidAuth JS bridge instead of opening the
        // WebView-based modal. The Native SDK opens GPay / PhonePe / Paytm /
        // BHIM natively, bypassing all WebView intent:// limitations.
        //
        // Detection: Android UA + bridge method present (both must be true).
        // On desktop browsers neither condition is true — the web path runs.
        const isAndroidWebView =
          /Android/.test(navigator.userAgent) &&
          typeof window.AndroidAuth?.initiateRazorpayPayment === 'function';

        if (isAndroidWebView) {
          console.log('[Payment][Android] AndroidAuth bridge detected — handing off to Native SDK');

          const orderPayload = JSON.stringify({
            razorpayOrderId: order.id,
            amount:          order.amount,
            currency:        order.currency || 'INR',
            addressId:       selectedAddressId,
            pricing: {
              subtotal:       subtotal,
              deliveryFee:    resolvedDeliveryFee,
              convenienceFee: resolvedConvenienceFee,
              finalAmount:    grandTotal,
            },
            prefill: {
              name:    selectedAddress?.name    || 'Customer',
              contact: selectedAddress?.phone   || '',
            },
          });

          // Store pending payment record for crash-safety recovery
          localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
            razorpayOrderId: order.id,
            addressId:       selectedAddressId,
            timestamp:       Date.now(),
          }));

          console.log('[Payment][Android] Calling initiateRazorpayPayment on AndroidAuth bridge');
          window.AndroidAuth.initiateRazorpayPayment(orderPayload);
          // Android takes over from here.
          // Results come back via window.onRazorpaySuccess / window.onRazorpayError.
          return;
        }
        // ── END Android path ───────────────────────────────────────────────


        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "Doorriing",
          description: "Order Payment",
          order_id: order.id,

          // ── WebView UPI Intent flag ─────────────────────────────────────
          // CRITICAL for Android app: Without this flag, Razorpay detects
          // the Android WebView user-agent and silently hides the UPI tab
          // entirely. It cannot use the Collect flow (VPA entry) reliably
          // on mobile, and without this flag it assumes Intent flow is also
          // not set up — so UPI is dropped from the modal altogether.
          // Setting this to true tells Razorpay to use the Intent flow:
          // the user picks GPay / PhonePe / Paytm / BHIM from a chooser.
          // On desktop browsers this flag is ignored harmlessly.
          webview_intent: true,
          // ───────────────────────────────────────────────────────────────

          // ── UPI-first display config ────────────────────────────────────
          // Forces Razorpay modal to show UPI as the first/primary tab,
          // followed by Card, Netbanking, Wallet. This is essential for
          // Android WebView where UPI apps (GPay, PhonePe, Paytm, BHIM)
          // are triggered via UPI intent from the Razorpay SDK.
          config: {
            display: {
              blocks: {
                upi: {
                  name: "Pay using UPI",
                  instruments: [
                    { method: "upi" },
                  ],
                },
                other: {
                  name: "Other Payment Methods",
                  instruments: [
                    { method: "card" },
                    { method: "netbanking" },
                    { method: "wallet" },
                  ],
                },
              },
              sequence: ["block.upi", "block.other"],
              preferences: {
                show_default_blocks: false,
              },
            },
          },
          // ───────────────────────────────────────────────────────────────

          handler: async function (response) {
            try {
              console.log("[Payment] Razorpay handler called — payment SUCCESS", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                // method is only present when Razorpay includes it (UPI sets this)
                method: response.razorpay_payment_id?.startsWith('pay_') ? 'captured' : 'unknown',
              });

              const verifyData = await api.post("/user/orders/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                // Pass address + pricing so backend can create the DB order
                addressId: selectedAddressId,
                pricing: {
                  subtotal,
                  deliveryFee: resolvedDeliveryFee,
                  convenienceFee: resolvedConvenienceFee,
                  finalAmount: grandTotal,
                },
              });

              if (verifyData.success) {
                await clearCart();

                // Use the real Supabase UUID returned by verifyPayment,
                // NOT the Razorpay order.id (which is not a DB UUID).
                const dbOrderId = verifyData.data?.orderId;
                console.log("[Payment] Order created successfully, DB orderId:", dbOrderId);

                if (dbOrderId) {
                  try {
                    const orderResponse = await orderService.getOrderById(dbOrderId);
                    if (orderResponse.success && orderResponse.data) {
                      setOrderAsRecent(orderResponse.data);
                    }
                  } catch (err) {
                    console.error("[Payment] Failed to fetch order details after payment:", err);
                  }
                }

                // Payment fully processed — clear the pending payment record
                localStorage.removeItem(PENDING_PAYMENT_KEY);

                // isProcessing stays true — component will unmount on navigate
                // Navigate to confirmation screen with payment=success flag
                navigate(
                  dbOrderId
                    ? `/order-confirmation?orderId=${dbOrderId}&payment=success`
                    : "/home"
                );
              } else {
                // verifyPayment returned success:false but didn't throw
                // This is unusual — log it and show a clear error
                console.error("[Payment] verifyPayment returned success:false", verifyData);
                isProcessing.current = false;
                setErrorMsg(
                  "Payment verification failed. Please contact support if money was deducted."
                );
              }
            } catch (err) {
              // Check if this is the specific case where payment was captured
              // but order creation failed (backend returns paymentId in this case)
              const paymentId = err?.data?.paymentId || response.razorpay_payment_id;
              const isOrderCreationFailure = err?.message?.includes("captured");

              if (isOrderCreationFailure && paymentId) {
                console.error("[Payment] CRITICAL: payment captured but order creation failed", { paymentId });
                setErrorMsg(
                  `Payment was captured but your order could not be created. ` +
                  `Please contact support with Payment ID: ${paymentId}`
                );
              } else {
                console.error("[Payment] verifyPayment error:", err);
                setErrorMsg(err.message || "Payment verification failed. Please try again.");
              }
              isProcessing.current = false;
            }
          },

          prefill: {
            name: selectedAddress?.name || "Customer",
            email: "customer@example.com",
            contact: selectedAddress?.phone || "0000000000",
          },

          theme: {
            color: "#3399cc",
          },
          modal: {
            on_dismiss: function () {
              // User closed the Razorpay modal without completing payment.
              // Reset all locks so they can try again cleanly.
              console.log("[Payment] Razorpay modal dismissed by user — payment cancelled");
              setLoading(false);
              isProcessing.current = false;
              localStorage.removeItem(PENDING_PAYMENT_KEY); // user explicitly cancelled
              // Do NOT clear cart, do NOT create order.
            },
          },
        };

        console.log("[Payment] Razorpay options built", {
          key: options.key ? `${options.key.slice(0, 8)}...` : 'MISSING',
          amount: options.amount,
          currency: options.currency,
          order_id: options.order_id,
          hasConfigDisplay: !!options.config?.display,
          upiEnabled: !!options.config?.display?.blocks?.upi,
          sequence: options.config?.display?.sequence,
        });

        const rzp = new window.Razorpay(options);
        rzp.on("payment.failed", function (response) {
          // Payment was declined / cancelled at UPI app / bank level.
          // Reset state so user can retry. Cart and order are untouched.
          const reason = response.error?.description
            || response.error?.reason
            || "Payment failed";
          console.error("[Payment] payment.failed event", {
            code:        response.error?.code,
            description: response.error?.description,
            source:      response.error?.source,
            step:        response.error?.step,
            reason:      response.error?.reason,
            metadata:    response.error?.metadata,
          });
          setLoading(false);
          isProcessing.current = false;
          localStorage.removeItem(PENDING_PAYMENT_KEY); // clear — payment definitely failed
          setErrorMsg(
            `${reason}. Your cart is safe — tap "Place Order" to try again.`
          );
        });

        // Store pending payment BEFORE opening the modal.
        // This is the crash-safety record: if the app closes after payment
        // but before verifyPayment completes, the next mount will find this
        // and trigger auto-recovery.
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
          razorpayOrderId: order.id,   // Razorpay order ID (not our DB UUID)
          addressId: selectedAddressId,
          timestamp: Date.now(),
        }));
        console.log('[Payment] Pending payment stored in localStorage', { razorpayOrderId: order.id });

        console.log('[Payment] Opening Razorpay modal...');
        rzp.open();
        console.log('[Payment] Razorpay modal open() called — waiting for user interaction');
      } catch (error) {
        // initiate-payment call failed (network error, server error, etc.)
        console.error("[Payment] initiate-payment error:", error);
        setErrorMsg(
          error.message ||
          "Failed to create payment order. Please try again."
        );
        setLoading(false);
        isProcessing.current = false;
      }

      return;
    }

    // -------- Cash On Delivery --------
    try {
      setLoading(true);

      const response = await orderService.checkout({
        addressId: selectedAddressId,
        paymentMethod,
        pricing: {
          subtotal,
          deliveryFee: resolvedDeliveryFee,
          convenienceFee: resolvedConvenienceFee,
          finalAmount: grandTotal,
        },
        items: cartItems.map((item) => ({
          itemId: item.item_id || item.clientItemId || item.id,
          quantity: item.quantity,
        })),
      });

      await clearCart();

      // Prefer the real Supabase UUID; order_number is a readable fallback.
      // "success" is a last-resort sentinel that the confirmation page handles.
      const orderId =
        response.data?.order?.id ||
        response.data?.id ||
        response.data?.order?.order_number ||
        null;

      // Fetch order details to display in notification
      if (orderId) {
        try {
          const orderResponse = await orderService.getOrderById(orderId);
          if (orderResponse.success && orderResponse.data) {
            setOrderAsRecent(orderResponse.data);
          }
        } catch (err) {
          console.error("Failed to fetch order details:", err);
        }
      }

      // Navigate to confirmation screen (no payment=success flag for COD)
      navigate(
        orderId
          ? `/order-confirmation?orderId=${orderId}`
          : "/home"
      );
    } catch (error) {
      console.error("[COD] Checkout failed:", error);
      setErrorMsg(
        error.message ||
        "Failed to place order. Please try again."
      );
    } finally {
      setLoading(false);
      isProcessing.current = false;  // always unlock for COD
    }
  };

  const handleBackToHome = () => {
    navigate("/home");
  };

  const handleEditAddress = () => {
    navigate("/address", {
      state: {
        from: "/checkout/payment",
        selectedAddressId,
      },
    });
  };

  if (!cartItems || cartItems.length === 0) return null;

  // ── App Unavailability Full-Screen Block ────────────────────────────────
  // If admin turned the toggle OFF, or we're outside delivery hours,
  // show a clear message instead of the checkout form.
  // Cart items are preserved — user can checkout once the app reopens.
  if (appClosed) {
    return (
      <div className="checkout-page">
        <div className="checkout-container">
          <button
            className="checkout-back-btn"
            onClick={handleBackToHome}
            aria-label="Go back"
          >
            ←
          </button>
          <div className="checkout-unavailable-block">
            <span className="checkout-unavailable-icon">🔒</span>
            <h2 className="checkout-unavailable-title">Orders Unavailable</h2>
            <p className="checkout-unavailable-msg">
              {appUnavailableReason ||
                'We are currently not accepting orders. Please try again later.'}
            </p>
            <p className="checkout-unavailable-sub">
              Your cart is saved. Come back when we reopen!
            </p>
            <button
              className="checkout-unavailable-back-btn"
              onClick={handleBackToHome}
            >
              ← Browse Shops
            </button>
          </div>
        </div>
      </div>
    );
  }
  // ─────────────────────────────────────────────────────────────────────

  return (
    <div className="checkout-page">
      <div className="checkout-container">
        <button
          className="checkout-back-btn"
          onClick={handleBackToHome}
          aria-label="Go back"
        >
          ←
        </button>

        <div className="checkout-title-row">
          <h1 className="checkout-title">Checkout</h1>
          <span className="checkout-step-indicator">
            Step 2 of 2
          </span>
        </div>

        <form
          className="checkout-form"
          onSubmit={handlePlaceOrder}
        >
          {errorMsg && (
            <div className="error-message">
              {errorMsg}
            </div>
          )}

          {/* Address Section */}
          <div className="checkout-section">
            <div className="section-heading">
              <span>Delivery Address</span>
              <button
                type="button"
                className="checkout-address-edit-link"
                onClick={handleEditAddress}
              >
                Edit
              </button>
            </div>

            {selectedAddress && (
              <div className="selected-address-card">
                <div className="selected-address-name">
                  {selectedAddress.name}
                </div>

                <div className="selected-address-line">
                  {formatPrimaryLine(selectedAddress)}
                </div>

                <div className="selected-address-line muted">
                  {formatSecondaryLine(selectedAddress)}
                </div>

                <div className="selected-address-line">
                  📞 {selectedAddress.phone}
                </div>
              </div>
            )}
          </div>

          {/* Payment */}
          <div className="checkout-section">
            <h2>Payment Method</h2>

            <label>
              <input
                type="radio"
                value="COD"
                checked={paymentMethod === "COD"}
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
              />
              Cash on Delivery
            </label>

            <label>
              <input
                type="radio"
                value="Online"
                checked={paymentMethod === "Online"}
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
              />
              Online Payment (UPI / Card / Wallet)
            </label>
          </div>

          <button
            type="submit"
            id="btn-place-order"
            className="place-order-btn"
            disabled={
              loading ||
              isProcessing.current ||
              (platformSettingsLoading && deliveryFee === null) ||
              appClosed
            }
          >
            {loading
              ? 'Processing...'
              : appClosed
              ? 'Orders Unavailable'
              : (platformSettingsLoading && deliveryFee === null
                ? 'Loading charges...'
                : 'Place Order')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPayment;
