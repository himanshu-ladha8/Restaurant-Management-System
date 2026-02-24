import { useState, useEffect, useContext } from "react";
import { formatDateTime } from "../utils/dateUtils";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { useNavigate, Link, useParams, useLocation } from "react-router-dom";
import {  Box,  Card,  CardContent,  Typography,  Grid,  Chip,  CircularProgress,  Alert,  Snackbar,  Button,  Tabs,  Tab,  Drawer,  List,  ListItem,  ListItemText,  IconButton,  Divider,  Badge,  Table,  TableBody,  TableCell,  TableContainer,  TableHead,  TableRow,  Paper,  Accordion,  AccordionSummary,  AccordionDetails,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  TextField,  InputAdornment,  FormControl,  InputLabel,  Select,  MenuItem,  Slider,  Collapse,} from "@mui/material";
import {  TableRestaurant,  RestaurantMenu,  ShoppingCart,  Add,  Remove,  Delete,  ExpandMore,  Close,  Star,  QrCode,  Search,  Clear,  FilterList,  ExpandLess,  CalendarToday,} from "@mui/icons-material";
import { getRestaurantTables, getAvailableTables, getRestaurantMeals, leaveTable } from "../services/CustomerService";
import { createOrder, getAllMyOrders, payOrder, cancelOrder, getOrder } from "../services/OrderService";
import Layout from "../shared/components/Layout";
import api from "../api/axiosConfig";
import { QRCodeSVG } from "qrcode.react";
import PaymentDialog from "./components/PaymentDialog";
import ContinueOrderDialog from "./components/ContinueOrderDialog";
import { CheckCircle, Payment } from "@mui/icons-material";

const CustomerRestaurantView = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();
  const { restaurantId } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [tables, setTables] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [meals, setMeals] = useState([]);
  const [tablesLoading, setTablesLoading] = useState(true);
  const [mealsLoading, setMealsLoading] = useState(true);
  
  // Order state
  const [selectedTable, setSelectedTable] = useState(null);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [qrDialog, setQrDialog] = useState({ open: false, table: null, qrUrl: "" });
  const [paymentDialog, setPaymentDialog] = useState({ open: false, order: null });
  const [paymentSuccessful, setPaymentSuccessful] = useState(false);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [continueOrderDialog, setContinueOrderDialog] = useState({ 
    open: false, 
    orderId: null, 
    totalAmount: null 
  });
  
  // Filter and sort state for meals
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("default");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Check if navigated from home screen
  const fromHome = location.state?.fromHome || false;
  const backPath = fromHome ? "/" : "/customer-restaurants";

  // Load cart from localStorage on mount and when table changes
  useEffect(() => {
    if (selectedTable && user) {
      const cartKey = `userCart_${user.userId || user.UserId}_${selectedTable.tableId}`;
      const savedCart = localStorage.getItem(cartKey);
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart);
          if (cartData.length > 0) {
            setCart(cartData);
          }
        } catch (e) {
          console.error("Error loading cart:", e);
        }
      }
    }
  }, [selectedTable, user]);

  // Save cart to localStorage whenever it changes (for logged-in users)
  useEffect(() => {
    if (selectedTable && user && cart.length >= 0) {
      const cartKey = `userCart_${user.userId || user.UserId}_${selectedTable.tableId}`;
      if (cart.length > 0) {
        localStorage.setItem(cartKey, JSON.stringify(cart));
      } else {
        localStorage.removeItem(cartKey);
      }
    }
  }, [cart, selectedTable, user]);

  const navLinks = [
    { path: "/customer-dashboard", label: "Dashboard" },
    { path: "/customer-orders", label: "My Orders" },
  ];

  useEffect(() => {
    // Validate restaurantId
    if (!restaurantId) {
      showSnackbar("Restaurant ID is required", "error");
      navigate("/customer-restaurants");
      return;
    }

    // Validate restaurantId is numeric
    const restaurantIdNum = parseInt(restaurantId, 10);
    if (isNaN(restaurantIdNum) || restaurantIdNum <= 0) {
      showSnackbar("Invalid restaurant ID", "error");
      navigate("/customer-restaurants");
      return;
    }

    if (restaurantId) {
      if (activeTab === 0) {
        fetchTables();
      } else if (activeTab === 1) {
        fetchMeals();
      } else if (activeTab === 2) {
        fetchOrders();
      }
    }
    
    // Restore cart from localStorage if user just logged in
    if (user && selectedTable) {
      const savedCart = localStorage.getItem(`guestCart_${selectedTable.tableId}`);
      if (savedCart) {
        try {
          const cartData = JSON.parse(savedCart);
          if (cartData.length > 0) {
            setCart(cartData);
            setShowCart(true);
            showSnackbar("Your cart has been restored. You can now place your order.", "success");
            localStorage.removeItem(`guestCart_${selectedTable.tableId}`);
          }
        } catch (e) {
          console.error("Error restoring cart:", e);
        }
      }
    }

  }, [restaurantId, activeTab, user, selectedTable]);

  const fetchTables = async () => {
    if (!restaurantId) return;

    try {
      setTablesLoading(true);
      const [allTablesResponse, availableTablesResponse] = await Promise.all([
        getRestaurantTables(restaurantId),
        getAvailableTables(restaurantId)
      ]);

      const allTablesData = allTablesResponse.data || [];
      const availableTablesData = availableTablesResponse.data || [];
      
      const normalizedTables = allTablesData.map(table => ({
        tableId: table.tableId || table.TableId,
        tableNumber: table.tableNumber || table.TableNumber,
        capacity: table.capacity || table.Capacity,
        status: table.status || table.Status,
      }));

      const normalizedAvailable = availableTablesData.map(table => ({
        tableId: table.tableId || table.TableId,
        tableNumber: table.tableNumber || table.TableNumber,
        capacity: table.capacity || table.Capacity,
        status: table.status || table.Status,
      }));
      
      setTables(normalizedTables);
      setAvailableTables(normalizedAvailable);
    } catch (err) {
      console.error("Error fetching tables:", err);
      showSnackbar("Failed to load tables: " + (err.response?.data || err.message), "error");
      setTables([]);
      setAvailableTables([]);
    } finally {
      setTablesLoading(false);
    }
  };

  const fetchMeals = async () => {
    if (!restaurantId) return;

    try {
      setMealsLoading(true);
      const response = await getRestaurantMeals(restaurantId);
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
      
      // Initialize price range
      if (normalizedMeals.length > 0) {
        const maxPrice = Math.max(...normalizedMeals.map(m => m.price || 0), 10000);
        setPriceRange([0, maxPrice]);
      }

      // Handle pending cart item from category page after meals are loaded
      if (user && restaurantId) {
        const pendingCartItem = localStorage.getItem("pendingCartItem");
        if (pendingCartItem) {
          try {
            const itemData = JSON.parse(pendingCartItem);
            // Check if the item belongs to this restaurant
            const itemRestaurantId = itemData.restaurantId || itemData.RestaurantId;
            if (itemRestaurantId && parseInt(itemRestaurantId) === parseInt(restaurantId)) {
              const meal = normalizedMeals.find(m => m.mealId === itemData.mealId || m.MealId === itemData.mealId);
              if (meal && meal.isAvailable) {
                // Fetch available tables if not already loaded and no table selected
                if (!selectedTable) {
                  getAvailableTables(restaurantId).then(response => {
                    const availableTablesData = response.data || [];
                    const normalizedAvailable = availableTablesData.map(table => ({
                      tableId: table.tableId || table.TableId,
                      tableNumber: table.tableNumber || table.TableNumber,
                      capacity: table.capacity || table.Capacity,
                      status: table.status || table.Status,
                    }));
                    if (normalizedAvailable.length > 0) {
                      setSelectedTable(normalizedAvailable[0]);
                      setActiveTab(1);
                    }
                  }).catch(err => {
                    console.error("Error fetching available tables:", err);
                  });
                }
                // Add item to cart
                setTimeout(() => {
                  setCart(prevCart => {
                    const existingItem = prevCart.find(item => item.mealId === meal.mealId);
                    if (existingItem) {
                      return prevCart.map(item =>
                        item.mealId === meal.mealId
                          ? { ...item, quantity: item.quantity + 1 }
                          : item
                      );
                    } else {
                      return [...prevCart, { ...meal, quantity: 1 }];
                    }
                  });
                  setShowCart(true);
                  showSnackbar(`${meal.name} added to cart!`, "success");
                }, 500);
                localStorage.removeItem("pendingCartItem");
              } else if (meal && !meal.isAvailable) {
                showSnackbar(`${meal.name} is currently unavailable`, "warning");
                localStorage.removeItem("pendingCartItem");
              } else {
                showSnackbar("Item not found in this restaurant's menu", "warning");
                localStorage.removeItem("pendingCartItem");
              }
            }
          } catch (e) {
            console.error("Error handling pending cart item:", e);
            localStorage.removeItem("pendingCartItem");
          }
        }
      }
    } catch (err) {
      console.error("Error fetching meals:", err);
      showSnackbar("Failed to load meals: " + (err.response?.data || err.message), "error");
      setMeals([]);
    } finally {
      setMealsLoading(false);
    }
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
      const price = m.price || 0;
      return price >= priceRange[0] && price <= priceRange[1];
    });

    // Sort meals
    if (sortBy !== "default") {
      filtered.sort((a, b) => {
        const priceA = a.price || 0;
        const priceB = b.price || 0;
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        const isBestA = a.isBestItem || false;
        const isBestB = b.isBestItem || false;

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
            return priceB - priceA;
          default:
            return 0;
        }
      });
    }

    setFilteredMeals(filtered);
  }, [meals, searchTerm, categoryFilter, priceRange, sortBy]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const generateQRUrl = (tableId) => {
    const origin = window.location.origin;
    return `${origin}/table-menu/${tableId}`;
  };

  const handleShowQR = (table) => {
    const tableId = table.tableId || table.TableId;
    const qrUrl = generateQRUrl(tableId);
    setQrDialog({ open: true, table, qrUrl });
  };

  const handleCloseQR = () => {
    setQrDialog({ open: false, table: null, qrUrl: "" });
  };

  const handleSelectTable = (table) => {
    setSelectedTable(table);
    setActiveTab(1);
    setCart([]);
    setOrderPlaced(false);
    
    // Check for pending order for this table
    if (table?.tableId) {
      const pendingOrderKey = `pendingOrder_${table.tableId}`;
      const savedPendingOrder = localStorage.getItem(pendingOrderKey);
      if (savedPendingOrder) {
        try {
          const pendingOrderData = JSON.parse(savedPendingOrder);
          setPendingOrder(pendingOrderData);
        } catch (e) {
          console.error("Error loading pending order:", e);
        }
      } else {
        setPendingOrder(null);
      }
    }
    
    showSnackbar(`Table ${table.tableNumber} selected! You can now order meals.`, "success");
  };

  const handleAddToCart = (meal) => {
    if (!selectedTable) {
      showSnackbar("Please select a table first", "warning");
      setActiveTab(0);
      return;
    }

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
    if (!selectedTable) {
      showSnackbar("Please select a table first", "warning");
      return;
    }

    if (cart.length === 0) {
      showSnackbar("Your cart is empty. Please add items to cart.", "warning");
      return;
    }

    if (!user) {
      // Store return URL and cart data
      const returnUrl = `/customer-restaurant/${restaurantId}`;
      localStorage.setItem("returnUrl", returnUrl);
      // Store cart in localStorage for guest users
      if (cart.length > 0) {
        localStorage.setItem(`guestCart_${selectedTable.tableId}`, JSON.stringify(cart));
      }
      showSnackbar("Please login to place an order", "info");
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
      const response = await createOrder(selectedTable.tableId, cart);
      const orderId = response.data.orderId || response.data.OrderId;
      const totalAmount = response.data.totalAmount || calculateTotal();
      const isExistingOrder = response.data.isExistingOrder || false;
      
      if (isExistingOrder) {
        // Items were added to existing order - update pending order info
        const updatedPendingOrder = {
          orderId: orderId,
          restaurantId: selectedTable.restaurantId,
          tableId: selectedTable.tableId,
          restaurantName: selectedTable.restaurantName || "Restaurant",
          tableNumber: selectedTable.tableNumber || "N/A",
          totalAmount: totalAmount,
        };
        localStorage.setItem(`pendingOrder_${selectedTable.tableId}`, JSON.stringify(updatedPendingOrder));
        setPendingOrder(updatedPendingOrder);
        
        // Clear cart
        setCart([]);
        setShowCart(false);
        
        showSnackbar(`Items added to order #${orderId}! Total: ₹${totalAmount.toFixed(2)}. Click 'Finish Ordering' when done.`, "success");
      } else {
        // New order created - show dialog to ask if user wants to order more
        setContinueOrderDialog({
          open: true,
          orderId: orderId,
          totalAmount: totalAmount,
          restaurantId: selectedTable.restaurantId,
          tableId: selectedTable.tableId,
          restaurantName: selectedTable.restaurantName || "Restaurant",
          tableNumber: selectedTable.tableNumber || "N/A",
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
    setShowCart(false);
    
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
    setShowCart(false);
    
    // Clear pending order
    localStorage.removeItem(`pendingOrder_${selectedTable?.tableId}`);
    setPendingOrder(null);
    
    // Close continue dialog and show payment dialog
    setContinueOrderDialog({ open: false, orderId: null, totalAmount: null });
    setPaymentDialog({ open: true, order: orderForPayment });
  };

  const handleFinishOrdering = async () => {
    if (!pendingOrder || !selectedTable) return;
    
    try {
      // Try to fetch latest order details, but if it fails, use pendingOrder data
      let orderTotal = pendingOrder.totalAmount;
      
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
        cart: [], // Empty array is fine - payment dialog doesn't need item details
      };
      
      // Show payment dialog
      setPaymentDialog({ open: true, order: orderForPayment });
      
      // Clear pending order
      localStorage.removeItem(`pendingOrder_${selectedTable.tableId}`);
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
      localStorage.removeItem(`pendingOrder_${selectedTable.tableId}`);
      setPendingOrder(null);
    }
  };

  const handlePaymentSuccess = async (paymentData) => {
    if (!paymentDialog.order?.orderId) return;

    // Mark payment as successful to prevent cancellation
    setPaymentSuccessful(true);

    try {
      const isCashOrCounter = paymentData.paymentMode === "Cash" || paymentData.paymentMode === "Counter";
      const isOnlinePayment = paymentData.paymentMode === "Online";

      // For Cash/Counter: Fetch latest order total before payment to ensure accuracy
      if (isCashOrCounter) {
        // Fetch latest order details to get the current total amount
        const restaurantIdForOrder = paymentDialog.order.restaurantId || restaurantId;
        let latestOrderTotal = paymentDialog.order.totalAmount;
        
        if (restaurantIdForOrder) {
          try {
            const orderResponse = await getOrder(paymentDialog.order.orderId, restaurantIdForOrder);
            latestOrderTotal = orderResponse.data?.totalAmount || orderResponse.data?.TotalAmount || paymentDialog.order.totalAmount;
          } catch (fetchErr) {
            console.warn("Could not fetch latest order total, using provided amount:", fetchErr);
            // Continue with the provided amount if fetch fails
          }
        }
        
        await payOrder(paymentDialog.order.orderId, {
          amount: latestOrderTotal,
          paymentMode: paymentData.paymentMode,
          transactionId: paymentData.transactionId || null,
        });
        
        showSnackbar(`Order placed successfully! Please pay ₹${latestOrderTotal.toFixed(2)} at the ${paymentData.paymentMode === "Cash" ? "table" : "counter"}.`, "success");
        
        // Clear cart
        setCart([]);
        setShowCart(false);
        setOrderPlaced(true);
        
        // Clear pending order if exists
        if (selectedTable) {
          localStorage.removeItem(`pendingOrder_${selectedTable.tableId}`);
        }
        setPendingOrder(null);
        
        setPaymentDialog({ open: false, order: null });
        setPaymentSuccessful(false); // Reset flag
        
        if (restaurantId) {
          fetchTables();
        }
        
        navigate("/customer-orders");
      } 
      // For Online: Payment is already processed by StripeCheckout/confirmStripePayment
      // No need to call payOrder again - backend already handled it
      else if (isOnlinePayment) {
        
        showSnackbar(`Order placed and payment successful via ${paymentData.paymentMode}!`, "success");
        
        // Clear cart
        setCart([]);
        setShowCart(false);
        setOrderPlaced(true);
        
        // Clear pending order if exists
        if (selectedTable) {
          localStorage.removeItem(`pendingOrder_${selectedTable.tableId}`);
        }
        setPendingOrder(null);
        
        setPaymentDialog({ open: false, order: null });
        setPaymentSuccessful(false); // Reset flag
        
        if (restaurantId) {
          fetchTables();
        }
        
        navigate("/customer-orders");
      }
    } catch (err) {
      console.error("Payment error:", err);
      setPaymentSuccessful(false); // Reset flag on error
      
      // Extract error message from response
      let errorMessage = "Failed to process order/payment";
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Check if error is about existing active order
      if (errorMessage.includes("active order") || errorMessage.includes("pending order")) {
        showSnackbar(
          `${errorMessage} Please complete or cancel your existing order first. You can view your orders in the "My Orders" section.`,
          "error"
        );
        // Optionally navigate to orders page
        setTimeout(() => {
          if (window.confirm("Would you like to view your orders?")) {
            navigate("/customer-orders");
          }
        }, 2000);
      } else {
        showSnackbar(errorMessage, "error");
      }
      
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

  const fetchOrders = async () => {
    if (!restaurantId || !user) return;

    try {
      setOrdersLoading(true);
      const response = await getAllMyOrders(parseInt(restaurantId));
      const ordersData = response.data || [];
      
      const normalizedOrders = ordersData.map(order => ({
        orderId: order.orderId || order.OrderId,
        restaurantId: order.restaurantId || order.RestaurantId,
        restaurantName: order.restaurantName || order.RestaurantName || "Unknown Restaurant",
        tableId: order.tableId || order.TableId,
        tableNumber: order.tableNumber || order.TableNumber || "N/A",
        orderStatus: order.orderStatus || order.OrderStatus,
        totalAmount: order.totalAmount || order.TotalAmount,
        createdAt: order.createdAt || order.CreatedAt,
        orderItems: (order.orderItems || order.OrderItems || []).map(item => ({
          orderItemId: item.orderItemId || item.OrderItemId,
          mealId: item.mealId || item.MealId,
          mealName: item.mealName || item.MealName || "Unknown Meal",
          quantity: item.quantity || item.Quantity,
          price: item.price || item.Price,
          totalPrice: item.totalPrice || item.TotalPrice,
        }))
      }));
      
      setOrders(normalizedOrders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      showSnackbar("Failed to load orders: " + (err.response?.data || err.message), "error");
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleLeaveTable = async () => {
    if (!selectedTable) {
      showSnackbar("No table selected", "warning");
      return;
    }

    if (!window.confirm("Are you sure you want to leave this table? This will make the table available for other customers.")) {
      return;
    }

    try {
      await leaveTable(selectedTable.tableId);
      showSnackbar("You have left the table. The table is now available.", "success");
      setSelectedTable(null);
      setCart([]);
      setOrderPlaced(false);
      setShowCart(false);
      setActiveTab(0);
      if (restaurantId) {
        fetchTables();
      }
    } catch (err) {
      showSnackbar(err.response?.data || err.message || "Failed to leave table. Please try again.", "error");
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

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    // Construct full URL from base API URL
    // baseURL is "https://localhost:44300/api", so we need to remove "/api" and add the image path
    const baseUrl = api.defaults.baseURL.replace("/api", "");
    // Ensure imageUrl starts with /
    const imagePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    return `${baseUrl}${imagePath}`;
  };

  return (
    <Layout title="Restaurant Details" backPath={backPath} navLinks={navLinks}>
      {selectedTable && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography>
              Selected Table: <strong>{selectedTable.tableNumber}</strong> (Capacity: {selectedTable.capacity})
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                component={Link}
                to="/customer-orders"
                variant="outlined"
                size="small"
              >
                View All Orders
              </Button>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={handleLeaveTable}
              >
                Leave Table
              </Button>
            </Box>
          </Box>
        </Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab icon={<TableRestaurant />} label="Tables" />
          <Tab icon={<RestaurantMenu />} label="Menu" />
          {user && <Tab icon={<ShoppingCart />} label="My Orders" />}
        </Tabs>
      </Box>

      <Box sx={{ position: "relative" }}>
        {activeTab === 0 && (
          <Box>
            {/* Book a Table Button */}
            <Box sx={{ mb: 3, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 2 }}>
              {user ? (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<CalendarToday />}
                  onClick={() => navigate(`/customer-reservation-booking/${restaurantId}`)}
                  sx={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    fontWeight: 600,
                    textTransform: "none",
                    px: 4,
                    py: 1.5,
                    borderRadius: "8px",
                    boxShadow: 3,
                    "&:hover": {
                      background: "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                      boxShadow: 6,
                      transform: "translateY(-2px)",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Book a Table
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<CalendarToday />}
                  onClick={() => {
                    showSnackbar("Please login to make a reservation", "info");
                    setTimeout(() => navigate("/customer-login"), 1500);
                  }}
                  sx={{
                    borderColor: "primary.main",
                    color: "primary.main",
                    fontWeight: 600,
                    textTransform: "none",
                    px: 4,
                    py: 1.5,
                    borderRadius: "8px",
                    "&:hover": {
                      borderColor: "primary.dark",
                      backgroundColor: "primary.light",
                      color: "primary.dark",
                    },
                    transition: "all 0.3s ease",
                  }}
                >
                  Book a Table (Login Required)
                </Button>
              )}
            </Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Available Tables ({availableTables.length})
            </Typography>
            {tablesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : availableTables.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <TableRestaurant sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    No available tables
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All tables are currently occupied or reserved
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={3} sx={{ mb: 4 }}>
                {availableTables.map((table) => {
                  const tableId = table.tableId || table.TableId;
                  const tableNumber = table.tableNumber || table.TableNumber;
                  const capacity = table.capacity || table.Capacity;
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={tableId || tableNumber}>
                      <Card sx={{ height: "100%" }}>
                        <CardContent sx={{ textAlign: "center" }}>
                          <TableRestaurant sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
                          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                            Table {tableNumber}
                          </Typography>
                          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2, fontWeight: 300 }}>
                            Capacity: {capacity} {capacity === 1 ? "person" : "people"}
                          </Typography>
                          <Chip label="Available" color="success" sx={{ mb: 2 }} />
                          <Box sx={{ display: "flex", gap: 1, flexDirection: "column" }}>
                            <Button
                              variant="contained"
                              fullWidth
                              onClick={() => handleSelectTable(table)}
                            >
                              Select Table
                            </Button>
                            {user && (
                              <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<CalendarToday />}
                                onClick={() => navigate(`/customer-reservation-booking/${restaurantId}`, { state: { tableId: tableId } })}
                                sx={{
                                  borderColor: "primary.main",
                                  color: "primary.main",
                                  "&:hover": {
                                    borderColor: "primary.dark",
                                    backgroundColor: "primary.light",
                                    color: "primary.dark",
                                  },
                                }}
                              >
                                Book Table
                              </Button>
                            )}
                            <Button
                              variant="outlined"
                              fullWidth
                              startIcon={<QrCode />}
                              onClick={() => handleShowQR(table)}
                            >
                              View QR Code
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}

            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              All Tables ({tables.length})
            </Typography>
            <Grid container spacing={2}>
              {tables.map((table) => {
                const tableId = table.tableId || table.TableId;
                const tableNumber = table.tableNumber || table.TableNumber;
                const capacity = table.capacity || table.Capacity;
                const status = table.status || table.Status;
                
                return (
                  <Grid item xs={12} sm={6} md={3} key={tableId || tableNumber}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Table {tableNumber}
                          </Typography>
                          <Chip
                            label={status}
                            color={status === "Available" ? "success" : status === "Occupied" ? "error" : "default"}
                            size="small"
                          />
                        </Box>
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", mb: 1, fontWeight: 300 }}>
                          Capacity: {capacity}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          fullWidth
                          startIcon={<QrCode />}
                          onClick={() => handleShowQR(table)}
                        >
                          View QR Code
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        )}

        {activeTab === 1 && (
          <Box>
            {!selectedTable && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                Please select a table first to order meals.
              </Alert>
            )}
            {selectedTable && (
              <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)", border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)", color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                <CardContent>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        Table {selectedTable.tableNumber || selectedTable.TableNumber} Selected
                      </Typography>
                      <Typography variant="body2" sx={{ opacity: 0.9 }}>
                        Scan the QR code below to view menu on your phone
                      </Typography>
                    </Box>
                    <Button
                      variant="contained"
                      color="secondary"
                      startIcon={<QrCode />}
                      onClick={() => handleShowQR(selectedTable)}
                      sx={{ 
                        bgcolor: "rgba(255, 255, 255, 0.95)", 
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        color: "primary.main", 
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                        transition: "all 0.3s",
                        "&:hover": { 
                          bgcolor: "rgba(255, 255, 255, 1)",
                          transform: "translateY(-2px)",
                          boxShadow: "0 6px 16px rgba(0, 0, 0, 0.15)",
                        } 
                      }}
                    >
                      Show QR Code
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            )}
            {mealsLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : meals.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <RestaurantMenu sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
                  <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
                    No meals available
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <>
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
                        max={Math.max(10000, ...meals.map(m => m.price || 0))}
                        step={50}
                        marks={[
                          { value: 0, label: "₹0" },
                          { value: Math.max(10000, ...meals.map(m => m.price || 0)), label: `₹${Math.max(10000, ...meals.map(m => m.price || 0))}` }
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
                            const maxPrice = Math.max(10000, ...meals.map(m => m.price || 0));
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

                {filteredMeals.length === 0 ? (
                  <Card>
                    <CardContent sx={{ textAlign: "center", py: 8 }}>
                      <RestaurantMenu sx={{ fontSize: 80, color: "text.secondary", mb: 2 }} />
                      <Typography variant="h6" color="text.secondary" gutterBottom>
                        No meals match your filters
                      </Typography>
                      <Button
                        variant="outlined"
                        sx={{ mt: 2 }}
                        onClick={() => {
                          const maxPrice = Math.max(10000, ...meals.map(m => m.price || 0));
                          setPriceRange([0, maxPrice]);
                          setCategoryFilter("all");
                          setSearchTerm("");
                          setSortBy("default");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
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
                            onLoad={() => {
                              console.log("Customer meal image loaded:", name, fullImageUrl);
                            }}
                            onError={(e) => {
                              console.error("Image load error for meal:", name, "URL:", fullImageUrl);
                              // Show placeholder instead of hiding
                              e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f0f0f0' width='400' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo Image%3C/text%3E%3C/svg%3E";
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
                              {isBestItem && <Star sx={{ color: "warning.main" }} />}
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
                            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2, fontWeight: 300 }}>
                              {description}
                            </Typography>
                          )}
                          {selectedTable && isAvailable && (
                            <Button
                              variant="contained"
                              fullWidth
                              startIcon={<Add />}
                              onClick={() => handleAddToCart(meal)}
                            >
                              Add to Cart
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
                )}
              </>
            )}
          </Box>
        )}

        {activeTab === 2 && (
          <Box>
            {!user ? (
              <Alert severity="info">
                Please login to view your orders.
              </Alert>
            ) : ordersLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                <CircularProgress />
              </Box>
            ) : orders.length === 0 ? (
              <Card>
                <CardContent sx={{ textAlign: "center", py: 8 }}>
                  <ShoppingCart sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
                  <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
                    No orders found
                  </Typography>
                  <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                    Your orders for this restaurant will appear here
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <Grid container spacing={3}>
                {orders.map((order) => {
                  const orderId = order.orderId || order.OrderId;
                  const tableNumber = order.tableNumber || "N/A";
                  const orderStatus = order.orderStatus || order.OrderStatus;
                  const totalAmount = order.totalAmount || order.TotalAmount;
                  const createdAt = order.createdAt || order.CreatedAt;
                  const orderItems = order.orderItems || [];
                  
                  return (
                    <Grid xs={12} key={orderId}>
                      <Card>
                        <CardContent>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                            <Box>
                              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                                Order #{orderId}
                              </Typography>
                              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                                Table {tableNumber} • {createdAt ? formatDateTime(createdAt) : "N/A"}
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
                          <Accordion>
                            <AccordionSummary expandIcon={<ExpandMore />}>
                              <Typography variant="subtitle2">
                                Order Items ({orderItems.length})
                              </Typography>
                            </AccordionSummary>
                            <AccordionDetails>
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
                            </AccordionDetails>
                          </Accordion>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        )}
      </Box>

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
                <ShoppingCart sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
                <Typography variant="body1" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
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
                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handlePlaceOrder}
                  disabled={!selectedTable || orderPlaced}
                  sx={{ mb: 2 }}
                >
                  {orderPlaced ? "Order Placed" : "Place Order"}
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Drawer>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onClose={handleCloseQR} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Table {qrDialog.table?.tableNumber || qrDialog.table?.TableNumber} - Menu QR Code
            </Typography>
            <IconButton size="small" onClick={handleCloseQR}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2, textAlign: "center", fontWeight: 300 }}>
              Scan this QR code to view the menu for this table
            </Typography>
            {qrDialog.qrUrl && (
              <Box sx={{ 
                p: 2, 
                bgcolor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRadius: 4, 
                border: "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                mb: 2 
              }}>
                <QRCodeSVG value={qrDialog.qrUrl} size={256} />
              </Box>
            )}
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mt: 2, textAlign: "center", wordBreak: "break-all", fontWeight: 300 }}>
              {qrDialog.qrUrl}
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={() => {
                navigator.clipboard.writeText(qrDialog.qrUrl);
                showSnackbar("QR code URL copied to clipboard!", "success");
              }}
            >
              Copy URL
            </Button>
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 1 }}
              onClick={() => {
                window.open(qrDialog.qrUrl, "_blank");
                handleCloseQR();
              }}
            >
              Open Menu
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQR}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Cart Button */}
      {cart.length > 0 && (
        <Box
          sx={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 1000,
          }}
        >
          <Badge badgeContent={cart.length} color="error">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<ShoppingCart />}
              onClick={() => navigate("/cart", { 
                state: { 
                  cart, 
                  restaurantId, 
                  tableId: selectedTable?.tableId || selectedTable?.TableId 
                } 
              })}
              sx={{
                borderRadius: 4,
                px: 3,
                py: 1.5,
                boxShadow: 4,
              }}
            >
              Cart (₹{calculateTotal().toFixed(2)})
            </Button>
          </Badge>
        </Box>
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

      {/* Pending Order Banner */}
      {pendingOrder && selectedTable && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            bgcolor: "warning.light",
            color: "warning.contrastText",
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            boxShadow: 3,
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
        </Box>
      )}

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
    </Layout>
  );
};

export default CustomerRestaurantView;
