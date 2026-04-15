import React, { useEffect, useMemo, useState } from "react";
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

  const { cartItems, getCartTotal, clearCart, deliveryFee, convenienceFee, platformSettingsLoading } = useCart();
  const { addresses, activeAddress } = useAddress();

  const [paymentMethod, setPaymentMethod] = useState("COD");
  const [errorMsg, setErrorMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  const subtotal = getCartTotal();
  const resolvedDeliveryFee = deliveryFee ?? 0;
  const resolvedConvenienceFee = convenienceFee ?? 0;
  const grandTotal = subtotal + resolvedDeliveryFee + resolvedConvenienceFee;

  useEffect(() => {
    if (!cartItems || cartItems.length === 0) {
      navigate("/home", { replace: true });
    }
  }, [cartItems, navigate]);

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

    if (!selectedAddressId) {
      setErrorMsg(
        "Missing delivery address. Please go back and select one."
      );
      return;
    }

    if (platformSettingsLoading && deliveryFee === null) {
      setErrorMsg("Loading delivery charges. Please wait a moment.");
      return;
    }

    // -------- Razorpay Payment --------
    if (paymentMethod === "Card") {
      try {
        setLoading(true);

        const order = await api.post("/user/orders/initiate-payment", {
          amount: grandTotal,
        });

        if (!window.Razorpay) {
          setErrorMsg("Razorpay SDK not loaded");
          return;
        }

        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          name: "Doorriing",
          description: "Order Payment",
          order_id: order.id,

          handler: async function (response) {
            try {
              const verifyData = await api.post("/user/orders/verify-payment", {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });

              if (verifyData.success) {
                await clearCart();
                // Fetch order details to display in notification
                try {
                  const orderResponse = await orderService.getOrderById(order.id);
                  if (orderResponse.success && orderResponse.data) {
                    setOrderAsRecent(orderResponse.data);
                  }
                } catch (err) {
                  console.error("Failed to fetch order details:", err);
                }

                navigate("/home");
              } else {
                setErrorMsg("Payment verification failed. Please try again.");
              }
            } catch (err) {
              setErrorMsg(err.message || "Payment verification failed.");
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
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
      } catch (error) {
        setErrorMsg(
          error.message ||
          "Failed to create payment order. Please try again."
        );
      } finally {
        setLoading(false);
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
          itemId: item.id,
          quantity: item.quantity,
        })),
      });

      await clearCart();
      const orderId =
        response.data?.order?.id ||
        response.data?.order?.order_number ||
        response.data?.id ||
        "success";

      // Fetch order details to display in notification
      try {
        const orderResponse = await orderService.getOrderById(orderId);
        if (orderResponse.success && orderResponse.data) {
          setOrderAsRecent(orderResponse.data);
        }
      } catch (err) {
        console.error("Failed to fetch order details:", err);
      }

      navigate("/home");
    } catch (error) {
      console.error("Checkout failed:", error);
      setErrorMsg(
        error.message ||
        "Failed to place order. Please try again."
      );
    } finally {
      setLoading(false);
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
                value="Card"
                checked={paymentMethod === "Card"}
                onChange={(e) =>
                  setPaymentMethod(e.target.value)
                }
              />
              Online Payment (UPI / Card)
            </label>
          </div>

          <button
            type="submit"
            className="place-order-btn"
            disabled={loading || (platformSettingsLoading && deliveryFee === null)}
          >
            {loading ? "Processing..." : (platformSettingsLoading && deliveryFee === null ? "Loading charges..." : "Place Order")}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPayment;
