import { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Container,
  Paper,
} from "@mui/material";
import {
  ShoppingCart,
  Add,
  Remove,
  Delete,
  ArrowBack,
} from "@mui/icons-material";
import { AuthContext } from "../context/AuthContext";
import Layout from "../shared/components/Layout";
import { createOrder, payOrder, getOrder } from "../services/OrderService";
import ContinueOrderDialog from "./components/ContinueOrderDialog";

const Cart = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [continueOrderDialog, setContinueOrderDialog] = useState({ 
    open: false, 
    orderId: null, 
    totalAmount: null 
  });
  const cartListRef = useRef(null);
  const previousCartLengthRef = useRef(0);

  // Load cart from localStorage
  useEffect(() => {
    setLoading(true);
    try {
      // Try to get cart from location state first (if navigated from a page)
      if (location.state?.cart) {
        setCart(location.state.cart);
      } else if (user) {
        // Try to load from localStorage for the current user
        // We need to know which restaurant/table, so we'll check all possible keys
        const keys = Object.keys(localStorage);
        const cartKeys = keys.filter(key => key.startsWith(`userCart_${user.userId || user.UserId}_`));
        if (cartKeys.length > 0) {
          // Get the most recent cart
          const latestCart = cartKeys.reduce((latest, key) => {
            const cartData = JSON.parse(localStorage.getItem(key) || "[]");
            return cartData.length > latest.length ? cartData : latest;
          }, []);
          if (latestCart.length > 0) {
            setCart(latestCart);
          }
        }
      }
    } catch (error) {
      console.error("Error loading cart:", error);
    } finally {
      setLoading(false);
    }
  }, [user, location.state]);

  // Auto-scroll when cart items change
  useEffect(() => {
    const hasNewItems = cart.length > previousCartLengthRef.current;
    previousCartLengthRef.current = cart.length;
    
    if (hasNewItems && cart.length > 0) {
      setTimeout(() => {
        if (cartListRef.current) {
          cartListRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  }, [cart]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
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
    // Auto-scroll to cart list when quantity is updated
    setTimeout(() => {
      if (cartListRef.current) {
        cartListRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleRemoveFromCart = (mealId) => {
    setCart(cart.filter(item => item.mealId !== mealId));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePlaceOrder = async () => {
    if (!user) {
      showSnackbar("Please login to place your order", "warning");
      navigate("/customer-login");
      return;
    }

    if (cart.length === 0) {
      showSnackbar("Your cart is empty", "warning");
      return;
    }

    // Get restaurant and table info from cart items or location state
    const restaurantId = location.state?.restaurantId || cart[0]?.restaurantId;
    const tableId = location.state?.tableId || cart[0]?.tableId;

    if (!restaurantId || !tableId) {
      showSnackbar("Missing restaurant or table information", "error");
      return;
    }

    try {
      // Create order FIRST
      const response = await createOrder(parseInt(tableId), cart);
      const orderId = response.data.orderId || response.data.OrderId;
      const totalAmount = response.data.totalAmount || calculateTotal();
      
      // Show dialog to ask if user wants to order more
      setContinueOrderDialog({
        open: true,
        orderId: orderId,
        totalAmount: totalAmount,
        restaurantId: restaurantId,
        tableId: tableId,
        restaurantName: location.state?.restaurantName || cart[0]?.restaurantName || "Restaurant",
        tableNumber: location.state?.tableNumber || cart[0]?.tableNumber || "N/A",
      });
    } catch (error) {
      console.error("Error creating order:", error);
      showSnackbar(error.response?.data?.message || error.response?.data || "Failed to create order", "error");
    }
  };

  const handleContinueOrderYes = () => {
    // User wants to order more - clear cart and navigate back to menu
    const { tableId, restaurantId } = continueOrderDialog;
    
    // Clear cart
    setCart([]);
    
    // Store pending order info in localStorage for "Finish Ordering" button
    if (tableId) {
      localStorage.setItem(`pendingOrder_${tableId}`, JSON.stringify({
        orderId: continueOrderDialog.orderId,
        restaurantId: continueOrderDialog.restaurantId,
        tableId: continueOrderDialog.tableId,
        restaurantName: continueOrderDialog.restaurantName,
        tableNumber: continueOrderDialog.tableNumber,
      }));
    }
    
    // Close dialog
    setContinueOrderDialog({ open: false, orderId: null, totalAmount: null });
    
    // Navigate back to menu
    if (tableId) {
      navigate(`/table-menu/${tableId}`, {
        state: {
          pendingOrder: {
            orderId: continueOrderDialog.orderId,
            totalAmount: continueOrderDialog.totalAmount,
          }
        }
      });
    } else {
      navigate(-1);
    }
    
    showSnackbar("Order placed! You can continue adding items. Click 'Finish Ordering' when done.", "success");
  };

  const handleContinueOrderNo = () => {
    // User wants to pay now - navigate to payment page
    const { orderId, totalAmount, restaurantId, restaurantName, tableNumber } = continueOrderDialog;
    
    // Prepare order object for payment page
    const orderForPayment = {
      orderId: orderId,
      restaurantId: restaurantId, // Include restaurantId for fetching order details
      restaurantName: restaurantName,
      tableNumber: tableNumber,
      totalAmount: totalAmount,
      cart: cart, // Keep cart reference for display
    };
    
    // Clear cart
    setCart([]);
    
    // Close dialog
    setContinueOrderDialog({ open: false, orderId: null, totalAmount: null });
    
    // Navigate to payment page
    navigate("/payment", {
      state: {
        order: orderForPayment,
        orderId: orderId,
      },
      replace: false,
    });
  };

  const handlePaymentSuccess = async (paymentData, orderId) => {
    if (!orderId) return;

    try {
      const isCashOrCounter = paymentData.paymentMode === "Cash" || paymentData.paymentMode === "Counter";
      const isOnlinePayment = paymentData.paymentMode === "Online";

      // For Cash/Counter: Process payment (order already created)
      if (isCashOrCounter) {
        // Fetch latest order details to get the current total amount
        // This ensures we have the correct total even if items were added incrementally
        let latestOrderTotal = paymentData.amount;
        const orderFromState = location.state?.order;
        if (orderId && orderFromState?.restaurantId) {
          try {
            const orderResponse = await getOrder(orderId, orderFromState.restaurantId);
            latestOrderTotal = orderResponse.data?.totalAmount || orderResponse.data?.TotalAmount || paymentData.amount;
          } catch (fetchErr) {
            console.warn("Could not fetch latest order total, using provided amount:", fetchErr);
            // Continue with the provided amount if fetch fails
          }
        }

        const paymentResponse = await payOrder(orderId, {
          amount: latestOrderTotal,
          paymentMode: paymentData.paymentMode,
          transactionId: paymentData.transactionId || null,
        });
        
        // Verify payment was successful
        if (paymentResponse.data) {
          showSnackbar(`Order placed successfully! Please pay ₹${paymentData.amount.toFixed(2)} at the ${paymentData.paymentMode === "Cash" ? "table" : "counter"}.`, "success");
          
          // Clear cart after successful payment
          setCart([]);
          
          // Navigate to orders page after successful payment
          setTimeout(() => {
            navigate("/customer-orders");
          }, 2000);
        } else {
          throw new Error("Payment response was empty");
        }
      } 
      // For Online: Payment is already processed by StripeCheckout/confirmStripePayment
      // No need to call payOrder again - backend already handled it
      else if (isOnlinePayment) {
        showSnackbar(`Order placed and payment successful via ${paymentData.paymentMode}!`, "success");
        
        // Clear cart
        setCart([]);
        
        setTimeout(() => {
          navigate("/customer-orders");
        }, 2000);
      }
    } catch (error) {
      console.error("Payment error:", error);
      showSnackbar(error.response?.data?.message || error.response?.data || "Failed to process payment", "error");
      throw error; // Re-throw to be handled by Payment page
    }
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column",
          justifyContent: "center", 
          alignItems: "center",
          py: 6,
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
          <Typography variant="body2" color="text.secondary">
            Loading cart...
          </Typography>
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Box sx={{ 
          mb: 3, 
          display: "flex", 
          alignItems: "center", 
          gap: 2,
          animation: 'fadeIn 0.6s ease-in',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => {
              const tableId = location.state?.tableId;
              if (tableId) {
                // Navigate back to table menu with cart preserved in localStorage
                // Save current cart to localStorage before navigating
                if (cart.length > 0) {
                  localStorage.setItem(`guestCart_${tableId}`, JSON.stringify(cart));
                }
                navigate(`/table-menu/${tableId}`);
              } else {
                navigate(-1);
              }
            }}
            sx={{ 
              mb: 2,
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 600,
              transition: "all 0.3s",
              "&:hover": {
                transform: "translateX(-4px)",
              },
            }}
          >
            Back to Menu
          </Button>
          <Typography 
            variant="h4" 
            fontWeight={700}
            sx={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: mode === 'dark' ? 'white' : '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Shopping Cart
          </Typography>
        </Box>

        {cart.length === 0 ? (
          <Card
            sx={{
              borderRadius: "16px",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <ShoppingCart sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
              <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
                Your cart is empty
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", mt: 1, mb: 3, fontWeight: 300 }}>
                Add items to your cart to get started
              </Typography>
              <Button
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
                sx={{ 
                  mt: 2,
                  borderRadius: "4px",
                  textTransform: "none",
                  fontWeight: 600,
                  transition: "all 0.3s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  },
                }}
              >
                Continue Shopping
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <Paper 
              variant="outlined" 
              sx={{ 
                mb: 3,
                borderRadius: "4px",
                bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.9)" : "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                boxShadow: "0 8px 32px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)",
                border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(255, 255, 255, 0.5)",
                transition: "all 0.3s",
              }}
            >
              <List ref={cartListRef}>
                {cart.map((item, index) => (
                  <div key={item.mealId || index}>
                    <ListItem
                      sx={{
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        transition: "all 0.3s",
                        "&:hover": {
                          backgroundColor: "action.hover",
                          borderRadius: "4px",
                        },
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={600}>
                          {item.name || item.mealName}
                        </Typography>
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          ₹{item.price?.toFixed(2) || "0.00"} each
                        </Typography>
                      </Box>

                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(item.mealId, item.quantity - 1)}
                          sx={{
                            transition: "all 0.3s",
                            "&:hover": {
                              transform: "scale(1.1)",
                              backgroundColor: "error.light",
                              color: "error.contrastText",
                            },
                          }}
                        >
                          <Remove />
                        </IconButton>
                        <Typography variant="body1" sx={{ minWidth: 30, textAlign: "center", fontWeight: 600 }}>
                          {item.quantity}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => handleUpdateQuantity(item.mealId, item.quantity + 1)}
                          sx={{
                            transition: "all 0.3s",
                            "&:hover": {
                              transform: "scale(1.1)",
                              backgroundColor: "success.light",
                              color: "success.contrastText",
                            },
                          }}
                        >
                          <Add />
                        </IconButton>
                      </Box>

                      <Typography variant="h6" sx={{ minWidth: 100, textAlign: "right", fontWeight: 700 }}>
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </Typography>

                      <IconButton
                        color="error"
                        onClick={() => handleRemoveFromCart(item.mealId)}
                        sx={{
                          transition: "all 0.3s",
                          "&:hover": {
                            transform: "rotate(15deg) scale(1.1)",
                            backgroundColor: "error.light",
                          },
                        }}
                      >
                        <Delete />
                      </IconButton>
                    </ListItem>
                    {index < cart.length - 1 && <Divider />}
                  </div>
                ))}
              </List>
            </Paper>

            <Card
              sx={{
                borderRadius: "16px",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                border: "1px solid rgba(0, 0, 0, 0.05)",
              }}
            >
              <CardContent>
                <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                  <Typography 
                    variant="h5" 
                    fontWeight={700}
                    sx={{
                      background: 'rgba(255, 255, 255, 0.1)',
              color: mode === 'dark' ? 'white' : '#1a1a1a',
              border: '1px solid rgba(255, 255, 255, 0.2)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                    }}
                  >
                    Total:
                  </Typography>
                  <Typography 
                    variant="h5" 
                    color="primary" 
                    fontWeight={700}
                    sx={{
                      fontSize: "2rem",
                    }}
                  >
                    ₹{calculateTotal().toFixed(2)}
                  </Typography>
                </Box>

                {!user && (
                  <Alert 
                    severity="info" 
                    sx={{ 
                      mb: 2,
                      borderRadius: "4px",
                    }}
                  >
                    Please login to place your order
                  </Alert>
                )}

                <Button
                  variant="contained"
                  fullWidth
                  size="large"
                  onClick={handlePlaceOrder}
                  disabled={!user || cart.length === 0}
                  sx={{
                    borderRadius: "4px",
                    textTransform: "none",
                    fontWeight: 600,
                    py: 1.5,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 20px rgba(102, 126, 234, 0.4)",
                      background: "rgba(255, 255, 255, 0.2)",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                    },
                    "&:disabled": {
                      background: "rgba(0, 0, 0, 0.12)",
                    },
                  }}
                >
                  {user ? "Place Order" : "Login to Order"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}


        {/* Snackbar */}
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

        {/* Continue Order Dialog */}
        <ContinueOrderDialog
          open={continueOrderDialog.open}
          orderId={continueOrderDialog.orderId}
          totalAmount={continueOrderDialog.totalAmount}
          onYes={handleContinueOrderYes}
          onNo={handleContinueOrderNo}
        />
      </Container>
    </Layout>
  );
};

export default Cart;

