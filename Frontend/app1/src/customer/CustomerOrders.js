import { useState, useEffect, useContext, useRef } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { formatDateTime } from "../utils/dateUtils";
import {  Box,  Card,  CardContent,  Typography,  Grid,  Chip,  CircularProgress,  Alert,  Snackbar,  Button,  Accordion,  AccordionSummary,  AccordionDetails,  Table,  TableBody,  TableCell,  TableContainer,  TableHead,  TableRow,  Divider,  ToggleButtonGroup,  ToggleButton,  Stack,} from "@mui/material";
import {  ShoppingCart,  ExpandMore,  Restaurant,  TableRestaurant,  Refresh,  FilterList,  Star,} from "@mui/icons-material";
import { getAllMyOrders, payOrder, cancelOrder } from "../services/OrderService";
import Layout from "../shared/components/Layout";
import signalRService from "../services/signalRService";
import PaymentDialog from "./components/PaymentDialog";
import ReviewDialog from "./components/ReviewDialog";

const CustomerOrders = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const location = useLocation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });
  const [statusFilter, setStatusFilter] = useState("All");
  const [payDialog, setPayDialog] = useState({ open: false, order: null });
  const [reviewDialog, setReviewDialog] = useState({ open: false, restaurantId: null, restaurantName: "" });
  const ordersContainerRef = useRef(null);
  const previousOrdersLengthRef = useRef(0);

  // Check if navigated from home screen
  const fromHome = location.state?.fromHome || false;
  const backPath = fromHome ? "/" : "/customer-dashboard";

  const navLinks = [
    { path: "/customer-dashboard", label: "Dashboard" },
    { path: "/customer-restaurants", label: "Restaurants" },
    { path: "/payment-history", label: "Payment History" },
  ];

  useEffect(() => {
    if (user) {
      fetchOrders();
      
      // Setup SignalR for real-time updates
      const setupSignalR = async () => {
        const userId = user.userId || user.UserId;
        const userRole = user.role || user.userType || user.UserType;
        
        console.log("Setting up SignalR for Customer:", { userId, userRole });
        
        if (userId && userRole === "Customer") {
          try {
            await signalRService.startConnection(userId, userRole);
            
            // Wait for connection to be fully established
            let retries = 0;
            while (!signalRService.isConnected && retries < 10) {
              await new Promise(resolve => setTimeout(resolve, 200));
              retries++;
            }
            
            if (!signalRService.isConnected) {
              console.error("SignalR connection failed to establish");
              return null;
            }
            
            // Listen for order status updates
            const handler = (data) => {
              console.log("📬 OrderStatusUpdated received:", data);
              setSnackbar({ 
                open: true, 
                message: `Order #${data.orderId || data.OrderId} status updated to ${data.orderStatus || data.OrderStatus}`, 
                severity: "info" 
              });
              fetchOrders(); // Refresh orders
              // Auto-scroll to top of orders list when new update arrives
              setTimeout(() => {
                if (ordersContainerRef.current) {
                  ordersContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 300);
            };
            
            signalRService.on("OrderStatusUpdated", handler);
            
            // Store handler for cleanup
            return handler;
          } catch (error) {
            console.error("❌ Failed to setup SignalR:", error);
          }
        }
        return null;
      };
      
      let handler = null;
      setupSignalR().then(h => {
        handler = h;
      });
      
      // Cleanup on unmount
      return () => {
        if (handler) {
          signalRService.off("OrderStatusUpdated", handler);
        } else {
          signalRService.off("OrderStatusUpdated");
        }
      };
    } else {
      setLoading(false);
    }
  }, [user, statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await getAllMyOrders();
      const ordersData = response.data || [];
      
      const statusPriority = {
        Pending: 1,
        Preparing: 2,
        Ready: 3,
        Served: 4,
        Paid: 5,
        Cancelled: 6,
      };

      const normalizedOrders = ordersData.map(order => ({
        orderId: order.orderId || order.OrderId,
        restaurantId: order.restaurantId || order.RestaurantId,
        restaurantName: order.restaurantName || order.RestaurantName || "Unknown Restaurant",
        tableId: order.tableId || order.TableId,
        tableNumber: order.tableNumber || order.TableNumber || "N/A",
        orderStatus: order.orderStatus || order.OrderStatus,
        totalAmount: order.totalAmount || order.TotalAmount,
        createdAt: order.createdAt || order.CreatedAt,
        statusOrder: statusPriority[order.orderStatus || order.OrderStatus] ?? 99,
        latestPayment: order.latestPayment || order.LatestPayment || null,
        orderItems: (order.orderItems || order.OrderItems || []).map(item => ({
          orderItemId: item.orderItemId || item.OrderItemId,
          mealId: item.mealId || item.MealId,
          mealName: item.mealName || item.MealName || "Unknown Meal",
          quantity: item.quantity || item.Quantity,
          price: item.price || item.Price,
          totalPrice: item.totalPrice || item.TotalPrice,
        }))
      }));
      
      const filtered =
        statusFilter === "All"
          ? normalizedOrders
          : normalizedOrders.filter((o) => (o.orderStatus || "").toLowerCase() === statusFilter.toLowerCase());

      filtered.sort((a, b) => (a.statusOrder - b.statusOrder) || new Date(b.createdAt) - new Date(a.createdAt));

      // Auto-scroll if new orders were added
      const hasNewOrders = filtered.length > previousOrdersLengthRef.current;
      previousOrdersLengthRef.current = filtered.length;
      
      setOrders(filtered);
      
      // Auto-scroll to top when new orders arrive
      if (hasNewOrders && !loading) {
        setTimeout(() => {
          if (ordersContainerRef.current) {
            ordersContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setSnackbar({ open: true, message: "Failed to load orders: " + (err.response?.data || err.message), severity: "error" });
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Preparing":
        return "info";
      case "Ready":
        return "success";
      case "Served":
        return "success";
      case "Paid":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const summary = orders.reduce(
    (acc, o) => {
      acc.total += o.totalAmount || 0;
      acc.count += 1;
      return acc;
    },
    { total: 0, count: 0 }
  );

  const handlePay = (order) => {
    // Ensure order object has all required properties for PaymentDialog
    const orderForPayment = {
      orderId: order.orderId || order.OrderId,
      restaurantName: order.restaurantName || order.RestaurantName || "Unknown Restaurant",
      tableNumber: order.tableNumber || order.TableNumber || "N/A",
      totalAmount: order.totalAmount || order.TotalAmount || 0,
    };
    setPayDialog({
      open: true,
      order: orderForPayment,
    });
  };

  const closePayDialog = () => {
    setPayDialog({ open: false, order: null });
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (!payDialog.order?.orderId) return;
    try {
      await payOrder(payDialog.order.orderId, paymentData);
      setSnackbar({ 
        open: true, 
        message: `Payment successful via ${paymentData.paymentMode}!`, 
        severity: "success" 
      });
      fetchOrders();
      // Close dialog after successful payment
      closePayDialog();
    } catch (err) {
      setSnackbar({ 
        open: true, 
        message: err.response?.data?.message || err.response?.data || "Failed to process payment", 
        severity: "error" 
      });
      throw err; // Re-throw to be handled by PaymentDialog
    }
  };

  const handleCancelOrder = async (order) => {
    if (!window.confirm(`Are you sure you want to cancel order #${order.orderId}?`)) {
      return;
    }

    try {
      await cancelOrder(order.orderId);
      setSnackbar({ open: true, message: "Order cancelled successfully.", severity: "success" });
      fetchOrders();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.message || err.response?.data || "Failed to cancel order", severity: "error" });
    }
  };

  const handleReview = (order) => {
    const restaurantId = order.restaurantId || order.RestaurantId;
    const restaurantName = order.restaurantName || order.RestaurantName || "Restaurant";
    setReviewDialog({ open: true, restaurantId, restaurantName });
  };

  const handleReviewSubmitted = () => {
    setSnackbar({ open: true, message: "Review submitted successfully!", severity: "success" });
    fetchOrders();
  };

  if (!user) {
    return (
      <Layout title="My Orders" backPath={backPath} navLinks={navLinks}>
        <Alert severity="info" sx={{ mb: 3 }}>
          Please login to view your orders.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="My Orders" backPath="/customer-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 3, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Order History
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <ToggleButtonGroup
            size="small"
            value={statusFilter}
            exclusive
            onChange={(_, val) => val && setStatusFilter(val)}
            sx={{ flexWrap: "wrap" }}
          >
            {["All", "Pending", "Preparing", "Ready", "Served", "Paid", "Cancelled"].map((status) => (
              <ToggleButton key={status} value={status}>
                {status}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchOrders}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>
      </Box>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Orders
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                {orders.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Total Spent
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700 }}>
                ₹{summary.total.toFixed(2)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <ShoppingCart sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
              No orders found
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
              Your order history will appear here
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} ref={ordersContainerRef}>
          {orders.map((order) => {
            const orderId = order.orderId || order.OrderId;
            const restaurantName = order.restaurantName || "Unknown Restaurant";
            const tableNumber = order.tableNumber || "N/A";
            const orderStatus = order.orderStatus || order.OrderStatus;
            const totalAmount = order.totalAmount || order.TotalAmount;
            const createdAt = order.createdAt || order.CreatedAt;
            const orderItems = order.orderItems || [];
            
            return (
              <Grid item xs={12} key={orderId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Order #{orderId}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <Restaurant fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                              {restaurantName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <TableRestaurant fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                              Table {tableNumber}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          {createdAt ? formatDateTime(createdAt) : "N/A"}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Chip
                          label={orderStatus}
                          color={getStatusColor(orderStatus)}
                          sx={{ mb: 1 }}
                        />
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                          ₹{totalAmount || 0}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2">
                          Order Items ({orderItems.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {orderItems.length === 0 ? (
                          <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                            No items in this order.
                          </Typography>
                        ) : (
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Meal</TableCell>
                                  <TableCell align="right">Quantity</TableCell>
                                  <TableCell align="right">Price</TableCell>
                                  <TableCell align="right">Total</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {orderItems.map((item) => {
                                  const mealName = item.mealName || "Unknown Meal";
                                  const quantity = item.quantity || item.Quantity;
                                  const price = item.price || item.Price;
                                  const totalPrice = item.totalPrice || item.TotalPrice || (price * quantity);
                                  
                                  return (
                                    <TableRow key={item.orderItemId || item.OrderItemId}>
                                      <TableCell>{mealName}</TableCell>
                                      <TableCell align="right">{quantity}</TableCell>
                                      <TableCell align="right">₹{price}</TableCell>
                                      <TableCell align="right">₹{totalPrice}</TableCell>
                                    </TableRow>
                                  );
                                })}
                              </TableBody>
                            </Table>
                          </TableContainer>
                        )}
                      </AccordionDetails>
                    </Accordion>

                  <Box sx={{ mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
                    <Box>
                      {order.latestPayment ? (
                        <>
                          <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} display="block">
                            Payment: {order.latestPayment.paymentMode || order.latestPayment.PaymentMode || "N/A"}
                          </Typography>
                          <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} display="block">
                            Status: {orderStatus === "Cancelled" 
                              ? (order.latestPayment.paymentStatus === "Refunded" || order.latestPayment.PaymentStatus === "Refunded" 
                                  ? "Refunded" 
                                  : "Cancelled")
                              : (order.latestPayment.paymentStatus || order.latestPayment.PaymentStatus || "N/A")}
                          </Typography>
                          {(order.latestPayment.transactionId || order.latestPayment.TransactionId) && (
                            <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} display="block">
                              Txn ID: {order.latestPayment.transactionId || order.latestPayment.TransactionId}
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          {orderStatus === "Cancelled" ? "No payment was made for this cancelled order." : "No payment recorded yet."}
                        </Typography>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {["Ready", "Served"].includes(orderStatus) && !order.latestPayment && (
                        <Button variant="contained" size="small" onClick={() => handlePay(order)}>
                          Pay now
                        </Button>
                      )}
                      {["Pending", "Preparing"].includes(orderStatus) && (
                        <Button 
                          variant="outlined" 
                          color="error" 
                          size="small" 
                          onClick={() => handleCancelOrder(order)}
                        >
                          Cancel Order
                        </Button>
                      )}
                      {["Paid", "Completed"].includes(orderStatus) && (
                        <Button 
                          variant="outlined" 
                          color="primary" 
                          size="small" 
                          onClick={() => handleReview(order)}
                          startIcon={<Star />}
                        >
                          Review Restaurant
                        </Button>
                      )}
                    </Box>
                  </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <PaymentDialog
        open={payDialog.open}
        onClose={closePayDialog}
        order={payDialog.order}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ReviewDialog
        open={reviewDialog.open}
        onClose={() => setReviewDialog({ open: false, restaurantId: null, restaurantName: "" })}
        restaurantId={reviewDialog.restaurantId}
        restaurantName={reviewDialog.restaurantName}
        onReviewSubmitted={handleReviewSubmitted}
      />

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

export default CustomerOrders;
