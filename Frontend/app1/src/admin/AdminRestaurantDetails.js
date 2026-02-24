import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {  Box,  Button,  Card,  CardContent,  Typography,  Grid,  Chip,  CircularProgress,  Snackbar,  Alert,  IconButton,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  TextField,  Tabs,  Tab,  Table,  TableBody,  TableCell,  TableContainer,  TableHead,  TableRow,  Paper,  Avatar,} from "@mui/material";
import {  ArrowBack,  Restaurant as RestaurantIcon,  LocationOn,  Phone,  Block,  CheckCircle,  TableRestaurant,  Person,  Visibility,} from "@mui/icons-material";
import {  getRestaurant,  getAdminRestaurantMeals,  getAdminRestaurantTables,  disableRestaurantMeal,  enableRestaurantMeal,  notifyRestaurantAdmin,} from "../services/RestaurantService";
import Layout from "../shared/components/Layout";

const AdminRestaurantDetails = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState(null);
  const [meals, setMeals] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [disableDialog, setDisableDialog] = useState({ open: false, meal: null, reason: "" });
  const [refreshKey, setRefreshKey] = useState(0);

  const navLinks = [
    { path: "/admin-dashboard", label: "Dashboard" },
    { path: "/admin-restaurants", label: "Restaurants" },
    { path: "/admin-users", label: "Users" },
  ];

  useEffect(() => {
    // Validate restaurantId
    if (!restaurantId) {
      setLoading(false);
      showSnackbar("Restaurant ID is required", "error");
      navigate("/admin-restaurants");
      return;
    }

    // Validate restaurantId is numeric
    const restaurantIdNum = parseInt(restaurantId, 10);
    if (isNaN(restaurantIdNum) || restaurantIdNum <= 0) {
      setLoading(false);
      showSnackbar("Invalid restaurant ID", "error");
      navigate("/admin-restaurants");
      return;
    }

    fetchData();
  }, [restaurantId, refreshKey]);

  const fetchData = async () => {
    if (!restaurantId) return;
    
    try {
      setLoading(true);
      const [restaurantRes, mealsRes, tablesRes] = await Promise.all([
        getRestaurant(restaurantId),
        getAdminRestaurantMeals(restaurantId),
        getAdminRestaurantTables(restaurantId),
      ]);

      const restaurantData = restaurantRes.data;
      setRestaurant({
        restaurantId: restaurantData.restaurantId || restaurantData.RestaurantId,
        name: restaurantData.name || restaurantData.Name,
        address: restaurantData.address || restaurantData.Address || "",
        phone: restaurantData.phone || restaurantData.Phone || "",
        isActive: restaurantData.isActive !== undefined ? restaurantData.isActive : restaurantData.IsActive,
      });

      const mealsData = mealsRes.data || [];
      setMeals(
        mealsData.map((meal) => ({
          mealId: meal.mealId || meal.MealId,
          name: meal.name || meal.Name,
          description: meal.description || meal.Description || "",
          price: meal.price || meal.Price,
          category: meal.category || meal.Category || "",
          imageUrl: meal.imageUrl || meal.ImageUrl || "",
          isAvailable: meal.isAvailable !== undefined ? meal.isAvailable : meal.IsAvailable,
        }))
      );

      setTables(tablesRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
      const errorMessage = err.response?.data || err.message || "Failed to load restaurant details";
      showSnackbar(errorMessage, "error");
      
      // If restaurant not found, redirect back
      if (err.response?.status === 404) {
        setTimeout(() => {
          navigate("/admin-restaurants");
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleDisableMeal = async () => {
    if (!disableDialog.meal) return;

    try {
      await disableRestaurantMeal(
        restaurantId,
        disableDialog.meal.mealId,
        disableDialog.reason || "Item removed by Admin"
      );
      showSnackbar(
        `Meal "${disableDialog.meal.name}" has been disabled. Restaurant admin has been notified.`,
        "success"
      );
      setDisableDialog({ open: false, meal: null, reason: "" });
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      showSnackbar("Failed to disable meal: " + (err.response?.data || err.message), "error");
    }
  };

  const handleEnableMeal = async (meal) => {
    try {
      await enableRestaurantMeal(restaurantId, meal.mealId);
      showSnackbar(`Meal "${meal.name}" has been enabled.`, "success");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      showSnackbar("Failed to enable meal: " + (err.response?.data || err.message), "error");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "available":
        return "success";
      case "occupied":
        return "error";
      case "reserved":
        return "warning";
      default:
        return "default";
    }
  };

  if (loading) {
    return (
      <Layout title="Restaurant Details" backPath="/admin-restaurants" navLinks={navLinks}>
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  if (!restaurant) {
    return (
      <Layout title="Restaurant Details" backPath="/admin-restaurants" navLinks={navLinks}>
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <Typography variant="h6" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
              Restaurant not found
            </Typography>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  return (
    <Layout title={`${restaurant.name} - Details`} backPath="/admin-restaurants" navLinks={navLinks}>
      {/* Restaurant Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: "#FF6B35", width: 64, height: 64 }}>
              <RestaurantIcon sx={{ fontSize: 40 }} />
            </Avatar>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  {restaurant.name}
                </Typography>
                <Chip
                  label={restaurant.isActive ? "Active" : "Inactive"}
                  color={restaurant.isActive ? "success" : "default"}
                  size="small"
                />
              </Box>
              {restaurant.address && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <LocationOn fontSize="small" color="action" />
                  <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                    {restaurant.address}
                  </Typography>
                </Box>
              )}
              {restaurant.phone && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Phone fontSize="small" color="action" />
                  <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                    {restaurant.phone}
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label={`Menu Items (${meals.length})`} />
            <Tab label={`Tables (${tables.length})`} />
          </Tabs>
        </Box>

        {/* Menu Tab */}
        {activeTab === 0 && (
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Restaurant Menu
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 3, fontWeight: 300 }}>
              You can disable menu items that should not be sold. Changes will be notified to the restaurant admin.
            </Typography>

            {meals.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <RestaurantIcon sx={{ fontSize: 60, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
                <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                  No menu items found
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {meals.map((meal) => (
                  <Grid item xs={12} sm={6} md={4} key={meal.mealId}>
                    <Card
                      sx={{
                        height: "100%",
                        opacity: meal.isAvailable ? 1 : 0.6,
                        border: meal.isAvailable ? "none" : "2px solid #ff9800",
                      }}
                    >
                      <CardContent>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, flex: 1 }}>
                            {meal.name}
                          </Typography>
                          <Chip
                            label={meal.isAvailable ? "Available" : "Disabled"}
                            color={meal.isAvailable ? "success" : "warning"}
                            size="small"
                          />
                        </Box>
                        {meal.category && (
                          <Chip label={meal.category} size="small" sx={{ mb: 1 }} variant="outlined" />
                        )}
                        {meal.description && (
                          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 1, fontWeight: 300 }}>
                            {meal.description}
                          </Typography>
                        )}
                        <Typography variant="h6" color="primary" sx={{ mb: 2 }}>
                          ₹{meal.price?.toFixed(2) || "0.00"}
                        </Typography>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          {meal.isAvailable ? (
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              startIcon={<Block />}
                              onClick={() => setDisableDialog({ open: true, meal, reason: "" })}
                              fullWidth
                            >
                              Disable
                            </Button>
                          ) : (
                            <Button
                              variant="outlined"
                              color="success"
                              size="small"
                              startIcon={<CheckCircle />}
                              onClick={() => handleEnableMeal(meal)}
                              fullWidth
                            >
                              Enable
                            </Button>
                          )}
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </CardContent>
        )}

        {/* Tables Tab */}
        {activeTab === 1 && (
          <CardContent>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Restaurant Tables
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 3, fontWeight: 300 }}>
              View table status, capacity, and customer information.
            </Typography>

            {tables.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <TableRestaurant sx={{ fontSize: 60, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
                <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                  No tables found
                </Typography>
              </Box>
            ) : (
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Table Number</TableCell>
                      <TableCell>Capacity</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Active Orders</TableCell>
                      <TableCell>Customer</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tables.map((table) => (
                      <TableRow key={table.tableId}>
                        <TableCell>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                            <TableRestaurant fontSize="small" />
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {table.tableNumber}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>{table.capacity} seats</TableCell>
                        <TableCell>
                          <Chip
                            label={table.status || "Unknown"}
                            color={getStatusColor(table.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {table.hasActiveOrders ? (
                            <Chip label="Yes" color="error" size="small" />
                          ) : (
                            <Chip label="No" color="success" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          {table.currentCustomer ? (
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {table.currentCustomer.customerName}
                              </Typography>
                              <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                                Order #{table.currentCustomer.orderId} - {table.currentCustomer.orderStatus}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                              No customer
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        )}
      </Card>

      {/* Disable Meal Dialog */}
      <Dialog open={disableDialog.open} onClose={() => setDisableDialog({ open: false, meal: null, reason: "" })}>
        <DialogTitle>Disable Menu Item</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Are you sure you want to disable "{disableDialog.meal?.name}"? This will remove it from the restaurant's
            menu and notify the restaurant admin.
          </Typography>
          <TextField
            fullWidth
            label="Reason (Optional)"
            multiline
            rows={3}
            value={disableDialog.reason}
            onChange={(e) => setDisableDialog({ ...disableDialog, reason: e.target.value })}
            placeholder="e.g., Item not allowed to sell, Legal restrictions, etc."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDisableDialog({ open: false, meal: null, reason: "" })}>Cancel</Button>
          <Button onClick={handleDisableMeal} variant="contained" color="warning">
            Disable Item
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Layout>
  );
};

export default AdminRestaurantDetails;

