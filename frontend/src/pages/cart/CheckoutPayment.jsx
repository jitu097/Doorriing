import { api } from "../../services/api";

const CheckoutPayment = () => {
  // ... (rest of component remains same until handlePlaceOrder)

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
                sessionStorage.removeItem("checkoutSelectedAddressId");
                navigate(`/order-confirmation?orderId=${order.id}`);
              } else {
                setErrorMsg("Payment verification failed. Please try again.");
              }
            } catch (err) {
              setErrorMsg(err.message || "Payment verification failed.");
            }
          },
              await clearCart();
              sessionStorage.removeItem(
                "checkoutSelectedAddressId"
              );

              navigate(
                `/order-confirmation?orderId=${order.id}`
              );
            } else {
              setErrorMsg(
                "Payment verification failed. Please try again."
              );
            }
          },

          prefill: {
            name: selectedAddress?.name || "Test User",
            email: "test@example.com",
            contact: selectedAddress?.phone || "9999999999",
          },

          method: {
            netbanking: true,
            card: true,
            upi: true,
            wallet: true,
            paylater: true,
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
      });

      await clearCart();
      sessionStorage.removeItem("checkoutSelectedAddressId");

      const orderId =
        response.data?.order?.id ||
        response.data?.order?.order_number ||
        "success";

      navigate(`/order-confirmation?orderId=${orderId}`);
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

  const handleBackToAddress = () => {
    navigate("/checkout", { state: { selectedAddressId } });
  };

  if (!cartItems || cartItems.length === 0) return null;

  return (
    <div className="checkout-page">
      <div className="checkout-container">

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
                className="address-edit-btn"
                onClick={handleBackToAddress}
              >
                Change
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
            disabled={loading}
          >
            {loading ? "Processing..." : "Place Order"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CheckoutPayment;

//jitu