import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { formatDate } from "../utils/dateUtils";
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CircularProgress, 
  Button,
  Chip,
  Stack,
} from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import Layout from "../shared/components/Layout";
import { getAllMyOrders } from "../services/OrderService";
import {
  Restaurant,
  Receipt,
  Payment,
  ShoppingCart,
  History,
} from "@mui/icons-material";

const CustomerDashboard = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSpent: 0,
    activeOrders: 0,
    favoriteRestaurant: null,
    recentOrders: [],
    loading: true,
  });

  const navLinks = [
    { path: "/customer-restaurants", label: "Restaurants" },
    { path: "/customer-orders", label: "My Orders" },
    { path: "/payment-history", label: "Payment History" },
  ];

  useEffect(() => {
    if (!user) {
      setStats({
        totalOrders: 0,
        totalSpent: 0,
        activeOrders: 0,
        favoriteRestaurant: null,
        recentOrders: [],
        loading: false,
      });
      return;
    }

    const fetchOrders = async () => {
      try {
        const response = await getAllMyOrders();
        const orders = response.data || [];

        // Calculate statistics
        const totalOrders = orders.length;
        const totalSpent = orders.reduce((sum, order) => {
          return sum + (order.totalAmount || order.TotalAmount || 0);
        }, 0);
        
        const activeOrders = orders.filter(order => {
          const status = order.orderStatus || order.OrderStatus;
          return status && !["Completed", "Cancelled", "Paid"].includes(status);
        }).length;

        // Find favorite restaurant (most orders from)
        const restaurantCounts = {};
        orders.forEach(order => {
          const restaurantName = order.restaurantName || order.RestaurantName;
          if (restaurantName) {
            restaurantCounts[restaurantName] = (restaurantCounts[restaurantName] || 0) + 1;
          }
        });
        
        const favoriteRestaurant = Object.keys(restaurantCounts).reduce((a, b) => 
          restaurantCounts[a] > restaurantCounts[b] ? a : b, null
        );

        setStats({
          totalOrders,
          totalSpent,
          activeOrders,
          favoriteRestaurant,
          recentOrders: orders.slice(0, 3),
          loading: false,
        });
      } catch (error) {
        console.error("Error fetching orders:", error);
        setStats({
          totalOrders: 0,
          totalSpent: 0,
          activeOrders: 0,
          favoriteRestaurant: null,
          recentOrders: [],
          loading: false,
        });
      }
    };

    fetchOrders();
  }, [user]);

  // Auto-scroll function for dashboard cards
  const handleCardClick = (targetId) => {
    setTimeout(() => {
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

  return (
    <Layout title="Customer Dashboard" navLinks={navLinks}>
      <Box>
        {/* Welcome Section */}
        <Box sx={{ 
          mb: 4, 
          textAlign: "center",
          animation: 'fadeIn 0.6s ease-in',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            mb={1}
            sx={{
              color: mode === 'dark' ? 'white' : '#1a1a1a',
              fontWeight: 300,
              letterSpacing: '0.05em',
              fontFamily: "'Playfair Display', 'Georgia', serif",
            }}
          >
            Welcome back, {user?.fullName || user?.FullName || user?.email?.split("@")[0] || "Customer"} 👋
          </Typography>
          <Typography sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", variant: "body1", fontWeight: 300 }}>
            Your order statistics and quick actions
          </Typography>
        </Box>

        {/* Loader */}
        {stats.loading ? (
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
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
              Loading your dashboard...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Statistics Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('quick-actions-section')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "4px",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: mode === 'dark' ? "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)" : "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: mode === 'dark' ? "0 12px 40px rgba(0, 0, 0, 0.5)" : "0 12px 40px rgba(0, 0, 0, 0.12)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
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
                    <Receipt sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.totalOrders}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('payment-history-section')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "4px",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: mode === 'dark' ? "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)" : "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: mode === 'dark' ? "0 12px 40px rgba(0, 0, 0, 0.5)" : "0 12px 40px rgba(0, 0, 0, 0.12)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
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
                    <Payment sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      ₹{stats.totalSpent.toFixed(0)}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Total Spent
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => handleCardClick('recent-orders-section')}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "4px",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: mode === 'dark' ? "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)" : "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: mode === 'dark' ? "0 12px 40px rgba(0, 0, 0, 0.5)" : "0 12px 40px rgba(0, 0, 0, 0.12)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
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
                    <ShoppingCart sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
                    <Typography variant="h4" sx={{ fontWeight: 700 }}>
                      {stats.activeOrders}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Active Orders
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card
                  onClick={() => navigate("/customer-restaurants")}
                  sx={{
                    background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    height: "100%",
                    borderRadius: "4px",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    cursor: "pointer",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                    position: "relative",
                    overflow: "hidden",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: 0,
                      left: "-100%",
                      width: "100%",
                      height: "100%",
                      background: mode === 'dark' ? "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)" : "linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)",
                      transition: "left 0.5s",
                    },
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: mode === 'dark' ? "0 12px 40px rgba(0, 0, 0, 0.5)" : "0 12px 40px rgba(0, 0, 0, 0.12)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
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
                    <Restaurant sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                      {stats.favoriteRestaurant || "None"}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      Favorite Restaurant
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Quick Actions */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <Card 
                  id="quick-actions-section"
                  sx={{ 
                    height: "100%",
                    borderRadius: "4px",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    "&:hover": {
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={700} mb={2}>
                      Quick Actions
                    </Typography>
                    <Stack spacing={2}>
                      <Button
                        variant="contained"
                        fullWidth
                        startIcon={<Restaurant />}
                        onClick={() => navigate("/customer-restaurants")}
                        sx={{ 
                          py: 1.5, 
                          justifyContent: "flex-start",
                          borderRadius: "4px",
                          textTransform: "none",
                          fontWeight: 600,
                          background: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                          color: mode === 'dark' ? "white" : "#1a1a1a",
                          border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                          boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.1)",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: mode === 'dark' ? "0 8px 20px rgba(102, 126, 234, 0.4)" : "0 8px 20px rgba(0, 0, 0, 0.15)",
                            background: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                            border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                          },
                        }}
                      >
                        Browse Restaurants
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<Receipt />}
                        onClick={() => navigate("/customer-orders")}
                        sx={{ 
                          py: 1.5, 
                          justifyContent: "flex-start",
                          borderRadius: "4px",
                          textTransform: "none",
                          fontWeight: 600,
                          borderWidth: 2,
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            borderWidth: 2,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          },
                        }}
                      >
                        View All Orders
                      </Button>
                      <Button
                        variant="outlined"
                        fullWidth
                        startIcon={<History />}
                        onClick={() => navigate("/payment-history")}
                        sx={{ 
                          py: 1.5, 
                          justifyContent: "flex-start",
                          borderRadius: "4px",
                          textTransform: "none",
                          fontWeight: 600,
                          borderWidth: 2,
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            borderWidth: 2,
                            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                          },
                        }}
                      >
                        Payment History
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Orders Summary */}
              <Grid item xs={12} md={6}>
                <Card 
                  id="recent-orders-section"
                  sx={{ 
                    height: "100%",
                    borderRadius: "4px",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    "&:hover": {
                      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                      transform: "translateY(-4px)",
                    },
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                      <Typography variant="h6" fontWeight={700}>
                        Recent Orders
                      </Typography>
                      {stats.recentOrders.length > 0 && (
                        <Button
                          size="small"
                          component={Link}
                          to="/customer-orders"
                          sx={{ 
                            textTransform: "none",
                            borderRadius: "4px",
                            fontWeight: 600,
                            transition: "all 0.3s",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          View All
                        </Button>
                      )}
                    </Box>

                    {stats.recentOrders.length > 0 ? (
                      <Stack spacing={2}>
                        {stats.recentOrders.map((order) => {
                          const status = order.orderStatus || order.OrderStatus;
                          const getStatusColor = (status) => {
                            switch (status) {
                              case "Pending": return "warning";
                              case "Preparing": return "info";
                              case "Ready": return "success";
                              case "Served": return "primary";
                              case "Completed": return "success";
                              case "Paid": return "success";
                              case "Cancelled": return "error";
                              default: return "default";
                            }
                          };

                          return (
                            <Box
                              key={order.orderId || order.OrderId}
                              sx={{
                                p: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                borderRadius: "4px",
                                cursor: "pointer",
                                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                  backgroundColor: "action.hover",
                                  transform: "translateX(4px)",
                                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                                  borderColor: "primary.main",
                                },
                              }}
                              onClick={() => navigate("/customer-orders")}
                            >
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                                <Box>
                                  <Typography fontWeight={600}>
                                    Order #{order.orderId || order.OrderId}
                                  </Typography>
                                  <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                                    {order.restaurantName || "Restaurant"}
                                  </Typography>
                                </Box>
                                <Chip
                                  label={status || "N/A"}
                                  color={getStatusColor(status)}
                                  size="small"
                                  sx={{
                                    borderRadius: "2px",
                                    fontWeight: 600,
                                    transition: "all 0.3s",
                                    "&:hover": {
                                      transform: "scale(1.1)",
                                    },
                                  }}
                                />
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
                                <Typography variant="body2" color="text.secondary">
                                  {order.createdAt
                                    ? formatDate(order.createdAt)
                                    : "N/A"}
                                </Typography>
                                <Typography fontWeight={700}>
                                  ₹{order.totalAmount || order.TotalAmount || 0}
                                </Typography>
                              </Box>
                            </Box>
                          );
                        })}
                      </Stack>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4 }}>
                        <Receipt sx={{ fontSize: 60, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
                        <Typography sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                          No orders yet
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<Restaurant />}
                          onClick={() => navigate("/customer-restaurants")}
                          sx={{ 
                            mt: 2,
                            borderRadius: "4px",
                            textTransform: "none",
                            fontWeight: 600,
                            py: 1.5,
                            px: 3,
                            background: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                            color: mode === 'dark' ? "white" : "#1a1a1a",
                            border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                            boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.1)",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow: mode === 'dark' ? "0 8px 20px rgba(102, 126, 234, 0.4)" : "0 8px 20px rgba(0, 0, 0, 0.15)",
                              background: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                              border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                            },
                          }}
                        >
                          Browse Restaurants
                        </Button>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </Layout>
  );
};

export default CustomerDashboard;
