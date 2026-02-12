import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { Box, Typography, Alert, Grid, Card, CardContent, CircularProgress, Tabs, Tab, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, FormControl, InputLabel, Select, MenuItem, Button, Stack, Accordion, AccordionSummary, AccordionDetails, Snackbar, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { Receipt, RestaurantMenu, TableRestaurant, TrendingUp, BarChart, AttachMoney, ShoppingCart, Assessment, AccessTime, CheckCircle, LocalDining, ExpandMore, ArrowBack, Payment } from "@mui/icons-material";
import Layout from "../shared/components/Layout";
import { getOrders, updateOrderStatus } from "../services/RestaurantOrderService";
import { getMeals } from "../services/MealService";
import { getTables } from "../services/TableService";
import { getAnalytics, getDailyRevenue, getDailyFoodSales } from "../services/AnalyticsService";
import signalRService from "../services/signalRService";

const RestaurantDashboard = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const restaurantId = user?.restaurantId;
  const ordersSectionRef = useRef(null);
  const previousOrdersLengthRef = useRef(0);
  const [stats, setStats] = useState({
    todayOrders: 0,
    pendingOrders: 0,
    totalMeals: 0,
    totalTables: 0,
    loading: true,
  });
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [dailyRevenue, setDailyRevenue] = useState(null);
  const [dailyRevenueLoading, setDailyRevenueLoading] = useState(false);
  const [dailyFoodSales, setDailyFoodSales] = useState(null);
  const [dailyFoodSalesLoading, setDailyFoodSalesLoading] = useState(false);
  const [dateRangeMode, setDateRangeMode] = useState("period"); // "period" or "custom"
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // Format: YYYY-MM-DD
  });
  const [activeTab, setActiveTab] = useState(0);
  const [selectedCard, setSelectedCard] = useState(null); // null, 'todayOrders', 'pendingOrders', 'meals', 'tables'
  const [orders, setOrders] = useState([]);
  const [meals, setMeals] = useState([]);
  const [tables, setTables] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [mealsLoading, setMealsLoading] = useState(false);
  const [tablesLoading, setTablesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("active");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const navLinks = [
    { path: "/restaurant-tables", label: "Tables" },
    { path: "/restaurant-meals", label: "Meals" },
    { path: "/restaurant-orders", label: "Orders" },
    { path: "/restaurant-reservations", label: "Reservations" },
    { path: "/restaurant-reviews", label: "Reviews" },
  ];

  useEffect(() => {
    if (!restaurantId) {
      setStats({ ...stats, loading: false });
      return;
    }

    const fetchStats = async () => {
      try {
        const [ordersRes, mealsRes, tablesRes] = await Promise.all([
          getOrders(null),
          getMeals(restaurantId),
          getTables(restaurantId),
        ]);

        const orders = ordersRes.data || [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayOrders = orders.filter(order => {
          const orderDate = new Date(order.createdAt || order.CreatedAt);
          return orderDate >= today;
        });

        const pendingOrders = orders.filter(order => {
          const status = order.orderStatus || order.OrderStatus;
          return status === "Pending" || status === "Preparing";
        });

        setStats({
          todayOrders: todayOrders.length,
          pendingOrders: pendingOrders.length,
          totalMeals: mealsRes.data?.length || 0,
          totalTables: tablesRes.data?.length || 0,
          loading: false,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats({ ...stats, loading: false });
      }
    };

    fetchStats();
    if (activeTab === 1) {
      fetchAnalytics();
    }
    
    // Setup SignalR for real-time updates when viewing orders
    if (selectedCard === 'pendingOrders' || selectedCard === 'todayOrders') {
      const setupSignalR = async () => {
        const userId = user?.userId || user?.UserId;
        const userRole = user?.role || user?.userType || user?.UserType;
        
        if (userId && userRole === "RestaurantAdmin" && restaurantId) {
          try {
            await signalRService.startConnection(userId, userRole, restaurantId);
            await new Promise((resolve) => setTimeout(resolve, 500));
            
            const newOrderHandler = (data) => {
              setSnackbar({
                open: true,
                message: `New order #${data.orderId} from Table ${data.tableNumber}!`,
                severity: "info",
              });
              if (selectedCard === 'pendingOrders' || selectedCard === 'todayOrders') {
                fetchOrdersData();
                // Auto-scroll to orders section when new order arrives
                setTimeout(() => {
                  const targetId = `${selectedCard}-section`;
                  const targetElement = document.getElementById(targetId);
                  if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 300);
              }
            };
            
            const statusUpdateHandler = (data) => {
              if (selectedCard === 'pendingOrders' || selectedCard === 'todayOrders') {
                fetchOrdersData();
                // Auto-scroll to orders section when order status is updated
                setTimeout(() => {
                  const targetId = `${selectedCard}-section`;
                  const targetElement = document.getElementById(targetId);
                  if (targetElement) {
                    targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }, 300);
              }
            };
            
            signalRService.on("NewOrder", newOrderHandler);
            signalRService.on("OrderStatusUpdated", statusUpdateHandler);
            
            return { newOrderHandler, statusUpdateHandler };
          } catch (error) {
            console.error("Failed to setup SignalR:", error);
          }
        }
        return null;
      };
      
      let handlers = null;
      setupSignalR().then((h) => {
        handlers = h;
      });
      
      return () => {
        if (handlers) {
          signalRService.off("NewOrder", handlers.newOrderHandler);
          signalRService.off("OrderStatusUpdated", handlers.statusUpdateHandler);
        }
      };
    }
  }, [restaurantId, analyticsDays, selectedCard, user, activeTab]);

  const fetchAnalytics = async () => {
    if (!restaurantId) return;

    try {
      setAnalyticsLoading(true);
      const response = dateRangeMode === "custom"
        ? await getAnalytics(null, selectedDate, selectedDate)
        : await getAnalytics(analyticsDays);
      setAnalytics(response.data);
    } catch (err) {
      console.error("Error fetching analytics:", err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchDailyRevenue = async () => {
    if (!restaurantId) return;

    try {
      setDailyRevenueLoading(true);
      const response = dateRangeMode === "custom" 
        ? await getDailyRevenue(null, selectedDate, selectedDate)
        : await getDailyRevenue(analyticsDays);
      setDailyRevenue(response.data);
    } catch (err) {
      console.error("Error fetching daily revenue:", err);
    } finally {
      setDailyRevenueLoading(false);
    }
  };

  const fetchDailyFoodSales = async () => {
    if (!restaurantId) return;

    try {
      setDailyFoodSalesLoading(true);
      const response = dateRangeMode === "custom"
        ? await getDailyFoodSales(null, selectedDate, selectedDate)
        : await getDailyFoodSales(analyticsDays);
      setDailyFoodSales(response.data);
    } catch (err) {
      console.error("Error fetching daily food sales:", err);
    } finally {
      setDailyFoodSalesLoading(false);
    }
  };

  const fetchOrdersData = async (cardType = selectedCard) => {
    if (!restaurantId) return;
    
    try {
      setOrdersLoading(true);
      const response = await getOrders(null);
      const ordersData = response.data || [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let filteredOrders = ordersData.map((order) => {
        const status = order.orderStatus || order.OrderStatus || "Pending";
        let statusOrder = 0;
        if (status === "Pending") statusOrder = 1;
        else if (status === "Paid") statusOrder = 1.5; // Paid orders should appear right after Pending (paid but not yet prepared)
        else if (status === "Preparing") statusOrder = 2;
        else if (status === "Ready") statusOrder = 3;
        else if (status === "Served") statusOrder = 4;
        else if (status === "Completed") statusOrder = 5;
        else if (status === "Cancelled") statusOrder = 6;

        return {
          orderId: order.orderId || order.OrderId,
          tableId: order.tableId || order.TableId,
          tableNumber: order.tableNumber || order.TableNumber || `Table ${order.tableId || order.TableId}`,
          orderStatus: status,
          totalAmount: order.totalAmount || order.TotalAmount || 0,
          createdAt: order.createdAt || order.CreatedAt,
          statusOrder,
          orderItems: (order.orderItems || order.OrderItems || []).map((item) => ({
            orderItemId: item.orderItemId || item.OrderItemId,
            mealId: item.mealId || item.MealId,
            quantity: item.quantity || item.Quantity,
            price: item.price || item.Price,
            totalPrice: item.totalPrice || item.TotalPrice,
            meal: item.meal || item.Meal
              ? {
                  name: item.meal?.name || item.Meal?.Name || item.meal?.Name || item.Meal?.name || "Unknown",
                  mealId: item.meal?.mealId || item.Meal?.MealId || item.meal?.MealId || item.Meal?.mealId,
                }
              : null,
          })),
        };
      });

      // Filter based on cardType
      if (cardType === 'todayOrders') {
        filteredOrders = filteredOrders.filter(order => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= today;
        });
      } else if (cardType === 'pendingOrders') {
        if (statusFilter === "active") {
          // Include orders in active workflow: Pending, Preparing, Ready, Served, and Paid (for edge cases)
          // Orders with online payment should remain in Pending/Preparing/Ready status and continue workflow
          filteredOrders = filteredOrders.filter(
            (o) => o.orderStatus === "Pending" || 
                   o.orderStatus === "Preparing" || 
                   o.orderStatus === "Ready" || 
                   o.orderStatus === "Served" ||
                   o.orderStatus === "Paid" // Include Paid for edge cases (can transition back to workflow)
          );
        } else if (statusFilter === "ready") {
          filteredOrders = filteredOrders.filter((o) => o.orderStatus === "Ready");
        } else if (statusFilter !== "all") {
          filteredOrders = filteredOrders.filter((o) => o.orderStatus === statusFilter);
        }
      }

      filteredOrders.sort(
        (a, b) => a.statusOrder - b.statusOrder || new Date(b.createdAt) - new Date(a.createdAt)
      );
      
      // Auto-scroll if new orders were added
      const hasNewOrders = filteredOrders.length > previousOrdersLengthRef.current;
      previousOrdersLengthRef.current = filteredOrders.length;
      
      setOrders(filteredOrders);
      
      // Auto-scroll to orders section when new orders arrive
      if (hasNewOrders && !ordersLoading && (selectedCard === 'pendingOrders' || selectedCard === 'todayOrders')) {
        setTimeout(() => {
          const targetId = `${selectedCard}-section`;
          const targetElement = document.getElementById(targetId);
          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 100);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
      setSnackbar({
        open: true,
        message: "Failed to load orders: " + (err.response?.data || err.message),
        severity: "error",
      });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchMealsData = async () => {
    if (!restaurantId) return;
    
    try {
      setMealsLoading(true);
      const response = await getMeals(restaurantId);
      const mealsData = response.data || [];
      
      const normalizedMeals = mealsData.map(meal => ({
        mealId: meal.mealId || meal.MealId,
        name: meal.name || meal.Name,
        description: meal.description || meal.Description || "",
        price: meal.price || meal.Price,
        category: meal.category || meal.Category || "",
        imageUrl: meal.imageUrl || meal.ImageUrl || "",
        isAvailable: meal.isAvailable !== undefined ? meal.isAvailable : meal.IsAvailable,
        isBestItem: meal.isBestItem !== undefined ? meal.isBestItem : meal.IsBestItem,
      }));
      
      setMeals(normalizedMeals);
    } catch (err) {
      console.error("Error fetching meals:", err);
      setSnackbar({
        open: true,
        message: "Failed to load meals: " + (err.response?.data || err.message),
        severity: "error",
      });
      setMeals([]);
    } finally {
      setMealsLoading(false);
    }
  };

  const fetchTablesData = async () => {
    if (!restaurantId) return;
    
    try {
      setTablesLoading(true);
      const response = await getTables(restaurantId);
      const tablesData = response.data || [];
      
      const normalizedTables = tablesData.map(table => ({
        tableId: table.tableId || table.TableId,
        tableNumber: table.tableNumber || table.TableNumber,
        capacity: table.capacity || table.Capacity,
        status: table.status || table.Status,
      }));
      
      setTables(normalizedTables);
    } catch (err) {
      console.error("Error fetching tables:", err);
      setSnackbar({
        open: true,
        message: "Failed to load tables: " + (err.response?.data || err.message),
        severity: "error",
      });
      setTables([]);
    } finally {
      setTablesLoading(false);
    }
  };

  const handleCardClick = (cardType) => {
    setSelectedCard(cardType);
    setActiveTab(0); // Switch to Overview tab
    
    // Fetch data based on card type
    if (cardType === 'todayOrders' || cardType === 'pendingOrders') {
      fetchOrdersData(cardType);
    } else if (cardType === 'meals') {
      fetchMealsData();
    } else if (cardType === 'tables') {
      fetchTablesData();
    }
    
    // Auto-scroll to the relevant section
    setTimeout(() => {
      const targetId = `${cardType}-section`;
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        // Add highlight effect
        targetElement.style.transition = 'box-shadow 0.3s ease';
        targetElement.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.3)';
        setTimeout(() => {
          targetElement.style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  // Refetch orders when statusFilter changes (for pending orders view)
  useEffect(() => {
    if (selectedCard === 'pendingOrders') {
      fetchOrdersData('pendingOrders');
    }
  }, [statusFilter]);

  // Fetch all analytics data when Analytics tab is active or date range changes
  useEffect(() => {
    if (activeTab === 1 && restaurantId) {
      fetchAnalytics();
      fetchDailyRevenue();
      fetchDailyFoodSales();
    }
  }, [activeTab, restaurantId, analyticsDays, dateRangeMode, selectedDate]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    // Find the current order to check its status
    const currentOrder = orders.find(o => o.orderId === orderId);
    if (currentOrder && currentOrder.orderStatus === newStatus) {
      // Order is already in the requested status - refresh data instead
      setSnackbar({
        open: true,
        message: `Order is already in "${newStatus}" status. Refreshing...`,
        severity: "info",
      });
      fetchOrdersData();
      return;
    }

    let customerLeft = null;
    
    // If status is "Completed", ask if customer has left
    if (newStatus === "Completed") {
      const customerLeftResponse = window.confirm(
        `Mark order as Completed.\n\nHas the customer left the table?\n\n` +
        `Click OK if customer has left (table will be marked as Available)\n` +
        `Click Cancel if customer is still at table (table will remain Occupied)`
      );
      customerLeft = customerLeftResponse; // true if OK, false if Cancel
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
      // Refresh orders data immediately after update
      await fetchOrdersData();
    } catch (err) {
      const errorMessage = err.response?.data || err.message || "Failed to update order status";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
      // Refresh orders data on error to get current status
      fetchOrdersData();
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "warning";
      case "Preparing": return "info";
      case "Ready": return "success";
      case "Served": return "primary";
      case "Paid":
      case "Completed": return "success";
      case "Cancelled": return "error";
      default: return "default";
    }
  };

  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case "Pending": return "Preparing";
      case "Preparing": return "Ready";
      case "Ready": return "Served";
      case "Served": return "Completed";
      case "Paid": return "Preparing"; // Paid orders can transition back to workflow (for edge cases)
      default: return null;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "Pending": return <AccessTime />;
      case "Paid": return <Payment />; // Show payment icon for paid orders
      case "Preparing": return <RestaurantMenu />;
      case "Ready": return <CheckCircle />;
      case "Served": return <LocalDining />;
      default: return null;
    }
  };

  if (!restaurantId) {
    return (
      <Layout title="Restaurant Admin Dashboard">
        <Alert severity="warning" sx={{ mb: 3 }}>
          No restaurant associated with your account. Please contact admin.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Restaurant Admin Dashboard" navLinks={navLinks}>
      <Box>
        <Box sx={{
          mb: 4,
          animation: 'fadeIn 0.6s ease-in',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          <Typography
            variant="h4"
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              color: mode === 'dark' ? 'white' : '#1a1a1a',
              fontWeight: 300,
              letterSpacing: '0.05em',
              fontFamily: "'Playfair Display', 'Georgia', serif",
            }}
          >
            Welcome, {user?.fullName || user?.FullName || user?.email?.split("@")[0] || "Restaurant Admin"},Restaurant Admin!
          </Typography>

          <Typography variant="body1" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
            Use the navigation menu to manage tables, meals, and orders.
          </Typography>
        </Box>

        {/* Tabs for Overview and Analytics */}
        <Paper 
          sx={{ 
            mb: 3,
            borderRadius: "16px",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
          }}
        >
          <Tabs 
            value={activeTab} 
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                textTransform: "none",
                fontWeight: 600,
                borderRadius: "12px 12px 0 0",
                transition: "all 0.3s",
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                "&.Mui-selected": {
                  color: mode === 'dark' ? "#FF6B35" : "#FF6B35",
                },
                "&:hover": {
                  backgroundColor: "action.hover",
                },
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#FF6B35",
              },
            }}
          >
            <Tab label="Overview" />
            <Tab label="Analytics" />
          </Tabs>
        </Paper>

        {activeTab === 0 && stats.loading ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center",
            py: 8,
            gap: 2,
          }}>
            <CircularProgress 
              size={60} 
              thickness={4}
              sx={{
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
              Loading dashboard...
            </Typography>
          </Box>
        ) : (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('todayOrders')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(255, 107, 53, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: "0 12px 32px rgba(255, 107, 53, 0.4)",
                      "&::before": {
                        left: "100%",
                      },
                    },
                    "&:active": {
                      transform: "translateY(-4px) scale(1.01)",
                    },
                  }}
                >
                  <CardContent>
                    <Receipt sx={{ fontSize: 40, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                      {stats.todayOrders}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      Today's Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('pendingOrders')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(78, 205, 196, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: "0 12px 32px rgba(78, 205, 196, 0.4)",
                      "&::before": {
                        left: "100%",
                      },
                    },
                    "&:active": {
                      transform: "translateY(-4px) scale(1.01)",
                    },
                  }}
                >
                  <CardContent>
                    <Receipt sx={{ fontSize: 40, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                      {stats.pendingOrders}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      Pending Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('meals')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: "0 12px 32px rgba(102, 126, 234, 0.4)",
                      "&::before": {
                        left: "100%",
                      },
                    },
                    "&:active": {
                      transform: "translateY(-4px) scale(1.01)",
                    },
                  }}
                >
                  <CardContent>
                    <RestaurantMenu sx={{ fontSize: 40, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                      {stats.totalMeals}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      Total Meals
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('tables')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "16px",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 12px rgba(240, 147, 251, 0.3)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: "0 12px 32px rgba(240, 147, 251, 0.4)",
                      "&::before": {
                        left: "100%",
                      },
                    },
                    "&:active": {
                      transform: "translateY(-4px) scale(1.01)",
                    },
                  }}
                >
                  <CardContent>
                    <TableRestaurant sx={{ fontSize: 40, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }} />
                    <Typography variant="h4" sx={{ fontWeight: 700, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                      {stats.totalTables}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      Total Tables
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Content Panel based on selected card */}
            {selectedCard && (
              <Box sx={{ mt: 4 }}>
                <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                  <Button
                    startIcon={<ArrowBack />}
                    onClick={() => setSelectedCard(null)}
                    sx={{ mr: 2 }}
                  >
                    Back to Overview
                  </Button>
                  <Typography variant="h5" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                    {selectedCard === 'todayOrders' && "Today's Orders"}
                    {selectedCard === 'pendingOrders' && "Kitchen Dashboard"}
                    {selectedCard === 'meals' && "Meals"}
                    {selectedCard === 'tables' && "Tables"}
                  </Typography>
                </Box>

                {/* Today's Orders Content */}
                {selectedCard === 'todayOrders' && (
                  <Box id="todayOrders-section" sx={{ scrollMarginTop: "80px" }}>
                    {ordersLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress />
                      </Box>
                    ) : orders.length === 0 ? (
                      <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                        <CardContent sx={{ textAlign: "center", py: 8 }}>
                          <Receipt sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
                          <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                            No orders today
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {orders.map((order) => (
                          <Grid item xs={12} md={6} key={order.orderId}>
                            <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                              <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                                  <Box>
                                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                      Order #{order.orderId}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                      Table {order.tableNumber}
                                    </Typography>
                                    <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                      ₹{order.totalAmount.toFixed(2)}
                                    </Typography>
                                  </Box>
                                  <Chip
                                    label={order.orderStatus}
                                    color={getStatusColor(order.orderStatus)}
                                    sx={{ fontWeight: 600 }}
                                  />
                                </Box>
                                <Accordion>
                                  <AccordionSummary expandIcon={<ExpandMore />}>
                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                      Order Items ({order.orderItems.length})
                                    </Typography>
                                  </AccordionSummary>
                                  <AccordionDetails>
                                    <TableContainer>
                                      <Table size="small">
                                        <TableHead>
                                          <TableRow>
                                            <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Item</TableCell>
                                            <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Qty</TableCell>
                                            <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Price</TableCell>
                                          </TableRow>
                                        </TableHead>
                                        <TableBody>
                                          {order.orderItems.map((item) => (
                                            <TableRow key={item.orderItemId}>
                                              <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>{item.meal?.name || "Unknown Item"}</TableCell>
                                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>{item.quantity}</TableCell>
                                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>₹{(item.totalPrice || item.price * item.quantity).toFixed(2)}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </TableContainer>
                                  </AccordionDetails>
                                </Accordion>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                )}

                {/* Kitchen Dashboard (Pending Orders) Content */}
                {selectedCard === 'pendingOrders' && (
                  <Box id="pendingOrders-section" sx={{ scrollMarginTop: "80px" }}>
                    {/* Filter Buttons */}
                    <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                      <Button
                        variant={statusFilter === "active" ? "contained" : "outlined"}
                        onClick={() => setStatusFilter("active")}
                      >
                        Active Orders
                      </Button>
                      <Button
                        variant={statusFilter === "ready" ? "contained" : "outlined"}
                        onClick={() => setStatusFilter("ready")}
                      >
                        Ready
                      </Button>
                      <Button
                        variant={statusFilter === "all" ? "contained" : "outlined"}
                        onClick={() => setStatusFilter("all")}
                      >
                        All Orders
                      </Button>
                    </Stack>

                    {ordersLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress />
                      </Box>
                    ) : orders.length === 0 ? (
                      <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                        <CardContent sx={{ textAlign: "center", py: 8 }}>
                          <RestaurantMenu sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
                          <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                            No orders found
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {orders.map((order) => {
                          const nextStatus = getNextStatus(order.orderStatus);
                          return (
                            <Grid item xs={12} md={6} key={order.orderId}>
                              <Card
                                sx={{
                                  bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                                  borderLeft: 4,
                                  borderColor:
                                    order.orderStatus === "Pending"
                                      ? "warning.main"
                                      : order.orderStatus === "Paid"
                                      ? "success.main" // Paid orders - green border to indicate payment received
                                      : order.orderStatus === "Preparing"
                                      ? "info.main"
                                      : order.orderStatus === "Ready"
                                      ? "success.main"
                                      : order.orderStatus === "Served"
                                      ? "primary.main"
                                      : "success.main",
                                }}
                              >
                                <CardContent>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                                    <Box>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                                        <Typography variant="h6" sx={{ fontWeight: 700, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                          Order #{order.orderId}
                                        </Typography>
                                        {order.orderStatus === "Paid" && (
                                          <Chip
                                            label="Paid"
                                            size="small"
                                            color="success"
                                            icon={<Payment />}
                                            sx={{ height: 20, fontSize: "0.7rem", fontWeight: 600 }}
                                          />
                                        )}
                                      </Box>
                                      <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                        Table {order.tableNumber}
                                      </Typography>
                                      <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                        ₹{order.totalAmount.toFixed(2)}
                                      </Typography>
                                    </Box>
                                    <Chip
                                      label={order.orderStatus}
                                      color={getStatusColor(order.orderStatus)}
                                      icon={getStatusIcon(order.orderStatus)}
                                      sx={{ fontWeight: 600 }}
                                    />
                                  </Box>

                                  <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMore />}>
                                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                        Order Items ({order.orderItems.length})
                                      </Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                      <TableContainer>
                                        <Table size="small">
                                          <TableHead>
                                            <TableRow>
                                              <TableCell>Item</TableCell>
                                              <TableCell align="right">Qty</TableCell>
                                              <TableCell align="right">Price</TableCell>
                                            </TableRow>
                                          </TableHead>
                                          <TableBody>
                                            {order.orderItems.map((item) => (
                                              <TableRow key={item.orderItemId}>
                                                <TableCell>{item.meal?.name || "Unknown Item"}</TableCell>
                                                <TableCell align="right">{item.quantity}</TableCell>
                                                <TableCell align="right">₹{(item.totalPrice || item.price * item.quantity).toFixed(2)}</TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </TableContainer>
                                    </AccordionDetails>
                                  </Accordion>

                                  {nextStatus && nextStatus !== order.orderStatus ? (
                                    <Button
                                      variant="contained"
                                      fullWidth
                                      sx={{ mt: 2 }}
                                      onClick={() => handleStatusUpdate(order.orderId, nextStatus)}
                                    >
                                      Mark as {nextStatus}
                                    </Button>
                                  ) : nextStatus && nextStatus === order.orderStatus ? (
                                    <Button
                                      variant="outlined"
                                      fullWidth
                                      disabled
                                      sx={{ mt: 2 }}
                                    >
                                      Already {order.orderStatus}
                                    </Button>
                                  ) : null}
                                </CardContent>
                              </Card>
                            </Grid>
                          );
                        })}
                      </Grid>
                    )}
                  </Box>
                )}

                {/* Meals Content */}
                {selectedCard === 'meals' && (
                  <Box id="meals-section" sx={{ scrollMarginTop: "80px" }}>
                    {mealsLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress />
                      </Box>
                    ) : meals.length === 0 ? (
                      <Card>
                        <CardContent sx={{ textAlign: "center", py: 8 }}>
                          <RestaurantMenu sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
                          <Typography variant="h6" color="text.secondary">
                            No meals found
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {meals.map((meal) => (
                          <Grid item xs={12} sm={6} md={4} key={meal.mealId}>
                            <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                              <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 600, flex: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                    {meal.name}
                                  </Typography>
                                  <Chip
                                    label={meal.isAvailable ? "Available" : "Unavailable"}
                                    color={meal.isAvailable ? "success" : "default"}
                                    size="small"
                                  />
                                </Box>
                                {meal.category && (
                                  <Chip label={meal.category} size="small" sx={{ mb: 1 }} variant="outlined" />
                                )}
                                {meal.description && (
                                  <Typography variant="body2" sx={{ mb: 1, color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
                                    {meal.description}
                                  </Typography>
                                )}
                                <Typography variant="h6" color="primary">
                                  ₹{meal.price?.toFixed(2) || "0.00"}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                )}

                {/* Tables Content */}
                {selectedCard === 'tables' && (
                  <Box id="tables-section" sx={{ scrollMarginTop: "80px" }}>
                    {tablesLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                        <CircularProgress />
                      </Box>
                    ) : tables.length === 0 ? (
                      <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                        <CardContent sx={{ textAlign: "center", py: 8 }}>
                          <TableRestaurant sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
                          <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                            No tables found
                          </Typography>
                        </CardContent>
                      </Card>
                    ) : (
                      <Grid container spacing={3}>
                        {tables.map((table) => (
                          <Grid item xs={12} sm={6} md={4} key={table.tableId}>
                            <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                              <CardContent>
                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                  <Typography variant="h6" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                    {table.tableNumber}
                                  </Typography>
                                  <Chip
                                    label={table.status || "Available"}
                                    color={table.status === "Available" ? "success" : table.status === "Occupied" ? "error" : "warning"}
                                    size="small"
                                  />
                                </Box>
                                <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                  Capacity: {table.capacity} seats
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </>
        )}

        {activeTab === 1 && (
          <Box>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                Analytics Dashboard
              </Typography>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <ToggleButtonGroup
                  value={dateRangeMode}
                  exclusive
                  onChange={(e, newMode) => {
                    if (newMode !== null) {
                      setDateRangeMode(newMode);
                    }
                  }}
                  size="small"
                >
                  <ToggleButton value="period">Period</ToggleButton>
                  <ToggleButton value="custom">Custom Date</ToggleButton>
                </ToggleButtonGroup>
                
                {dateRangeMode === "period" ? (
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Period</InputLabel>
                    <Select
                      value={analyticsDays}
                      onChange={(e) => {
                        setAnalyticsDays(e.target.value);
                      }}
                      label="Period"
                    >
                      <MenuItem value={7}>Last 7 days</MenuItem>
                      <MenuItem value={30}>Last 30 days</MenuItem>
                      <MenuItem value={90}>Last 90 days</MenuItem>
                    </Select>
                  </FormControl>
                ) : (
                  <TextField
                    label="Select Date"
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                    sx={{ minWidth: 150 }}
                    inputProps={{ max: new Date().toISOString().split('T')[0] }}
                  />
                )}
              </Box>
            </Box>

            {analyticsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : analytics ? (
              <>
                {/* Revenue Cards */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ 
                      background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)", 
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)", 
                      color: mode === 'dark' ? "white" : "#1a1a1a" 
                    }}>
                      <CardContent>
                        <Typography sx={{ fontSize: 40, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a", fontWeight: 300, lineHeight: 1 }}>
                          ₹
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                          ₹{analytics.revenue?.total?.toFixed(2) || "0.00"}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                          Total Revenue
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)", color: "white" }}>
                      <CardContent>
                        <TrendingUp sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          ₹{(dateRangeMode === "custom" && selectedDate === new Date().toISOString().split('T')[0])
                            ? (analytics.revenue?.today || analytics.revenue?.endDateRevenue || 0).toFixed(2)
                            : (analytics.revenue?.today || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          {dateRangeMode === "custom" && selectedDate !== new Date().toISOString().split('T')[0]
                            ? "Selected Date Revenue"
                            : "Today's Revenue"}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)", color: "white" }}>
                      <CardContent>
                        <ShoppingCart sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          {analytics.orders?.total || 0}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Total Orders
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card sx={{ background: "linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)", color: "white" }}>
                      <CardContent>
                        <Assessment sx={{ fontSize: 40, mb: 1 }} />
                        <Typography variant="h4" sx={{ fontWeight: 700 }}>
                          ₹{analytics.revenue?.averageOrderValue?.toFixed(2) || "0.00"}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9 }}>
                          Avg Order Value
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Popular Items */}
                {analytics.popularItems && analytics.popularItems.length > 0 && (
                  <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                        Popular Items
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Item Name</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Quantity Sold</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Revenue</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Orders</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {analytics.popularItems.map((item, index) => (
                              <TableRow key={item.mealId || index}>
                                <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                    <Chip label={`#${index + 1}`} size="small" color="primary" />
                                    {item.mealName || "Unknown"}
                                  </Box>
                                </TableCell>
                                <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>{item.totalQuantity || 0}</TableCell>
                                <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>₹{(item.totalRevenue || 0).toFixed(2)}</TableCell>
                                <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>{item.orderCount || 0}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                )}

                {/* Payment Methods Breakdown */}
                {analytics.paymentMethods && analytics.paymentMethods.length > 0 && (
                  <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                        Payment Methods
                      </Typography>
                      <Grid container spacing={2}>
                        {analytics.paymentMethods.map((method) => (
                          <Grid item xs={12} sm={6} md={4} key={method.paymentMode}>
                            <Card variant="outlined" sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                              <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                  {method.paymentMode}
                                </Typography>
                                <Typography variant="h6" color="primary">
                                  ₹{(method.totalAmount || 0).toFixed(2)}
                                </Typography>
                                <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                  {method.count || 0} transactions
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Order Status Breakdown */}
                {analytics.statusBreakdown && analytics.statusBreakdown.length > 0 && (
                  <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                        Order Status Breakdown
                      </Typography>
                      <Grid container spacing={2}>
                        {analytics.statusBreakdown.map((status) => (
                          <Grid item xs={12} sm={6} md={4} key={status.status}>
                            <Card variant="outlined" sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                              <CardContent>
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                                  {status.status}
                                </Typography>
                                <Typography variant="h4" color="primary">
                                  {status.count || 0}
                                </Typography>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </CardContent>
                  </Card>
                )}

                {/* Today's Total Sales / End Date Sales - Prominent Display */}
                {dailyRevenue && dailyRevenue.todayTotalSales !== undefined && (
                  <Card sx={{ 
                    mb: 3, 
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)", 
                    color: "white",
                    boxShadow: "0 8px 24px rgba(16, 185, 129, 0.3)"
                  }}>
                    <CardContent>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box>
                          <Typography variant="h6" sx={{ mb: 1, opacity: 0.9 }}>
                            {dateRangeMode === "custom" && selectedDate !== new Date().toISOString().split('T')[0]
                              ? "Selected Date Total Sales"
                              : "Today's Total Sales"}
                          </Typography>
                          <Typography variant="h3" sx={{ fontWeight: 700 }}>
                            ₹{dailyRevenue.todayTotalSales.toFixed(2)}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: 60, opacity: 0.3, color: "white", fontWeight: 300, lineHeight: 1 }}>
                          ₹
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Day-by-Day Revenue Table */}
                <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                      Day-by-Day Revenue
                    </Typography>
                    {dailyRevenueLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : dailyRevenue && dailyRevenue.dailyRevenue && dailyRevenue.dailyRevenue.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Date</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Revenue</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Total Orders</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Paid Orders</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dailyRevenue.dailyRevenue.map((day, index) => {
                              const date = new Date(day.date);
                              const dateString = date.toISOString().split('T')[0];
                              const isToday = dateString === new Date().toISOString().split('T')[0];
                              const isSelectedDate = dateRangeMode === "custom" && dateString === selectedDate;
                              const shouldHighlight = isToday || isSelectedDate;
                              return (
                                <TableRow 
                                  key={index}
                                  sx={{
                                    bgcolor: shouldHighlight ? (mode === 'dark' ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)") : "transparent",
                                    "&:hover": {
                                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"
                                    }
                                  }}
                                >
                                  <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    {isToday && <Chip label="Today" size="small" color="success" sx={{ ml: 1 }} />}
                                    {isSelectedDate && !isToday && <Chip label="Selected" size="small" color="primary" sx={{ ml: 1 }} />}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>
                                    ₹{day.revenue.toFixed(2)}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                    {day.orders}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                    {day.paidOrders}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No revenue data available for the selected period</Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Day-by-Day Food Item Sales */}
                <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                      Day-by-Day Food Item Sales
                    </Typography>
                    {dailyFoodSalesLoading ? (
                      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                        <CircularProgress />
                      </Box>
                    ) : dailyFoodSales && dailyFoodSales.dailyFoodSales && dailyFoodSales.dailyFoodSales.length > 0 ? (
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Date</TableCell>
                              <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Food Item</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Quantity Sold</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Revenue</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dailyFoodSales.dailyFoodSales.map((item, index) => {
                              const date = new Date(item.date);
                              const dateString = date.toISOString().split('T')[0];
                              const isToday = dateString === new Date().toISOString().split('T')[0];
                              const isSelectedDate = dateRangeMode === "custom" && dateString === selectedDate;
                              const shouldHighlight = isToday || isSelectedDate;
                              return (
                                <TableRow 
                                  key={index}
                                  sx={{
                                    bgcolor: shouldHighlight ? (mode === 'dark' ? "rgba(16, 185, 129, 0.2)" : "rgba(16, 185, 129, 0.1)") : "transparent",
                                    "&:hover": {
                                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"
                                    }
                                  }}
                                >
                                  <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                    {date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                    {isToday && <Chip label="Today" size="small" color="success" sx={{ ml: 1 }} />}
                                    {isSelectedDate && !isToday && <Chip label="Selected" size="small" color="primary" sx={{ ml: 1 }} />}
                                  </TableCell>
                                  <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                    {item.mealName}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>
                                    ₹{item.revenue.toFixed(2)}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    ) : (
                      <Alert severity="info">No food sales data available for the selected period</Alert>
                    )}
                  </CardContent>
                </Card>

                {/* Today's Food Sales Summary / End Date Food Sales Summary */}
                {dailyFoodSales && dailyFoodSales.todayFoodSales && dailyFoodSales.todayFoodSales.length > 0 && (
                  <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
                    <CardContent>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                        {dateRangeMode === "custom" && selectedDate !== new Date().toISOString().split('T')[0]
                          ? "Selected Date Food Sales Summary"
                          : "Today's Food Sales Summary"}
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Food Item</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Quantity Sold</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Revenue</TableCell>
                              <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>Orders</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dailyFoodSales.todayFoodSales.map((item, index) => (
                              <TableRow 
                                key={index}
                                sx={{
                                  "&:hover": {
                                    bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)"
                                  }
                                }}
                              >
                                <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                  {item.mealName}
                                </TableCell>
                                <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                  {item.quantity}
                                </TableCell>
                                <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)", fontWeight: 600 }}>
                                  ₹{item.revenue.toFixed(2)}
                                </TableCell>
                                <TableCell align="right" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                                  {item.orderCount}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                      {dailyFoodSales.todayTotalSales !== undefined && (
                        <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}` }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a", textAlign: "right" }}>
                            {dateRangeMode === "custom" && selectedDate !== new Date().toISOString().split('T')[0]
                              ? `Selected Date Total: ₹${dailyFoodSales.todayTotalSales.toFixed(2)}`
                              : `Today's Total: ₹${dailyFoodSales.todayTotalSales.toFixed(2)}`}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Alert severity="info">No analytics data available</Alert>
            )}
          </Box>
        )}
      </Box>

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

export default RestaurantDashboard;
