import { useState, useEffect, useContext } from "react";
import { formatDateTime } from "../utils/dateUtils";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Dialog,
  IconButton,
} from "@mui/material";
import {
  Payment,
  Receipt,
  Close,
} from "@mui/icons-material";
import { getMyPayments } from "../services/PaymentService";
import { getPaymentReceipt } from "../services/PaymentService";
import Layout from "../shared/components/Layout";
import PaymentReceipt from "./components/PaymentReceipt";

const PaymentHistory = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [receiptDialog, setReceiptDialog] = useState({ open: false, receipt: null });

  const navLinks = [
    { path: "/customer-dashboard", label: "Dashboard" },
    { path: "/customer-orders", label: "Orders" },
  ];

  useEffect(() => {
    if (user) {
      fetchPayments();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await getMyPayments();
      setPayments(response.data || []);
    } catch (err) {
      console.error("Error fetching payments:", err);
      setSnackbar({ open: true, message: "Failed to load payment history", severity: "error" });
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReceipt = async (paymentId) => {
    try {
      const response = await getPaymentReceipt(paymentId);
      setReceiptDialog({ open: true, receipt: response.data });
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || "Failed to load receipt", 
        severity: "error" 
      });
    }
  };

  const getPaymentModeColor = (mode) => {
    switch (mode) {
      case "Cash":
        return "success";
      case "Card":
        return "primary";
      case "UPI":
        return "secondary";
      case "Online":
        return "warning";
      case "Counter":
        return "info";
      default:
        return "default";
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  if (!user) {
    return (
      <Layout title="Payment History" backPath="/customer-dashboard" navLinks={navLinks}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Please login to view your payment history.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Payment History" backPath="/customer-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
          Payment History
        </Typography>
        <Typography variant="body2" color="text.secondary">
          View all your payment transactions
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Total Payments
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {payments.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Total Amount Paid
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, color: "primary.main" }}>
                ₹{totalPaid.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : payments.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <Payment sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
              No payments found
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
              Your payment history will appear here
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: "primary.main" }}>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Payment ID</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Order ID</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Restaurant</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Amount</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Payment Mode</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Date</TableCell>
                <TableCell sx={{ color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => {
                const paymentId = payment.paymentId || payment.PaymentId;
                const orderId = payment.orderId || payment.OrderId;
                const restaurantName = payment.restaurantName || payment.RestaurantName || "Unknown";
                const amount = payment.amount || payment.Amount;
                const paymentMode = payment.paymentMode || payment.PaymentMode;
                const paymentStatus = payment.paymentStatus || payment.PaymentStatus;
                const createdAt = payment.createdAt || payment.CreatedAt;
                const transactionId = payment.transactionId || payment.TransactionId;

                return (
                  <TableRow key={paymentId} hover>
                    <TableCell>#{paymentId}</TableCell>
                    <TableCell>#{orderId}</TableCell>
                    <TableCell>{restaurantName}</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>₹{amount?.toFixed(2)}</TableCell>
                    <TableCell>
                      <Chip
                        label={paymentMode}
                        color={getPaymentModeColor(paymentMode)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={paymentStatus}
                        color={paymentStatus === "Paid" ? "success" : "default"}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {createdAt ? formatDateTime(createdAt) : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        startIcon={<Receipt />}
                        onClick={() => handleViewReceipt(paymentId)}
                      >
                        Receipt
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Receipt Dialog */}
      <Dialog
        open={receiptDialog.open}
        onClose={() => setReceiptDialog({ open: false, receipt: null })}
        maxWidth="md"
        fullWidth
      >
        <Box sx={{ position: "relative" }}>
          <IconButton
            sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}
            onClick={() => setReceiptDialog({ open: false, receipt: null })}
          >
            <Close />
          </IconButton>
          <PaymentReceipt
            receipt={receiptDialog.receipt}
            onClose={() => setReceiptDialog({ open: false, receipt: null })}
          />
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default PaymentHistory;

