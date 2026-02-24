import { useState, useEffect } from "react";
import {  Box,  Button,  Card,  CardContent,  Typography,  TextField,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  Grid,  Chip,  IconButton,  CircularProgress,  Alert,  Snackbar,  InputAdornment,  FormControl,  InputLabel,  Select,  MenuItem,} from "@mui/material";
import {  Add,  Edit,  Delete,  Restaurant as RestaurantIcon,  LocationOn,  Phone,  Search,  Clear,  Visibility,} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import {  getAllRestaurants,  createRestaurant,  updateRestaurant,  deleteRestaurant,} from "../services/RestaurantService";
import Layout from "../shared/components/Layout";
import { validateRequired } from "../utils/validation";
import { useThemeMode } from "../context/ThemeContext";

const AdminRestaurants = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingRestaurant, setEditingRestaurant] = useState(null);
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const navLinks = [
    { path: "/admin-dashboard", label: "Dashboard" },
    { path: "/admin-users", label: "Users" },
  ];

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await getAllRestaurants();
      const restaurantsData = response.data || [];
      
      const normalizedRestaurants = restaurantsData.map(restaurant => ({
        restaurantId: restaurant.restaurantId || restaurant.RestaurantId,
        name: restaurant.name || restaurant.Name,
        address: restaurant.address || restaurant.Address || "",
        phone: restaurant.phone || restaurant.Phone || "",
        isActive: restaurant.isActive !== undefined ? restaurant.isActive : restaurant.IsActive,
        createdAt: restaurant.createdAt || restaurant.CreatedAt,
      }));
      
      setRestaurants(normalizedRestaurants);
      setFilteredRestaurants(normalizedRestaurants);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      showSnackbar("Failed to load restaurants: " + (err.response?.data || err.message), "error");
      setRestaurants([]);
      setFilteredRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter restaurants based on search and status
  useEffect(() => {
    let filtered = [...restaurants];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(term) ||
          (r.address || "").toLowerCase().includes(term) ||
          (r.phone || "").toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => {
        if (statusFilter === "active") return r.isActive;
        if (statusFilter === "inactive") return !r.isActive;
        return true;
      });
    }

    setFilteredRestaurants(filtered);
  }, [restaurants, searchTerm, statusFilter]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const handleAdd = () => {
    setForm({ name: "", address: "", phone: "" });
    setEditingRestaurant(null);
    setShowForm(true);
  };

  const handleEdit = (restaurantName) => {
    const restaurant = restaurants.find(r => (r.name || r.Name) === restaurantName);
    if (!restaurant) {
      showSnackbar("Restaurant not found", "error");
      return;
    }
    const normalizedRestaurant = {
      restaurantId: restaurant.restaurantId || restaurant.RestaurantId,
      name: restaurant.name || restaurant.Name,
      address: restaurant.address || restaurant.Address || "",
      phone: restaurant.phone || restaurant.Phone || "",
    };
    setForm({
      name: normalizedRestaurant.name,
      address: normalizedRestaurant.address,
      phone: normalizedRestaurant.phone,
    });
    setEditingRestaurant(normalizedRestaurant);
    setShowForm(true);
  };

  const handleDelete = async (restaurantName) => {
    const restaurant = restaurants.find(r => (r.name || r.Name) === restaurantName);
    if (!restaurant) {
      showSnackbar("Restaurant not found", "error");
      return;
    }
    const restaurantId = restaurant.restaurantId || restaurant.RestaurantId;

    const confirmMessage = `Are you sure you want to delete restaurant "${restaurantName}"?\n\nWarning: This restaurant may have associated users, tables, meals, or orders. Deleting it may affect related data.\n\nThis action cannot be undone.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await deleteRestaurant(restaurantId);
      const message = response.data?.message || response.data || "Restaurant deleted successfully";
      showSnackbar(message, "success");
      fetchRestaurants();
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.response?.data || err.message || "Failed to delete restaurant";
      showSnackbar(errorMessage, "error");
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const nameValidation = validateRequired(form.name, "Restaurant name");
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.message;
    }
    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showSnackbar("Please fix the errors in the form", "error");
      return;
    }

    try {
      if (editingRestaurant) {
        await updateRestaurant(editingRestaurant.restaurantId, {
          name: form.name,
          address: form.address,
          phone: form.phone,
        });
        showSnackbar("Restaurant updated successfully", "success");
      } else {
        await createRestaurant({
          name: form.name,
          address: form.address,
          phone: form.phone,
        });
        showSnackbar("Restaurant added successfully", "success");
      }
      setShowForm(false);
      setEditingRestaurant(null);
      setForm({ name: "", address: "", phone: "" });
      setFormErrors({});
      fetchRestaurants();
    } catch (err) {
      showSnackbar(err.response?.data || "Failed to save restaurant", "error");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingRestaurant(null);
    setForm({ name: "", address: "", phone: "" });
    setFormErrors({});
  };

  return (
    <Layout title="Manage Restaurants" backPath="/admin-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          All Restaurants ({filteredRestaurants.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          sx={{ borderRadius: 2 }}
        >
          Add New Restaurant
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : filteredRestaurants.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <RestaurantIcon sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
              No restaurants found
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", mb: 3, fontWeight: 300 }}>
              {searchTerm || statusFilter !== "all"
                ? "No restaurants match your search criteria"
                : "Add your first restaurant to get started"}
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
              Add Restaurant
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {filteredRestaurants.map((restaurant) => {
            const restaurantId = restaurant.restaurantId || restaurant.RestaurantId;
            const name = restaurant.name || restaurant.Name;
            const address = restaurant.address || restaurant.Address || "";
            const phone = restaurant.phone || restaurant.Phone || "";
            const isActive = restaurant.isActive !== undefined ? restaurant.isActive : restaurant.IsActive;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={restaurantId || name}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <RestaurantIcon color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {name}
                        </Typography>
                      </Box>
                      <Chip
                        label={isActive ? "Active" : "Inactive"}
                        color={isActive ? "success" : "default"}
                        size="small"
                      />
                    </Box>
                    
                    {address && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <LocationOn fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          {address}
                        </Typography>
                      </Box>
                    )}
                    
                    {phone && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          {phone}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ display: "flex", gap: 1, mt: 2, flexDirection: "column" }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<Visibility />}
                        onClick={() => navigate(`/admin-restaurant-details/${restaurantId}`)}
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        View Details
                      </Button>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Edit />}
                          onClick={() => handleEdit(name)}
                          fullWidth
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Delete />}
                          onClick={() => handleDelete(name)}
                          fullWidth
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={showForm} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRestaurant ? "Edit Restaurant" : "Add New Restaurant"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Restaurant Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              error={!!formErrors.name}
              helperText={formErrors.name}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Address"
              name="address"
              value={form.address}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Phone"
              name="phone"
              type="tel"
              value={form.phone}
              onChange={handleChange}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingRestaurant ? "Update" : "Add"} Restaurant
            </Button>
          </DialogActions>
        </form>
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

export default AdminRestaurants;
