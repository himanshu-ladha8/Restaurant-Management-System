import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Divider,
  Card,
  CardContent,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { useThemeMode } from "../../context/ThemeContext";
import {
  CreditCard,
  AccountBalance,
  Payment,
  QrCode,
  AttachMoney,
  Close,
} from "@mui/icons-material";
import StripeCheckout from "./StripeCheckout";

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
    icon: Payment,
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

const PaymentDialog = ({ open, onClose, order, onPaymentSuccess }) => {
  const { mode } = useThemeMode();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [selectedMethod, setSelectedMethod] = useState("Cash");
  const [error, setError] = useState("");
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const isMountedRef = useRef(true);

  // Initialize ref on mount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Reset state when dialog opens (not when it closes to avoid concurrent rendering issues)
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      setSelectedMethod("Cash");
      setError("");
      setPaymentProcessing(false);
    }
  }, [open]);

  const handleClose = () => {
    // Don't allow closing if payment is being processed
    if (paymentProcessing) {
      return;
    }
    // State will be reset when dialog opens next time via useEffect
    onClose();
  };

  // Cash / Counter payment handler
  const handleOfflinePayment = async () => {
    if (!isMountedRef.current) return;
    setError(""); // Clear any previous errors
    setPaymentProcessing(true);
    try {
      await onPaymentSuccess({
        amount: order.totalAmount,
        paymentMode: selectedMethod,
        transactionId: null,
      });
      // Parent's handlePaymentSuccess will close the dialog
      // Don't call onClose() here to avoid triggering order cancellation
      if (isMountedRef.current) {
        setPaymentProcessing(false);
      }
    } catch (err) {
      // If payment fails, show error but don't close dialog
      // User can retry or cancel (only if still mounted)
      if (isMountedRef.current) {
        setPaymentProcessing(false);
        setError(err.response?.data?.message || err.response?.data || err.message || "Failed to process payment");
      }
      console.error("Payment error:", err);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={paymentProcessing ? () => {} : handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      disableEscapeKeyDown={paymentProcessing}
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography fontWeight={600}>
            Payment for Order #{order?.orderId}
          </Typography>
          <IconButton onClick={handleClose} disabled={paymentProcessing}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Total Amount */}
        <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)", border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)", color: mode === 'dark' ? "white" : "#1a1a1a" }}>
          <CardContent>
            <Typography variant="body2">Total Amount</Typography>
            <Typography variant="h4" fontWeight={700}>
              ₹{order?.totalAmount?.toFixed(2)}
            </Typography>
          </CardContent>
        </Card>

        <Divider sx={{ mb: 2 }} />

        {/* Payment Method Selection */}
        <Typography fontWeight={600} mb={2}>
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
                }}
                onClick={() => setSelectedMethod(method.id)}
              >
                <CardContent>
                  <FormControlLabel
                    value={method.id}
                    control={<Radio />}
                    label={
                      <Box display="flex" alignItems="center" gap={2}>
                        <Icon sx={{ color: method.color }} />
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
          <StripeCheckout
            order={order}
            onSuccess={async (paymentData) => {
              // paymentData contains: amount, paymentMode: "Online", transactionId
              // Mark payment as processing to prevent dialog from closing
              if (!isMountedRef.current) return;
              setPaymentProcessing(true);
              // Wait for payment success handler to complete before closing
              try {
                await onPaymentSuccess(paymentData);
                // Parent's handlePaymentSuccess will close the dialog
                // Don't call onClose() here to avoid triggering order cancellation
                if (isMountedRef.current) {
                  setPaymentProcessing(false);
                }
              } catch (err) {
                // If payment success handler fails, show error but don't close dialog
                if (isMountedRef.current) {
                  setPaymentProcessing(false);
                  setError(err.response?.data?.message || err.response?.data || err.message || "Failed to process payment");
                }
                console.error("Payment success handler error:", err);
              }
            }}
            onError={(msg) => {
              if (isMountedRef.current) {
                setPaymentProcessing(false);
                setError(msg);
              }
            }}
          />
        )}

        {/* Offline Payment Info */}
        {(selectedMethod === "Cash" || selectedMethod === "Counter") && (
          <Alert severity="info" sx={{ mt: 2 }}>
            Please pay ₹{order?.totalAmount?.toFixed(2)}{" "}
            {selectedMethod === "Cash" ? "at the table" : "at the counter"}.
          </Alert>
        )}

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>

      {/* Offline Payment Actions */}
      {(selectedMethod === "Cash" || selectedMethod === "Counter") && (
        <DialogActions>
          <Button onClick={handleClose} disabled={paymentProcessing}>Cancel</Button>
          <Button variant="contained" onClick={handleOfflinePayment} disabled={paymentProcessing}>
            Place Order
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PaymentDialog;