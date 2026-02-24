import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {  Box,  Card,  CardContent,  Typography,  Grid,  CircularProgress,  Alert,  Button,  Chip,  Container,  AppBar,  Toolbar,  Drawer,  List,  ListItem,  IconButton,  Divider,  Badge,  TextField,  InputAdornment,  FormControl,  InputLabel,  Select,  MenuItem,  Slider,  Collapse,  Paper,} from "@mui/material";
import { RestaurantMenu, ShoppingCart, ArrowBack, Add, Remove, Delete, Close, Search, Clear, FilterList, ExpandMore, ExpandLess } from "@mui/icons-material";
import api from "../api/axiosConfig";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { createOrder, payOrder, cancelOrder, getOrder } from "../services/OrderService";
import ThemeToggle from "../shared/components/ThemeToggle";
import PaymentDialog from "./components/PaymentDialog";
import ContinueOrderDialog from "./components/ContinueOrderDialog";
import { CheckCircle, Payment } from "@mui/icons-material";

const TableMenu = () => {
  const { tableId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [table, setTable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("default");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Update price range when meals are loaded
  useEffect(() => {
    if (meals.length > 0) {
      const maxPrice = Math.max(...meals.map(m => m.price || m.Price || 0), 10000);
      setPriceRange([0, maxPrice]);
    }
  }, [meals]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, order: null });
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [continueOrderDialog, setContinueOrderDialog] = useState({ 
    open: false, 
    orderId: null, 
    totalAmount: null 
  });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  // Filter and sort meals
  useEffect(() => {
    let filtered = [...meals];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          (m.name || "").toLowerCase().includes(term) ||
          (m.description || "").toLowerCase().includes(term) ||
          (m.category || "").toLowerCase().includes(term)
      );
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((m) => (m.category || "").toLowerCase() === categoryFilter.toLowerCase());
    }

    // Filter by price range
    filtered = filtered.filter((m) => {
      const price = m.price || m.Price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort meals
    if (sortBy !== "default") {
      filtered.sort((a, b) => {
        const priceA = a.price || a.Price || 0;
        const priceB = b.price || b.Price || 0;
        const nameA = (a.name || a.Name || "").toLowerCase();
        const nameB = (b.name || b.Name || "").toLowerCase();
        const isBestA = a.isBestItem || a.IsBestItem || false;
        const isBestB = b.isBestItem || b.IsBestItem || false;

        switch (sortBy) {
          case "price-low":
            return priceA - priceB;
          case "price-high":
            return priceB - priceA;
          case "name-asc":
            return nameA.localeCompare(nameB);
          case "name-desc":
            return nameB.localeCompare(nameA);
          case "popularity":
            if (isBestA && !isBestB) return -1;
            if (!isBestA && isBestB) return 1;
            return priceB - priceA; // Secondary sort by price
          default:
            return 0;
        }
      });
    }

    setFilteredMeals(filtered);
  }, [meals, searchTerm, categoryFilter, priceRange, sortBy]);

  // Load cart from localStorage on mount and when user logs in
  useEffect(() => {
    const savedCart = localStorage.getItem(`guestCart_${tableId}`);
    if (savedCart) {
      try {
        const cartData = JSON.parse(savedCart);
        setCart(cartData);
        // If user just logged in and has items in cart, show cart
        if (user && cartData.length > 0) {
          setShowCart(true);
          showSnackbar("Your cart has been restored. You can now place your order.", "success");
        }
      } catch (e) {
        console.error("Error loading cart:", e);
      }
    }

    // Check for pending order
    const pendingOrderKey = `pendingOrder_${tableId}`;
    const savedPendingOrder = localStorage.getItem(pendingOrderKey);
    if (savedPendingOrder) {
      try {
        const pendingOrderData = JSON.parse(savedPendingOrder);
        setPendingOrder(pendingOrderData);
      } catch (e) {
        console.error("Error loading pending order:", e);
      }
    }
  }, [tableId, user]);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      localStorage.setItem(`guestCart_${tableId}`, JSON.stringify(cart));
    } else {
      localStorage.removeItem(`guestCart_${tableId}`);
    }
  }, [cart, tableId]);

  useEffect(() => {
    // Validate tableId
    if (!tableId) {
      setError("Table ID is required");
      setLoading(false);
      return;
    }

    // Validate tableId is numeric
    const tableIdNum = parseInt(tableId, 10);
    if (isNaN(tableIdNum) || tableIdNum <= 0) {
      setError("Invalid table ID. Please scan the QR code again.");
      setLoading(false);
      return;
    }

    fetchTableMenu();
  }, [tableId]);

  const fetchTableMenu = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch menu for the table
      const menuResponse = await api.get(`/customer/tables/${tableId}/menu`);
      const mealsData = menuResponse.data || [];
      
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
      setFilteredMeals(normalizedMeals);

      // Fetch table info
      try {
        const tableResponse = await api.get(`/customer/tables/${tableId}`);
        const tableData = tableResponse.data;
        if (tableData) {
          setTable({
            tableId: tableData.tableId || tableData.TableId,
            tableNumber: tableData.tableNumber || tableData.TableNumber,
            restaurantId: tableData.restaurantId || tableData.RestaurantId,
            restaurantName: tableData.restaurantName || tableData.RestaurantName || "Restaurant",
          });
        }
      } catch (err) {
        // Table info is optional, continue without it
        console.log("Could not fetch table info:", err);
      }
    } catch (err) {
      console.error("Error fetching menu:", err);
      setError(err.response?.data || err.message || "Failed to load menu");
      setMeals([]);
    } finally {
      setLoading(false);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    const baseUrl = api.defaults.baseURL.replace("/api", "");
    const imagePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${imagePath}`;
  };

  const handleAddToCart = (meal) => {
    if (!meal.isAvailable) {
      showSnackbar("This meal is currently unavailable", "warning");
      return;
    }

    const existingItem = cart.find(item => item.mealId === meal.mealId);
    if (existingItem) {
      setCart(cart.map(item =>
        item.mealId === meal.mealId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...meal, quantity: 1 }]);
    }
    setShowCart(true);
    showSnackbar(`${meal.name} added to cart`, "success");
  };

  const handleUpdateQuantity = (mealId, newQuantity) => {
    if (newQuantity <= 0) {
      setCart(cart.filter(item => item.mealId !== mealId));
    } else {
      setCart(cart.map(item =>
        item.mealId === mealId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const handleRemoveFromCart = (mealId) => {
    setCart(cart.filter(item => item.mealId !== mealId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (!table) {
      showSnackbar("Table information not available", "error");
      return;
    }

    if (cart.length === 0) {
      showSnackbar("Your cart is empty. Please add items to cart.", "warning");
      return;
    }

    // Check if user is logged in - REQUIRED for placing orders
    if (!user) {
      // Store return URL and cart data
      localStorage.setItem("returnUrl", `/table-menu/${tableId}`);
      localStorage.setItem(`guestCart_${tableId}`, JSON.stringify(cart));
      showSnackbar("Please login to place your order", "info");
      navigate("/customer-login");
      return;
    }

    // Check if user is a customer
    const userRole = user.role || user.userType;
    if (userRole !== "Customer") {
      showSnackbar("Only customers can place orders. Please login as a customer.", "error");
      return;
    }

    try {
      // Create order or add to existing order
      const response = await createOrder(table.tableId, cart);
      const orderId = response.data.orderId || response.data.OrderId;
      const totalAmount = response.data.totalAmount || calculateTotal();
      const isExistingOrder = response.data.isExistingOrder || false;
      
      if (isExistingOrder) {
        // Items were added to existing order - update pending order info
        const updatedPendingOrder = {
          orderId: orderId,
          restaurantId: table.restaurantId || table.RestaurantId,
          tableId: table.tableId || table.TableId,
          restaurantName: table.restaurantName || "Restaurant",
          tableNumber: table.tableNumber || "N/A",
          totalAmount: totalAmount,
        };
        localStorage.setItem(`pendingOrder_${tableId}`, JSON.stringify(updatedPendingOrder));
        setPendingOrder(updatedPendingOrder);
        
        // Clear cart
        setCart([]);
        localStorage.removeItem(`guestCart_${tableId}`);
        setShowCart(false);
        
        showSnackbar(`Items added to order #${orderId}! Total: ₹${totalAmount.toFixed(2)}. Click 'Finish Ordering' when done.`, "success");
      } else {
        // New order created - show dialog to ask if user wants to order more
        setContinueOrderDialog({
          open: true,
          orderId: orderId,
          totalAmount: totalAmount,
          restaurantId: table.restaurantId || table.RestaurantId,
          tableId: table.tableId || table.TableId,
          restaurantName: table.restaurantName || "Restaurant",
          tableNumber: table.tableNumber || "N/A",
        });
      }
    } catch (err) {
      console.error("Error creating order:", err);
      showSnackbar(err.response?.data?.message || err.response?.data || "Failed to create order", "error");
    }
  };

  const handleContinueOrderYes = () => {
    // User wants to order more - clear cart and store pending order
    const { orderId, totalAmount, restaurantId, tableId, restaurantName, tableNumber } = continueOrderDialog;
    
    // Clear cart
    setCart([]);
    localStorage.removeItem(`guestCart_${tableId}`);
    
    // Store pending order info
    const pendingOrderData = {
      orderId: orderId,
      restaurantId: restaurantId,
      tableId: tableId,
      restaurantName: restaurantName,
      tableNumber: tableNumber,
      totalAmount: totalAmount,
    };
    localStorage.setItem(`pendingOrder_${tableId}`, JSON.stringify(pendingOrderData));
    setPendingOrder(pendingOrderData);
    
    // Close dialog
    setContinueOrderDialog({ open: false, orderId: null, totalAmount: null });
    setShowCart(false);
    
    showSnackbar("Order placed! You can continue adding items. Click 'Finish Ordering' when done.", "success");
  };

  const handleContinueOrderNo = () => {
    // User wants to pay now - show payment dialog
    const { orderId, totalAmount, restaurantName, tableNumber } = continueOrderDialog;
    
    // Prepare order object for payment dialog
    const orderForPayment = {
      orderId: orderId,
      restaurantName: restaurantName,
      tableNumber: tableNumber,
      totalAmount: totalAmount,
      cart: cart, // Keep cart reference for display
    };
    
    // Clear cart
    setCart([]);
    localStorage.removeItem(`guestCart_${tableId}`);
    
    // Clear pending order
    localStorage.removeItem(`pendingOrder_${tableId}`);
    setPendingOrder(null);
    
    // Close continue dialog and show payment dialog
    setContinueOrderDialog({ open: false, orderId: null, totalAmount: null });
    setPaymentDialog({ open: true, order: orderForPayment });
  };

  const handleFinishOrdering = async () => {
    if (!pendingOrder) return;
    
    try {
      // Try to fetch latest order details, but if it fails, use pendingOrder data
      let orderTotal = pendingOrder.totalAmount;
      let orderItems = [];
      
      if (pendingOrder.restaurantId) {
        try {
          const orderResponse = await getOrder(pendingOrder.orderId, pendingOrder.restaurantId);
          const orderData = orderResponse.data;
          orderTotal = orderData.totalAmount || orderData.TotalAmount || pendingOrder.totalAmount;
        } catch (fetchErr) {
          console.warn("Could not fetch latest order total, using pending order data:", fetchErr);
          // Continue with pendingOrder data if fetch fails
        }
      }
      
      // Prepare order object for payment dialog
      // We don't need the full item list for payment - just the total amount
      // The payment will fetch the latest total before processing anyway
      const orderForPayment = {
        orderId: pendingOrder.orderId,
        restaurantId: pendingOrder.restaurantId,
        restaurantName: pendingOrder.restaurantName,
        tableNumber: pendingOrder.tableNumber,
        totalAmount: orderTotal,
        cart: orderItems, // Empty array is fine - payment dialog doesn't need item details
      };
      
      // Show payment dialog
      setPaymentDialog({ open: true, order: orderForPayment });
      
      // Clear pending order
      localStorage.removeItem(`pendingOrder_${tableId}`);
      setPendingOrder(null);
    } catch (err) {
      console.error("Error in handleFinishOrdering:", err);
      // Even if there's an error, try to show payment dialog with pendingOrder data
      const orderForPayment = {
        orderId: pendingOrder.orderId,
        restaurantId: pendingOrder.restaurantId,
        restaurantName: pendingOrder.restaurantName,
        tableNumber: pendingOrder.tableNumber,
        totalAmount: pendingOrder.totalAmount,
        cart: [],
      };
      setPaymentDialog({ open: true, order: orderForPayment });
      localStorage.removeItem(`pendingOrder_${tableId}`);
      setPendingOrder(null);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (!paymentDialog.order?.orderId) return;
    
    // Mark payment as successful to prevent cancellation
    setPaymentSuccessful(true);
    
    const paymentMode = paymentData.paymentMode;
    const isCashOrCounter = paymentMode === "Cash" || paymentMode === "Counter";
    const isOnlinePayment = paymentMode === "Online";

    try {
      // For Cash/Counter: Fetch latest order total before payment to ensure accuracy
      if (isCashOrCounter) {
        // Fetch latest order details to get the current total amount
        const restaurantId = paymentDialog.order.restaurantId || table?.restaurantId || table?.RestaurantId;
        let latestOrderTotal = paymentDialog.order.totalAmount;
        
        if (restaurantId) {
          try {
            const orderResponse = await getOrder(paymentDialog.order.orderId, restaurantId);
            latestOrderTotal = orderResponse.data?.totalAmount || orderResponse.data?.TotalAmount || paymentDialog.order.totalAmount;
          } catch (fetchErr) {
            console.warn("Could not fetch latest order total, using provided amount:", fetchErr);
            // Continue with the provided amount if fetch fails
          }
        }
        
        await payOrder(paymentDialog.order.orderId, {
          amount: latestOrderTotal,
          paymentMode: paymentMode === "Cash" ? "Cash" : "Counter",
          transactionId: paymentData.transactionId || null,
        });
        
        showSnackbar(`Order placed successfully! Please pay ₹${latestOrderTotal.toFixed(2)} at the ${paymentMode === "Cash" ? "table" : "counter"}.`, "success");
      } 
      // For Online: Payment is already processed by StripeCheckout/confirmStripePayment
      // No need to call payOrder again - backend already handled it
      else if (isOnlinePayment) {
        showSnackbar(`Order placed and payment successful via ${paymentData.paymentMode}!`, "success");
      }
      
      // Clear cart
      setCart([]);
      setShowCart(false);
      localStorage.removeItem(`guestCart_${tableId}`);
      
      // Clear pending order if exists
      localStorage.removeItem(`pendingOrder_${tableId}`);
      setPendingOrder(null);
      
      setPaymentDialog({ open: false, order: null });
      setPaymentSuccessful(false); // Reset flag
      navigate("/customer-orders");
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentSuccessful(false); // Reset flag on error
      showSnackbar(err.response?.data?.message || err.response?.data || "Failed to process payment", "error");
      throw err; // Re-throw to be handled by PaymentDialog
    }
  };

  const handleClosePaymentDialog = async () => {
    // Don't cancel order if payment was successful
    if (paymentSuccessful) {
      setPaymentDialog({ open: false, order: null });
      setPaymentSuccessful(false);
      return;
    }

    // If order was created and payment was NOT successful, cancel it to avoid orphaned orders
    if (paymentDialog.order?.orderId) {
      try {
        await cancelOrder(paymentDialog.order.orderId);
        showSnackbar("Order cancelled successfully. You can place order again from cart.", "info");
      } catch (err) {
        console.error("Error cancelling order:", err);
        showSnackbar("Order was created but couldn't be cancelled. Please cancel it from 'My Orders'.", "warning");
      }
    } else {
      showSnackbar("Order cancelled. You can place order again from cart.", "info");
    }
    setPaymentDialog({ open: false, order: null });
    setPaymentSuccessful(false);
  };

  const handleOrderNow = () => {
    // If user is logged in and has items in cart, try to place order
    if (user && cart.length > 0) {
      handlePlaceOrder();
    } else if (table?.restaurantId) {
      // Redirect to restaurant view
      navigate(`/customer-restaurant/${table.restaurantId}`);
    } else {
      // Just show cart or redirect to login
      if (cart.length > 0) {
        setShowCart(true);
      } else {
        navigate("/customer-login");
      }
    }
  };

  // Restaurant-themed background image; overlay keeps content readable in light/dark
  const bgImageUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920";
  const overlayLight = "rgba(252, 251, 249, 0.88)";
  const overlayDark = "rgba(12, 12, 12, 0.92)";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundImage: `linear-gradient(${mode === "dark" ? overlayDark : overlayLight}, ${mode === "dark" ? overlayDark : overlayLight}), url("${bgImageUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Pending Order Banner */}
      {pendingOrder && (
        <Paper
          elevation={3}
          sx={{
            bgcolor: "warning.light",
            color: "warning.contrastText",
            p: 2,
            borderRadius: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flex: 1 }}>
            <CheckCircle sx={{ fontSize: 28 }} />
            <Box>
              <Typography variant="subtitle1" fontWeight={600}>
                Order #{pendingOrder.orderId} is pending payment
              </Typography>
              <Typography variant="body2">
                Total: ₹{pendingOrder.totalAmount?.toFixed(2) || "0.00"} • Add more items or finish ordering
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="warning"
            startIcon={<Payment />}
            onClick={handleFinishOrdering}
            sx={{
              borderRadius: "8px",
              textTransform: "none",
              fontWeight: 600,
              px: 3,
              whiteSpace: "nowrap",
            }}
          >
            Finish Ordering
          </Button>
        </Paper>
      )}

      <AppBar position="static" elevation={0}>
        <Toolbar sx={{ px: { xs: 1, sm: 2 } }}>
          <Typography
            variant="h6"
            component="div"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              fontSize: { xs: "0.875rem", sm: "1.25rem" },
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              color: "text.primary",
            }}
          >
            {table ? `Table ${table.tableNumber} - Menu` : "Restaurant Menu"}
          </Typography>
          <ThemeToggle />
          <Badge badgeContent={cart.length} color="error">
            <Button
              color="inherit"
              startIcon={<ShoppingCart />}
              onClick={() => navigate("/cart", { 
                state: { 
                  cart, 
                  restaurantId: table?.restaurantId || table?.RestaurantId, 
                  tableId: tableId 
                } 
              })}
              sx={{ 
                mr: { xs: 1, sm: 2 },
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                px: { xs: 1, sm: 2 }
              }}
            >
              <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                Cart {cart.length > 0 && `(₹${calculateTotal().toFixed(2)})`}
              </Box>
              <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                {cart.length > 0 && `₹${calculateTotal().toFixed(0)}`}
              </Box>
            </Button>
          </Badge>
          <Button
            color="inherit"
            startIcon={<ArrowBack />}
            onClick={() => navigate("/")}
            sx={{ 
              fontSize: { xs: "0.75rem", sm: "0.875rem" },
              px: { xs: 1, sm: 2 },
              display: { xs: "none", sm: "inline-flex" }
            }}
          >
            Home
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 1, sm: 2 } }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        ) : filteredMeals.length === 0 ? (
          <Card>
            <CardContent sx={{ textAlign: "center", py: 8 }}>
              <RestaurantMenu sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
              <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 300 }} gutterBottom>
                No meals available
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", mb: 3, fontWeight: 300 }}>
                {searchTerm || categoryFilter !== "all"
                  ? "No meals match your search criteria"
                  : "This restaurant currently has no items on the menu."}
              </Typography>
              <Button variant="contained" onClick={handleOrderNow}>
                Go to Restaurant
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Box sx={{ mb: 4, textAlign: "center" }}>
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: "text.primary" }}>
                Our Menu
              </Typography>
              <Typography variant="body1" sx={{ color: "text.secondary", mb: 3, fontWeight: 300 }}>
                Scan the QR code at your table to view this menu
              </Typography>
              {table && (
                <Chip
                  label={`Table ${table.tableNumber}`}
                  color="primary"
                  sx={{ mb: 2 }}
                />
              )}
            </Box>

            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
                <TextField
                  placeholder="Search meals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  size="small"
                  sx={{ flexGrow: 1, minWidth: 200 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                    endAdornment: searchTerm && (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setSearchTerm("")}>
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="all">All Categories</MenuItem>
                    {[...new Set(meals.map(m => m.category).filter(Boolean))].map(cat => (
                      <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Sort By</InputLabel>
                  <Select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    label="Sort By"
                  >
                    <MenuItem value="default">Default</MenuItem>
                    <MenuItem value="price-low">Price: Low to High</MenuItem>
                    <MenuItem value="price-high">Price: High to Low</MenuItem>
                    <MenuItem value="name-asc">Name: A to Z</MenuItem>
                    <MenuItem value="name-desc">Name: Z to A</MenuItem>
                    <MenuItem value="popularity">Popularity</MenuItem>
                  </Select>
                </FormControl>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  endIcon={showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  size="small"
                >
                  Advanced Filters
                </Button>
              </Box>

              <Collapse in={showAdvancedFilters}>
                <Paper sx={{ p: 3, mb: 2, bgcolor: "background.paper" }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                    Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                  </Typography>
                  <Slider
                    value={priceRange}
                    onChange={(e, newValue) => setPriceRange(newValue)}
                    valueLabelDisplay="auto"
                    min={0}
                    max={Math.max(10000, ...meals.map(m => m.price || m.Price || 0))}
                    step={50}
                    marks={[
                      { value: 0, label: "₹0" },
                      { value: Math.max(10000, ...meals.map(m => m.price || m.Price || 0)), label: `₹${Math.max(10000, ...meals.map(m => m.price || m.Price || 0))}` }
                    ]}
                    sx={{ mb: 2 }}
                  />
                  <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                    <TextField
                      label="Min Price"
                      type="number"
                      size="small"
                      value={priceRange[0]}
                      onChange={(e) => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])}
                      sx={{ minWidth: 120 }}
                    />
                    <TextField
                      label="Max Price"
                      type="number"
                      size="small"
                      value={priceRange[1]}
                      onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])}
                      sx={{ minWidth: 120 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => {
                        const maxPrice = Math.max(10000, ...meals.map(m => m.price || m.Price || 0));
                        setPriceRange([0, maxPrice]);
                        setCategoryFilter("all");
                        setSearchTerm("");
                        setSortBy("default");
                      }}
                    >
                      Reset Filters
                    </Button>
                  </Box>
                </Paper>
              </Collapse>
            </Box>

            <Grid container spacing={3}>
              {filteredMeals.map((meal) => {
                const mealId = meal.mealId || meal.MealId;
                const name = meal.name || meal.Name;
                const description = meal.description || meal.Description || "";
                const price = meal.price || meal.Price;
                const category = meal.category || meal.Category || "";
                const imageUrl = meal.imageUrl || meal.ImageUrl || "";
                const isAvailable = meal.isAvailable !== undefined ? meal.isAvailable : meal.IsAvailable;
                const isBestItem = meal.isBestItem !== undefined ? meal.isBestItem : meal.IsBestItem;
                const fullImageUrl = imageUrl ? getImageUrl(imageUrl) : null;

                return (
                  <Grid item xs={12} sm={6} md={4} key={mealId || name}>
                    <Card sx={{ height: "100%" }}>
                      {fullImageUrl ? (
                        <Box
                          component="img"
                          src={fullImageUrl}
                          alt={name}
                          sx={{
                            width: "100%",
                            height: 200,
                            objectFit: "cover",
                            display: "block",
                            backgroundColor: "grey.100",
                          }}
                          onError={(e) => {
                            e.target.style.display = "none";
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: "100%",
                            height: 200,
                            backgroundColor: "grey.100",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <RestaurantMenu sx={{ fontSize: 60, color: "grey.400" }} />
                        </Box>
                      )}
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              {name}
                            </Typography>
                            {isBestItem && <Chip label="Popular" color="warning" size="small" />}
                          </Box>
                          <Chip
                            label={isAvailable ? "Available" : "Unavailable"}
                            color={isAvailable ? "success" : "default"}
                            size="small"
                          />
                        </Box>
                        <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
                          ₹{price}
                        </Typography>
                        {category && (
                          <Chip label={category} size="small" sx={{ mb: 1 }} />
                        )}
                        {description && (
                          <Typography variant="body2" sx={{ color: "text.secondary", mb: 2, fontWeight: 300 }}>
                            {description}
                          </Typography>
                        )}
                        <Button
                          variant="contained"
                          fullWidth
                          startIcon={<Add />}
                          onClick={() => handleAddToCart(meal)}
                          disabled={!isAvailable}
                        >
                          {isAvailable ? "Add to Cart" : "Unavailable"}
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}
      </Container>

      {/* Cart Drawer */}
      <Drawer
        anchor="right"
        open={showCart}
        onClose={() => setShowCart(false)}
        PaperProps={{
          sx: { width: { xs: "100%", sm: 400 } }
        }}
      >
        <Box sx={{ p: 3, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Shopping Cart
            </Typography>
            <IconButton onClick={() => setShowCart(false)}>
              <Close />
            </IconButton>
          </Box>

          {cart.length === 0 ? (
            <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box sx={{ textAlign: "center" }}>
                <ShoppingCart sx={{ fontSize: 80, color: "text.disabled", mb: 2 }} />
                <Typography variant="body1" sx={{ color: "text.secondary", fontWeight: 300 }}>
                  Your cart is empty
                </Typography>
              </Box>
            </Box>
          ) : (
            <>
              <List sx={{ flex: 1, overflow: "auto" }}>
                {cart.map((item) => (
                  <ListItem key={item.mealId} sx={{ flexDirection: "column", alignItems: "stretch" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {item.name}
                      </Typography>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleRemoveFromCart(item.mealId)}
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(item.mealId, item.quantity - 1)}
                        >
                          <Remove />
                        </IconButton>
                        <Typography variant="body1">{item.quantity}</Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(item.mealId, item.quantity + 1)}
                        >
                          <Add />
                        </IconButton>
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Typography>
                    </Box>
                    <Divider sx={{ mt: 2 }} />
                  </ListItem>
                ))}
              </List>

              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Total:
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
                    ₹{calculateTotal().toFixed(2)}
                  </Typography>
                </Box>
                {!user && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Please login to place your order
                  </Alert>
                )}
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handlePlaceOrder}
                  sx={{ mb: 2 }}
                >
                  {user ? "Place Order" : "Login to Order"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* Continue Order Dialog */}
      <ContinueOrderDialog
        open={continueOrderDialog.open}
        orderId={continueOrderDialog.orderId}
        totalAmount={continueOrderDialog.totalAmount}
        onYes={handleContinueOrderYes}
        onNo={handleContinueOrderNo}
      />

      {/* Payment Dialog */}
      <PaymentDialog
        open={paymentDialog.open}
        onClose={handleClosePaymentDialog}
        order={paymentDialog.order}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Snackbar for notifications */}
      {snackbar.open && (
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            minWidth: 300,
            zIndex: 9999,
          }}
        >
          {snackbar.message}
        </Alert>
      )}
    </Box>
  );
};

export default TableMenu;

