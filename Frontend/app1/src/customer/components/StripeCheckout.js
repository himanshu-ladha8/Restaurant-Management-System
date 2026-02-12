import { useEffect, useState } from "react";
import { CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import {
  Box,
  Button,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  Card,
  CardContent,
  Typography,
  IconButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  CreditCard,
  Delete,
  Add,
} from "@mui/icons-material";
import {
  createStripePaymentIntent,
  confirmStripePayment,
  getSavedPaymentMethods,
  savePaymentMethod,
  deleteSavedPaymentMethod,
  createPaymentIntentWithSavedMethod,
} from "../../services/PaymentService";
import { getOrder } from "../../services/OrderService";

const StripeCheckout = ({ order, onSuccess, onError }) => {
  const stripe = useStripe();
  const elements = useElements();

  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardComplete, setCardComplete] = useState(false);
  const [savedMethods, setSavedMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState("new");
  const [saveCard, setSaveCard] = useState(false);
  const [loadingMethods, setLoadingMethods] = useState(true);
  const [stripeError, setStripeError] = useState("");

  // Check if Stripe is loaded
  useEffect(() => {
    if (!stripe) {
      setStripeError("Stripe payment is currently unavailable. Please try again later or use a different payment method.");
      onError?.("Stripe payment is currently unavailable. Please try again later or use a different payment method.");
    } else {
      setStripeError("");
    }
  }, [stripe, onError]);

  // Load saved payment methods
  useEffect(() => {
    const loadSavedMethods = async () => {
      try {
        setLoadingMethods(true);
        const response = await getSavedPaymentMethods();
        const methods = response.data || [];
        setSavedMethods(methods);
        
        // Set default method if available
        const defaultMethod = methods.find(m => m.isDefault);
        if (defaultMethod) {
          setSelectedMethod(defaultMethod.stripePaymentMethodId);
        } else if (methods.length > 0) {
          setSelectedMethod(methods[0].stripePaymentMethodId);
        }
      } catch (err) {
        console.error("Failed to load saved payment methods:", err);
        // Don't show error - just continue without saved methods
      } finally {
        setLoadingMethods(false);
      }
    };

    loadSavedMethods();
  }, []);

  // Initialize payment intent when order or selected method changes
  useEffect(() => {
    if (!order?.orderId || !order?.totalAmount) {
      setClientSecret("");
      return;
    }

    const initPayment = async () => {
      try {
        setError("");
        setClientSecret(""); // Clear previous secret
        
        // Fetch latest order total to ensure accuracy (important for incremental orders)
        let latestOrderTotal = order.totalAmount;
        if (order.orderId && order.restaurantId) {
          try {
            const orderResponse = await getOrder(order.orderId, order.restaurantId);
            latestOrderTotal = orderResponse.data?.totalAmount || orderResponse.data?.TotalAmount || order.totalAmount;
          } catch (fetchErr) {
            console.warn("Could not fetch latest order total for payment intent, using provided amount:", fetchErr);
            // Continue with the provided amount if fetch fails
          }
        }
        
        // Stripe minimum amount validation for INR
        // Stripe requires minimum $0.50 USD equivalent, which is approximately ₹50 INR
        const minimumAmountInr = 50.00;
        if (latestOrderTotal < minimumAmountInr) {
          const errorMessage = `Payment amount must be at least ₹${minimumAmountInr.toFixed(2)}. Your amount of ₹${latestOrderTotal.toFixed(2)} is too low for Stripe processing. Please add more items to your order.`;
          setError(errorMessage);
          onError?.(errorMessage);
          return;
        }
        
        // If using saved method, create intent with that method
        if (selectedMethod !== "new" && savedMethods.length > 0) {
          const method = savedMethods.find(m => m.stripePaymentMethodId === selectedMethod);
          if (!method) {
            setError("Selected payment method not found");
            return;
          }
          
          const res = await createPaymentIntentWithSavedMethod(
            order.orderId,
            latestOrderTotal,
            selectedMethod
          );
          const clientSecret = res.data?.clientSecret || res.clientSecret;
          if (!clientSecret) {
            throw new Error("No client secret received from server");
          }
          setClientSecret(clientSecret);
        } else if (selectedMethod === "new") {
          // Create regular payment intent for new card
          const res = await createStripePaymentIntent(
            order.orderId,
            latestOrderTotal
          );
          const clientSecret = res.data?.clientSecret || res.clientSecret;
          if (!clientSecret) {
            throw new Error("No client secret received from server");
          }
          setClientSecret(clientSecret);
        }
      } catch (err) {
        console.error("Failed to initialize Stripe payment:", err);
        let errorMessage = err.response?.data?.message || err.response?.data || err.message || "Failed to initialize payment";
        
        // Handle Stripe minimum amount error with user-friendly message
        if (errorMessage.includes("Amount must convert to at least") || 
            errorMessage.includes("at least 50 cents") ||
            errorMessage.includes("too low for Stripe processing")) {
          errorMessage = `Payment amount is too low. Stripe requires a minimum payment of ₹50.00. Your current amount is ₹${order.totalAmount?.toFixed(2) || "0.00"}. Please add more items to your order.`;
        }
        
        // If payment method was removed (unusable), refresh saved methods list
        if (errorMessage.includes("removed from your saved cards") || 
            errorMessage.includes("no longer usable") ||
            errorMessage.includes("previously used")) {
          try {
            const response = await getSavedPaymentMethods();
            const methods = response.data || [];
            setSavedMethods(methods);
            // Switch to new card if the selected method was removed
            if (selectedMethod !== "new") {
              setSelectedMethod("new");
            }
          } catch (refreshErr) {
            console.error("Failed to refresh saved methods:", refreshErr);
          }
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
      }
    };

    initPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.orderId, order?.totalAmount, selectedMethod, savedMethods.length]);

  const handleDeleteMethod = async (e, methodId) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this saved card?")) {
      return;
    }

    try {
      await deleteSavedPaymentMethod(methodId);
      setSavedMethods(savedMethods.filter(m => m.savedPaymentMethodId !== methodId));
      if (selectedMethod === methodId) {
        setSelectedMethod("new");
      }
    } catch (err) {
      console.error("Failed to delete payment method:", err);
      setError("Failed to delete saved card");
    }
  };

  const getCardBrandIcon = (brand) => {
    const brandLower = brand?.toLowerCase() || "";
    if (brandLower.includes("visa")) return "💳";
    if (brandLower.includes("mastercard")) return "💳";
    if (brandLower.includes("amex")) return "💳";
    return "💳";
  };

  const handlePay = async () => {
    if (!stripe || !clientSecret) return;

    // If using saved method, confirm with that method
    if (selectedMethod !== "new") {
      setLoading(true);
      setError("");

      try {
        // Confirm payment with saved payment method
        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: selectedMethod,
        });

        if (result.error) {
          setError(result.error.message);
          onError?.(result.error.message);
          setLoading(false);
          return;
        }

        if (result.paymentIntent.status === "succeeded") {
          await confirmStripePayment(
            order.orderId,
            order.totalAmount,
            result.paymentIntent.id
          );
          
          // Refresh saved methods after successful payment
          try {
            const response = await getSavedPaymentMethods();
            const methods = response.data || [];
            setSavedMethods(methods);
          } catch (err) {
            console.error("Failed to refresh saved methods:", err);
            // Don't fail payment if refresh fails
          }
          
          onSuccess?.({
            amount: order.totalAmount,
            paymentMode: "Online",
            transactionId: result.paymentIntent.id,
          });
        } else if (result.paymentIntent.status === "requires_action") {
          // Handle 3D Secure or other authentication
          setError("Payment requires additional authentication. Please complete the authentication.");
          onError?.("Payment requires additional authentication");
        } else {
          setError(`Payment status: ${result.paymentIntent.status}. Please try again.`);
          onError?.(`Payment status: ${result.paymentIntent.status}`);
        }
      } catch (err) {
        console.error("Failed to confirm payment:", err);
        setError(err.response?.data?.message || err.message || "Failed to confirm payment");
        onError?.(err.response?.data?.message || err.message || "Failed to confirm payment");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Using new card
    if (!elements) return;

    setLoading(true);
    setError("");

    const card = elements.getElement(CardElement);
    if (!card) {
      setError("Card element not found");
      setLoading(false);
      return;
    }

    try {
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card },
      });

      if (result.error) {
        setError(result.error.message);
        onError?.(result.error.message);
        setLoading(false);
        return;
      }

      if (result.paymentIntent.status === "succeeded") {
        // Backend automatically saves payment method if customer was in payment intent
        // No need to manually save - backend handles it in ConfirmStripePayment
        
        // Fetch latest order total before confirming payment to ensure accuracy
        // This is important if items were added incrementally
        let latestOrderTotal = order.totalAmount;
        if (order.orderId && order.restaurantId) {
          try {
            const orderResponse = await getOrder(order.orderId, order.restaurantId);
            latestOrderTotal = orderResponse.data?.totalAmount || orderResponse.data?.TotalAmount || order.totalAmount;
          } catch (fetchErr) {
            console.warn("Could not fetch latest order total, using provided amount:", fetchErr);
            // Continue with the provided amount if fetch fails
          }
        }
        
        await confirmStripePayment(
          order.orderId,
          latestOrderTotal,
          result.paymentIntent.id
        );
        
        // Refresh saved methods after successful payment
        try {
          const response = await getSavedPaymentMethods();
          const methods = response.data || [];
          setSavedMethods(methods);
        } catch (err) {
          console.error("Failed to refresh saved methods:", err);
          // Don't fail payment if refresh fails
        }
        
        onSuccess?.({
          amount: latestOrderTotal,
          paymentMode: "Online",
          transactionId: result.paymentIntent.id,
        });
      } else if (result.paymentIntent.status === "requires_action") {
        // Handle 3D Secure or other authentication
        setError("Payment requires additional authentication. Please complete the authentication.");
        onError?.("Payment requires additional authentication");
      } else {
        setError(`Payment status: ${result.paymentIntent.status}. Please try again.`);
        onError?.(`Payment status: ${result.paymentIntent.status}`);
      }
    } catch (err) {
      console.error("Failed to confirm payment:", err);
      setError(err.response?.data?.message || err.message || "Failed to confirm payment");
      onError?.(err.response?.data?.message || err.message || "Failed to confirm payment");
    } finally {
      setLoading(false);
    }
  };

  // Show error if Stripe is not loaded
  if (!stripe || stripeError) {
    return (
      <Box sx={{ mt: 2 }}>
        <Alert severity="error">
          {stripeError || "Stripe payment is currently unavailable. Please try again later or use a different payment method."}
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {loadingMethods ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : (
        <>
          {/* Saved Payment Methods */}
          {savedMethods.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Saved Cards
              </Typography>
              <RadioGroup
                value={selectedMethod}
                onChange={(e) => {
                  setSelectedMethod(e.target.value);
                  setError("");
                }}
              >
                {savedMethods.map((method) => (
                  <Card
                    key={method.savedPaymentMethodId}
                    sx={{
                      mb: 1,
                      border:
                        selectedMethod === method.stripePaymentMethodId
                          ? "2px solid #1976d2"
                          : "1px solid #ddd",
                      cursor: "pointer",
                      "&:hover": {
                        borderColor: "#1976d2",
                      },
                    }}
                    onClick={() => {
                      setSelectedMethod(method.stripePaymentMethodId);
                      setError("");
                    }}
                  >
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <FormControlLabel
                            value={method.stripePaymentMethodId}
                            control={<Radio />}
                            label={
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                  {getCardBrandIcon(method.cardBrand)}{" "}
                                  {method.cardBrand?.toUpperCase() || "CARD"} •••• {method.last4}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Expires {method.expMonth}/{method.expYear}
                                  {method.isDefault && " • Default"}
                                </Typography>
                              </Box>
                            }
                            sx={{ m: 0 }}
                          />
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => handleDeleteMethod(e, method.savedPaymentMethodId)}
                          sx={{ color: "error.main" }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                ))}
              </RadioGroup>
            </Box>
          )}

          {/* Option to use new card */}
          <Box sx={{ mb: 2 }}>
            <Card
              sx={{
                border:
                  selectedMethod === "new"
                    ? "2px solid #1976d2"
                    : "1px solid #ddd",
                cursor: "pointer",
                "&:hover": {
                  borderColor: "#1976d2",
                },
              }}
              onClick={() => {
                setSelectedMethod("new");
                setError("");
              }}
            >
              <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                <FormControlLabel
                  value="new"
                  control={<Radio />}
                  label={
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Add />
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Use a new card
                      </Typography>
                    </Box>
                  }
                  sx={{ m: 0 }}
                />
              </CardContent>
            </Card>
          </Box>

          {/* New Card Input */}
          {selectedMethod === "new" && (
            <Box sx={{ mb: 2 }}>
              <CardElement
                options={{
                  hidePostalCode: true,
                  style: {
                    base: {
                      fontSize: "16px",
                      color: "#32325d",
                      "::placeholder": { color: "#aab7c4" },
                    },
                    invalid: {
                      color: "#fa755a",
                    },
                  },
                }}
                onChange={(event) => {
                  setCardComplete(event.complete);
                  setError("");
                }}
              />
              
              {/* Save card checkbox */}
              <Box sx={{ mt: 1.5, display: "flex", alignItems: "center" }}>
                <FormControlLabel
                  control={
                    <Radio
                      checked={saveCard}
                      onChange={(e) => setSaveCard(e.target.checked)}
                      size="small"
                    />
                  }
                  label={
                    <Typography variant="caption" color="text.secondary">
                      Save this card for future payments
                    </Typography>
                  }
                />
              </Box>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
            disabled={
              !stripe ||
              loading ||
              !clientSecret ||
              (selectedMethod === "new" && !cardComplete)
            }
            onClick={handlePay}
          >
            {loading ? "Processing..." : `Pay ₹${order.totalAmount?.toFixed(2)}`}
          </Button>
        </>
      )}
    </Box>
  );
};

export default StripeCheckout;
