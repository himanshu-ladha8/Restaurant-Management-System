import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { formatDateTime } from "../utils/dateUtils";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {  Box,  Card,  CardContent,  Typography,  Grid,  Chip,  CircularProgress,  Alert,  Snackbar,  FormControl,  InputLabel,  Select,  MenuItem,  Button,  Accordion,  AccordionSummary,  AccordionDetails,  Table,  TableBody,  TableCell,  TableContainer,  TableHead,  TableRow,  Divider,  Stack,} from "@mui/material";
import {  Receipt,  ExpandMore,  TableRestaurant,  FilterList,} from "@mui/icons-material";
import { getOrders, updateOrderStatus } from "../services/RestaurantOrderService";
import Layout from "../shared/components/Layout";
import signalRService from "../services/signalRService";

const RestaurantOrders = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const ordersContainerRef = useRef(null);
  const previousOrdersLengthRef = useRef(0);

  const restaurantId = user?.restaurantId;

  const navLinks = [
    { path: "/restaurant-dashboard", label: "Dashboard" },
    { path: "/restaurant-tables", label: "Tables" },
    { path: "/restaurant-meals", label: "Meals" },
    { path: "/restaurant-reservations", label: "Reservations" },
    { path: "/restaurant-orders", label: "Orders" },
  ];

  const statusPriority = {
    Pending: 1,
    Preparing: 2,
    Ready: 3,
    Served: 4,
    Paid: 5,
    Cancelled: 6,
  };

  const fetchOrders = useCallback(async () => {
    if (!restaurantId) return;

    try {
      setLoading(true);
      const response = await getOrders(statusFilter || null);
      const ordersData = response.data || [];
      
      const normalizedOrders = ordersData.map(order => ({
        orderId: order.orderId || order.OrderId,
        tableId: order.tableId || order.TableId,
        tableNumber: order.tableNumber || order.TableNumber || order.table?.tableNumber || order.table?.TableNumber || `Table ${order.tableId || order.TableId}`,
        customerId: order.customerId || order.CustomerId,
        orderStatus: order.orderStatus || order.OrderStatus,
        totalAmount: order.totalAmount || order.TotalAmount,
        createdAt: order.createdAt || order.CreatedAt,
        statusOrder: statusPriority[order.orderStatus || order.OrderStatus] ?? 99,
        latestPayment: order.latestPayment || order.LatestPayment || null,
        orderItems: (order.orderItems || order.OrderItems || []).map(item => ({
          orderItemId: item.orderItemId || item.OrderItemId,
          mealId: item.mealId || item.MealId,
          quantity: item.quantity || item.Quantity,
          price: item.price || item.Price,
          totalPrice: item.totalPrice || item.TotalPrice,
          meal: item.meal || item.Meal ? {
            name: item.meal?.name || item.Meal?.Name || item.meal?.Name || item.Meal?.name || "Unknown",
            mealId: item.meal?.mealId || item.Meal?.MealId || item.meal?.MealId || item.Meal?.mealId
          } : null
        }))
      }));
      
      normalizedOrders.sort((a, b) => (a.statusOrder - b.statusOrder) || new Date(b.createdAt) - new Date(a.createdAt));
      
      // Auto-scroll if new orders were added
      const hasNewOrders = normalizedOrders.length > previousOrdersLengthRef.current;
      previousOrdersLengthRef.current = normalizedOrders.length;
      
      setOrders(normalizedOrders);
      
      // Auto-scroll to top when new orders arrive
      if (hasNewOrders) {
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
  }, [restaurantId, statusFilter]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    // Fetch orders
    fetchOrders();
    
    // Setup SignalR for real-time updates
    let handlers = null;
    let isMounted = true;
    
    const setupSignalR = async () => {
      const userId = user?.userId || user?.UserId;
      const userRole = user?.role || user?.userType || user?.UserType;
      
      if (!userId || userRole !== "RestaurantAdmin" || !restaurantId) {
        return;
      }

      try {
        await signalRService.startConnection(userId, userRole, restaurantId);
        
        // Wait a bit for connection to be fully established
        await new Promise(resolve => setTimeout(resolve, 500));
        
        if (!isMounted) return; // Component unmounted during setup
        
        // Listen for new orders
        const newOrderHandler = (data) => {
          if (!isMounted) return;
          console.log("NewOrder received:", data);
          setSnackbar({ 
            open: true, 
            message: `New order #${data.orderId} from Table ${data.tableNumber}!`, 
            severity: "info" 
          });
          fetchOrders(); // Refresh orders
          // Auto-scroll to top of orders list when new order arrives
          setTimeout(() => {
            if (ordersContainerRef.current && isMounted) {
              ordersContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        };
        
        // Listen for order status updates (from customer cancellations, etc.)
        const statusUpdateHandler = (data) => {
          if (!isMounted) return;
          console.log("OrderStatusUpdated received:", data);
          setSnackbar({ 
            open: true, 
            message: `Order #${data.orderId} status updated to ${data.orderStatus}`, 
            severity: "info" 
          });
          fetchOrders(); // Refresh orders
          // Auto-scroll to top of orders list when order is updated
          setTimeout(() => {
            if (ordersContainerRef.current && isMounted) {
              ordersContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        };
        
        signalRService.on("NewOrder", newOrderHandler);
        signalRService.on("OrderStatusUpdated", statusUpdateHandler);
        
        // Store handlers for cleanup
        handlers = { newOrderHandler, statusUpdateHandler };
      } catch (error) {
        console.error("Failed to setup SignalR:", error);
      }
    };
    
    setupSignalR();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (handlers) {
        signalRService.off("NewOrder", handlers.newOrderHandler);
        signalRService.off("OrderStatusUpdated", handlers.statusUpdateHandler);
      }
    };
  }, [restaurantId, statusFilter, fetchOrders, user]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    let customerLeft = null;
    
    // If status is "Completed", ask if customer has left
    if (newStatus === "Completed") {
      const customerLeftResponse = window.confirm(
        `Mark order as Completed.\n\nHas the customer left the table?\n\n` +
        `Click OK if customer has left (table will be marked as Available)\n` +
        `Click Cancel if customer is still at table (table will remain Occupied)`
      );
      customerLeft = customerLeftResponse; // true if OK, false if Cancel
    } else {
      // For other statuses, use standard confirmation
      if (!window.confirm(`Are you sure you want to update order status to "${newStatus}"?`)) {
        return;
      }
    }

    try {
      await updateOrderStatus(orderId, newStatus, customerLeft);
      setSnackbar({ 
        open: true, 
        message: customerLeft !== null 
          ? `Order marked as Completed. Table ${customerLeft ? "marked as Available" : "remains Occupied"}.`
          : "Order status updated successfully", 
        severity: "success" 
      });
      fetchOrders();
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data || "Failed to update order status", severity: "error" });
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
      case "Completed":
        return "success";
      case "Cancelled":
        return "error";
      default:
        return "default";
    }
  };

  const getNextActions = (status) => {
    switch (status) {
      case "Pending":
        return ["Preparing", "Cancelled"];
      case "Preparing":
        return ["Ready", "Cancelled"];
      case "Ready":
        return ["Served", "Cancelled"];
      case "Served":
        return ["Paid", "Completed"];
      case "Paid":
        // Paid orders can continue the flow (if payment happened early) or be marked as Completed
        return ["Completed", "Preparing", "Ready", "Served"];
      default:
        return [];
    }
  };

  if (!restaurantId) {
    return (
      <Layout title="Restaurant Orders" navLinks={navLinks}>
        <Alert severity="warning">
          No restaurant associated with your account. Please contact admin.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Orders" backPath="/restaurant-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          All Orders ({orders.length})
        </Typography>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Filter by Status</InputLabel>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            label="Filter by Status"
            startAdornment={<FilterList sx={{ mr: 1 }} />}
          >
            <MenuItem value="">All Orders</MenuItem>
            <MenuItem value="Pending">Pending</MenuItem>
            <MenuItem value="Preparing">Preparing</MenuItem>
            <MenuItem value="Ready">Ready</MenuItem>
            <MenuItem value="Served">Served</MenuItem>
            <MenuItem value="Paid">Paid</MenuItem>
            <MenuItem value="Completed">Completed</MenuItem>
            <MenuItem value="Cancelled">Cancelled</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <Receipt sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }} gutterBottom>
              No orders found
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
              {statusFilter ? `No orders with status "${statusFilter}"` : "No orders yet"}
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3} ref={ordersContainerRef}>
          {orders.map((order) => {
            const orderId = order.orderId || order.OrderId;
            const tableId = order.tableId || order.TableId;
            const tableNumber = order.tableNumber || `Table ${tableId}`;
            const orderStatus = order.orderStatus || order.OrderStatus;
            const totalAmount = order.totalAmount || order.TotalAmount;
            const createdAt = order.createdAt || order.CreatedAt;
            const orderItems = order.orderItems || [];
            const latestPayment = order.latestPayment;
            
            return (
              <Grid xs={12} key={orderId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                          Order #{orderId}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                            <TableRestaurant fontSize="small" color="action" />
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                              {tableNumber}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                          {createdAt ? formatDateTime(createdAt) : "N/A"}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right" }}>
                        <Chip
                          label={orderStatus}
                          color={getStatusColor(orderStatus)}
                          sx={{ mb: 1 }}
                        />
                        {latestPayment && orderStatus !== "Cancelled" && (
                          <Chip
                            label={`Payment: ${latestPayment.paymentStatus || latestPayment.PaymentStatus || "Pending"}`}
                            color={latestPayment.paymentStatus === "Paid" || latestPayment.PaymentStatus === "Paid" ? "success" : "warning"}
                            size="small"
                            sx={{ mb: 1, display: "block" }}
                          />
                        )}
                        {orderStatus === "Cancelled" && latestPayment && (
                          <Chip
                            label={`Payment: ${latestPayment.paymentStatus === "Refunded" || latestPayment.PaymentStatus === "Refunded" ? "Refunded" : "Cancelled"}`}
                            color={latestPayment.paymentStatus === "Refunded" || latestPayment.PaymentStatus === "Refunded" ? "info" : "default"}
                            size="small"
                            sx={{ mb: 1, display: "block" }}
                          />
                        )}
                        <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                          ₹{totalAmount || 0}
                        </Typography>
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mb: 1, fontWeight: 300 }}>
                        Quick update
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {getNextActions(orderStatus).map((next) => (
                          <Button
                            key={next}
                            size="small"
                            variant={next === "Cancelled" ? "outlined" : "contained"}
                            color={next === "Cancelled" ? "error" : "primary"}
                            onClick={() => handleStatusUpdate(orderId, next)}
                          >
                            {next}
                          </Button>
                        ))}
                        {getNextActions(orderStatus).length === 0 && (
                          <Chip label="No further actions" size="small" color="default" />
                        )}
                      </Stack>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      {latestPayment ? (
                        <Stack spacing={0.5}>
                          <Typography variant="subtitle2">Payment</Typography>
                          <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                            Mode: {latestPayment.paymentMode || latestPayment.PaymentMode || "N/A"}
                          </Typography>
                          <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                            Status: {orderStatus === "Cancelled" 
                              ? (latestPayment.paymentStatus === "Refunded" || latestPayment.PaymentStatus === "Refunded" 
                                  ? "Refunded" 
                                  : "Cancelled")
                              : (latestPayment.paymentStatus || latestPayment.PaymentStatus || "N/A")}
                          </Typography>
                          <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                            Received: {latestPayment.createdAt ? formatDateTime(latestPayment.createdAt) : "N/A"}
                          </Typography>
                        </Stack>
                      ) : (
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                          {orderStatus === "Cancelled" ? "No payment was made for this cancelled order." : "No payment recorded yet."}
                        </Typography>
                      )}
                    </Box>

                    <Accordion>
                      <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography variant="subtitle2">
                          Order Items ({orderItems.length})
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {orderItems.length === 0 ? (
                          <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
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
                                  const mealName = item.meal?.name || "Unknown Meal";
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
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

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

export default RestaurantOrders;
