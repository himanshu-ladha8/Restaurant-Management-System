import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {  Box,  Card,  CardContent,  Typography,  CircularProgress,  Table,  TableBody,  TableCell,  TableContainer,  TableHead,  TableRow,  Paper,  Alert,  Snackbar,  Button,  IconButton,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  TextField,  FormControl,  InputLabel,  Select,  MenuItem,  Chip,} from "@mui/material";
import {  People,  Email,  Phone,  Restaurant as RestaurantIcon,  Person,  Edit,  Delete,} from "@mui/icons-material";
import { getAllUsers, updateUser, deleteUser } from "../services/UserService";
import { getAllRestaurants, createRestaurant } from "../services/RestaurantService";
import Layout from "../shared/components/Layout";
import { validateEmail, validateRequired } from "../utils/validation";

const AdminUsers = () => {
  const { user: currentUser } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [users, setUsers] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [editDialog, setEditDialog] = useState({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, user: null });
  const [addRestaurantDialog, setAddRestaurantDialog] = useState({ open: false });
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    userType: "",
    restaurantId: "",
  });
  const [restaurantForm, setRestaurantForm] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [formErrors, setFormErrors] = useState({});
  const [restaurantFormErrors, setRestaurantFormErrors] = useState({});

  const navLinks = [
    { path: "/admin-dashboard", label: "Dashboard" },
    { path: "/admin-restaurants", label: "Restaurants" },
  ];

  useEffect(() => {
    fetchUsers();
    fetchRestaurants();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getAllUsers();
      setUsers(response.data || []);
    } catch (err) {
      console.error("Error fetching users:", err);
      showSnackbar("Failed to load users: " + (err.response?.data || err.message), "error");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurants = async () => {
    try {
      const response = await getAllRestaurants();
      setRestaurants(response.data || []);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const getRoleColor = (role) => {
    switch (role) {
      case "Admin":
        return "error";
      case "RestaurantAdmin":
        return "primary";
      case "Customer":
        return "success";
      default:
        return "default";
    }
  };

  const handleEdit = (user) => {
    const normalizedUser = {
      userId: user.userId || user.UserId,
      fullName: user.fullName || user.FullName,
      email: user.email || user.Email,
      phoneNumber: user.phoneNumber || user.PhoneNumber || "",
      userType: user.userType || user.UserType,
      restaurantId: user.restaurantId || user.RestaurantId || "",
    };
    setForm({
      fullName: normalizedUser.fullName,
      email: normalizedUser.email,
      phoneNumber: normalizedUser.phoneNumber,
      userType: normalizedUser.userType,
      restaurantId: normalizedUser.restaurantId || "",
    });
    setFormErrors({});
    setEditDialog({ open: true, user: normalizedUser });
  };

  const handleDelete = (user) => {
    const normalizedUser = {
      userId: user.userId || user.UserId,
      fullName: user.fullName || user.FullName,
      email: user.email || user.Email,
      userType: user.userType || user.UserType,
    };
    setDeleteDialog({ open: true, user: normalizedUser });
  };

  const handleCloseEdit = () => {
    setEditDialog({ open: false, user: null });
    setForm({
      fullName: "",
      email: "",
      phoneNumber: "",
      userType: "",
      restaurantId: "",
    });
    setFormErrors({});
  };

  const handleCloseDelete = () => {
    setDeleteDialog({ open: false, user: null });
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
    // If user selects "add_new" option, open add restaurant dialog
    if (name === "restaurantId" && value === "add_new") {
      setAddRestaurantDialog({ open: true });
      setForm({ ...form, restaurantId: "" }); // Reset selection
    }
  };

  const handleRestaurantFormChange = (e) => {
    const { name, value } = e.target;
    setRestaurantForm({ ...restaurantForm, [name]: value });
    // Clear error when user starts typing
    if (restaurantFormErrors[name]) {
      setRestaurantFormErrors({ ...restaurantFormErrors, [name]: "" });
    }
  };

  const validateRestaurantForm = () => {
    const errors = {};
    const nameValidation = validateRequired(restaurantForm.name, "Restaurant name");
    if (!nameValidation.valid) {
      errors.name = nameValidation.message;
    }
    setRestaurantFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCloseAddRestaurant = () => {
    setAddRestaurantDialog({ open: false });
    setRestaurantForm({ name: "", address: "", phone: "" });
    setRestaurantFormErrors({});
  };

  const handleSubmitAddRestaurant = async () => {
    if (!validateRestaurantForm()) {
      return;
    }

    try {
      const response = await createRestaurant({
        name: restaurantForm.name,
        address: restaurantForm.address || "",
        phone: restaurantForm.phone || "",
      });
      
      const newRestaurant = response.data;
      const newRestaurantId = newRestaurant.restaurantId || newRestaurant.RestaurantId;
      
      // Refresh restaurants list
      await fetchRestaurants();
      
      // Auto-select the newly created restaurant
      setForm({ ...form, restaurantId: newRestaurantId.toString() });
      
      showSnackbar("Restaurant created successfully and selected", "success");
      handleCloseAddRestaurant();
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.response?.data || "Failed to create restaurant", "error");
    }
  };

  const validateForm = () => {
    const errors = {};
    
    const nameValidation = validateRequired(form.fullName, "Full name");
    if (!nameValidation.valid) {
      errors.fullName = nameValidation.message;
    }

    if (!validateEmail(form.email)) {
      errors.email = "Please enter a valid email address.";
    }

    const emailValidation = validateRequired(form.email, "Email");
    if (!emailValidation.valid) {
      errors.email = emailValidation.message;
    }

    if (!form.userType) {
      errors.userType = "User type is required.";
    }

    if (form.userType === "RestaurantAdmin" && !form.restaurantId) {
      errors.restaurantId = "Restaurant is required for RestaurantAdmin users.";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitEdit = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      await updateUser(editDialog.user.userId, {
        fullName: form.fullName,
        email: form.email,
        phoneNumber: form.phoneNumber || null,
        userType: form.userType,
        restaurantId: form.restaurantId ? parseInt(form.restaurantId) : null,
      });
      showSnackbar("User updated successfully", "success");
      handleCloseEdit();
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.response?.data || "Failed to update user", "error");
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteDialog.user) return;

    // Prevent deleting Admin users
    if (deleteDialog.user.userType === "Admin") {
      showSnackbar("Cannot delete Admin users for security reasons.", "error");
      handleCloseDelete();
      return;
    }

    // Prevent deleting yourself
    const currentUserId = currentUser?.userId || currentUser?.UserId;
    if (deleteDialog.user.userId === currentUserId) {
      showSnackbar("You cannot delete your own account.", "error");
      handleCloseDelete();
      return;
    }

    try {
      await deleteUser(deleteDialog.user.userId);
      showSnackbar("User deleted successfully", "success");
      handleCloseDelete();
      fetchUsers();
    } catch (err) {
      showSnackbar(err.response?.data?.message || err.response?.data || "Failed to delete user", "error");
    }
  };

  return (
    <Layout title="All Users" backPath="/admin-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
          Users ({users.length})
        </Typography>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <People sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }} gutterBottom>
              No users found
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper} sx={{ borderRadius: 2, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
          <Table>
            <TableHead>
              <TableRow sx={{ 
                bgcolor: mode === 'dark' ? "rgba(255, 107, 53, 0.8)" : "primary.main",
                "& .MuiTableCell-root": {
                  color: "white",
                  fontWeight: 600
                }
              }}>
                <TableCell>ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Phone</TableCell>
                <TableCell>Restaurant ID</TableCell>
                <TableCell>Created</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const userId = user.userId || user.UserId;
                const fullName = user.fullName || user.FullName;
                const email = user.email || user.Email;
                const userType = user.userType || user.UserType;
                const phoneNumber = user.phoneNumber || user.PhoneNumber || "N/A";
                const restaurantId = user.restaurantId || user.RestaurantId || "N/A";
                const createdAt = user.createdAt || user.CreatedAt;
                const currentUserId = currentUser?.userId || currentUser?.UserId;
                const isCurrentUser = userId === currentUserId;
                const isAdmin = userType === "Admin";
                
                return (
                  <TableRow key={userId} hover>
                    <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>{userId}</TableCell>
                    <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Person fontSize="small" color="action" />
                        {fullName}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Email fontSize="small" color="action" />
                        {email}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={userType}
                        color={getRoleColor(userType)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Phone fontSize="small" color="action" />
                        {phoneNumber}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      {restaurantId !== "N/A" ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <RestaurantIcon fontSize="small" color="action" />
                          {restaurantId}
                        </Box>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                      {createdAt ? new Date(createdAt).toLocaleDateString() : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEdit(user)}
                          title="Edit User"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(user)}
                          disabled={isAdmin || isCurrentUser}
                          title={isAdmin ? "Cannot delete Admin users" : isCurrentUser ? "Cannot delete your own account" : "Delete User"}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onClose={handleCloseEdit} maxWidth="sm" fullWidth>
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Full Name"
            name="fullName"
            value={form.fullName}
            onChange={handleFormChange}
            error={!!formErrors.fullName}
            helperText={formErrors.fullName}
            required
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleFormChange}
            error={!!formErrors.email}
            helperText={formErrors.email}
            required
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone Number"
            name="phoneNumber"
            value={form.phoneNumber}
            onChange={handleFormChange}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>User Type</InputLabel>
            <Select
              name="userType"
              value={form.userType}
              onChange={handleFormChange}
              label="User Type"
              error={!!formErrors.userType}
            >
              <MenuItem value="Admin">Admin</MenuItem>
              <MenuItem value="RestaurantAdmin">Restaurant Admin</MenuItem>
              <MenuItem value="Customer">Customer</MenuItem>
            </Select>
            {formErrors.userType && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {formErrors.userType}
              </Typography>
            )}
          </FormControl>
          {form.userType === "RestaurantAdmin" && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Restaurant</InputLabel>
              <Select
                name="restaurantId"
                value={form.restaurantId}
                onChange={handleFormChange}
                label="Restaurant"
                error={!!formErrors.restaurantId}
              >
                <MenuItem value="">Select Restaurant</MenuItem>
                {restaurants.map((restaurant) => (
                  <MenuItem key={restaurant.restaurantId || restaurant.RestaurantId} value={restaurant.restaurantId || restaurant.RestaurantId}>
                    {restaurant.name || restaurant.Name}
                  </MenuItem>
                ))}
                <MenuItem value="add_new" sx={{ color: "primary.main", fontWeight: 600 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <RestaurantIcon fontSize="small" />
                    + Add New Restaurant
                  </Box>
                </MenuItem>
              </Select>
              {formErrors.restaurantId && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  {formErrors.restaurantId}
                </Typography>
              )}
            </FormControl>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button onClick={handleSubmitEdit} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Restaurant Dialog */}
      <Dialog open={addRestaurantDialog.open} onClose={handleCloseAddRestaurant} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Restaurant</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Restaurant Name"
            name="name"
            value={restaurantForm.name}
            onChange={handleRestaurantFormChange}
            error={!!restaurantFormErrors.name}
            helperText={restaurantFormErrors.name}
            required
            sx={{ mb: 2, mt: 1 }}
            autoFocus
          />
          <TextField
            fullWidth
            label="Address"
            name="address"
            value={restaurantForm.address}
            onChange={handleRestaurantFormChange}
            multiline
            rows={2}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            label="Phone"
            name="phone"
            value={restaurantForm.phone}
            onChange={handleRestaurantFormChange}
            sx={{ mb: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddRestaurant}>Cancel</Button>
          <Button onClick={handleSubmitAddRestaurant} variant="contained">
            Create Restaurant
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onClose={handleCloseDelete}>
        <DialogTitle>Delete User</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete user <strong>{deleteDialog.user?.fullName}</strong> ({deleteDialog.user?.email})?
          </Typography>
          {deleteDialog.user?.userType === "Admin" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Cannot delete Admin users for security reasons.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDelete}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            disabled={deleteDialog.user?.userType === "Admin"}
          >
            Delete
          </Button>
        </DialogActions>
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

export default AdminUsers;
