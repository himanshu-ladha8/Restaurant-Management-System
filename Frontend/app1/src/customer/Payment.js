import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useThemeMode } from "../context/ThemeContext";
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Divider,
  Button,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  AccountBalance,
  Payment as PaymentIcon,
  AttachMoney,
  ArrowBack,
} from "@mui/icons-material";
import Layout from "../shared/components/Layout";
import StripeCheckout from "./components/StripeCheckout";
import { payOrder, getOrder } from "../services/OrderService";

const PAYMENT_METHODS = [
  {
    id: "Cash",
    label: "Cash Payment",
    description: "Pay with cash at the table",
    icon: AttachMoney,
    color: "#4CAF50",
  },
  {
    id: "Online",
    label: "Online Payment",
    description: "Pay securely using Stripe",
    icon: PaymentIcon,
    color: "#FF9800",
    isStripe: true,
  },
  {
    id: "Counter",
    label: "Pay at Counter",
    description: "Pay at restaurant counter",
    icon: AccountBalance,
    color: "#F44336",
  },
];

const Payment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const order = location.state?.order;

  const [selectedMethod, setSelectedMethod] = useState("Cash");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Debug: Log the order data
    console.log("Payment page - Order data:", order);
    console.log("Payment page - Location state:", location.state);
    console.log("Payment page - Full location:", location);
  }, [order, location]);

  // Cash / Counter payment handler
  const handleOfflinePayment = async () => {
    if (!order) return;
    
    setError("");
    setLoading(true);
    try {
      // Fetch latest order details to get the current total amount
      // This ensures we have the correct total even if items were added incrementally
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

      const paymentData = {
        amount: latestOrderTotal,
        paymentMode: selectedMethod,
        transactionId: null,
      };

      // Process payment
      await payOrder(order.orderId, paymentData);
      
      // Show success and navigate
      setLoading(false);
      setTimeout(() => {
        navigate("/customer-orders");
      }, 2000);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || "A processing error occurred.";
      setError(errorMessage);
      console.error("Payment error:", err);
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (!order) {
    return (
      <Layout>
        <Container maxWidth="sm" sx={{ mt: 4, textAlign: "center" }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            No order information found. Please try placing your order again.
          </Alert>
          <Button variant="contained" onClick={() => navigate("/cart")}>
            Go Back to Cart
          </Button>
        </Container>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={handleBack}
          sx={{ mb: 3 }}
        >
          Back
        </Button>

        <Card>
          <CardContent>
            {/* Header */}
            <Box sx={{ mb: 3, textAlign: "center" }}>
              <Typography variant="h5" fontWeight={700} gutterBottom>
                Payment for Order #{order.orderId}
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                {order.restaurantName} - Table {order.tableNumber}
              </Typography>
            </Box>

            <Divider sx={{ mb: 3 }} />

            {/* Total Amount */}
            <Card sx={{ mb: 3, bgcolor: "primary.main", color: "white" }}>
              <CardContent>
                <Typography variant="body2">Total Amount</Typography>
                <Typography variant="h4" fontWeight={700}>
                  ₹{order.totalAmount?.toFixed(2)}
                </Typography>
              </CardContent>
            </Card>

            <Divider sx={{ mb: 3 }} />

            {/* Payment Method Selection */}
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Select Payment Method
            </Typography>

            <RadioGroup
              value={selectedMethod}
              onChange={(e) => {
                setSelectedMethod(e.target.value);
                setError("");
              }}
            >
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon;
                return (
                  <Card
                    key={method.id}
                    sx={{
                      mb: 2,
                      border:
                        selectedMethod === method.id
                          ? "2px solid #1976d2"
                          : "1px solid #ddd",
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        borderColor: "#1976d2",
                        boxShadow: 2,
                      },
                    }}
                    onClick={() => setSelectedMethod(method.id)}
                  >
                    <CardContent>
                      <FormControlLabel
                        value={method.id}
                        control={<Radio />}
                        label={
                          <Box display="flex" alignItems="center" gap={2}>
                            <Icon sx={{ color: method.color, fontSize: 32 }} />
                            <Box>
                              <Typography fontWeight={600}>{method.label}</Typography>
                              <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                {method.description}
                              </Typography>
                            </Box>
                          </Box>
                        }
                      />
                    </CardContent>
                  </Card>
                );
              })}
            </RadioGroup>

            {/* Stripe Payment UI */}
            {selectedMethod === "Online" && (
              <Box sx={{ mt: 3 }}>
                <StripeCheckout
                  order={order}
                  onSuccess={async (paymentData) => {
                    // paymentData contains: amount, paymentMode: "Online", transactionId
                    // For online payments, payment is already processed by Stripe
                    // Just navigate to orders page
                    setTimeout(() => {
                      navigate("/customer-orders");
                    }, 2000);
                  }}
                  onError={(msg) => setError(msg)}
                />
              </Box>
            )}

            {/* Offline Payment Info */}
            {(selectedMethod === "Cash" || selectedMethod === "Counter") && (
              <Alert severity="info" sx={{ mt: 3 }}>
                Please pay ₹{order.totalAmount?.toFixed(2)}{" "}
                {selectedMethod === "Cash" ? "at the table" : "at the counter"}.
              </Alert>
            )}

            {/* Error Display */}
            {error && (
              <Alert severity="error" sx={{ mt: 3 }}>
                {error}
              </Alert>
            )}

            {/* Offline Payment Actions */}
            {(selectedMethod === "Cash" || selectedMethod === "Counter") && (
              <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button onClick={handleBack} disabled={loading}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleOfflinePayment}
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? "Processing..." : "Place Order"}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Layout>
  );
};

export default Payment;

