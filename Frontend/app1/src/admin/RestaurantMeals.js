import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {  Box,  Button,  Card,  CardContent,  Typography,  TextField,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  Grid,  Chip,  CircularProgress,  Snackbar,  Alert,  FormControlLabel,  Checkbox,  InputAdornment,  IconButton,  FormControl,  InputLabel,  Select,  MenuItem,  Slider,  Collapse,  Paper,} from "@mui/material";
import {  Add,  Edit,  Delete,  RestaurantMenu,  Star,  Image as ImageIcon,  CloudUpload,  Search,  Clear,  FilterList,  ExpandMore,  ExpandLess,} from "@mui/icons-material";
import {  getMeals,  createMeal,  updateMeal,  deleteMeal,} from "../services/MealService";
import { uploadImage } from "../services/FileUploadService";
import Layout from "../shared/components/Layout";
import api from "../api/axiosConfig";
import { validateRequired, validatePrice } from "../utils/validation";
import signalRService from "../services/signalRService";

const RestaurantMeals = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [sortBy, setSortBy] = useState("default");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMeal, setEditingMeal] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    isAvailable: true,
    isBestItem: false,
    imageUrl: "",
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const restaurantId = user?.restaurantId;

  const navLinks = [
    { path: "/restaurant-dashboard", label: "Dashboard" },
    { path: "/restaurant-tables", label: "Tables" },
    { path: "/restaurant-meals", label: "Meals" },
    { path: "/restaurant-orders", label: "Orders" },
    { path: "/restaurant-reservations", label: "Reservations" },
  ];

  useEffect(() => {
    if (restaurantId) {
      fetchMeals();
      
      // Setup SignalR for menu update notifications
      const setupSignalR = async () => {
        const userId = user?.userId || user?.UserId;
        const userRole = user?.role || user?.userType || user?.UserType;
        
        if (userId && userRole === "RestaurantAdmin" && restaurantId) {
          try {
            await signalRService.startConnection(userId, userRole, restaurantId);
            
            // Wait a bit for connection to be fully established
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Listen for menu updates from admin
            const menuUpdateHandler = (data) => {
              console.log("MenuUpdated received:", data);
              showSnackbar(
                data.message || `Menu item "${data.mealName || 'Unknown'}" has been ${data.action || 'updated'} by Admin.`,
                data.action === "Disabled" ? "warning" : "info"
              );
              fetchMeals(); // Refresh meals to reflect changes
            };
            
            // Listen for admin notifications
            const adminNotificationHandler = (data) => {
              console.log("AdminNotification received:", data);
              showSnackbar(
                data.message || "You have a notification from Admin.",
                data.type === "error" ? "error" : data.type === "warning" ? "warning" : "info"
              );
            };
            
            signalRService.on("MenuUpdated", menuUpdateHandler);
            signalRService.on("AdminNotification", adminNotificationHandler);
            
            // Return handlers for cleanup
            return { menuUpdateHandler, adminNotificationHandler };
          } catch (error) {
            console.error("Failed to setup SignalR:", error);
          }
        }
        return null;
      };
      
      let handlers = null;
      setupSignalR().then(h => {
        handlers = h;
      });
      
      // Cleanup on unmount
      return () => {
        if (handlers) {
          signalRService.off("MenuUpdated", handlers.menuUpdateHandler);
          signalRService.off("AdminNotification", handlers.adminNotificationHandler);
        } else {
          signalRService.off("MenuUpdated");
          signalRService.off("AdminNotification");
        }
      };
    } else {
      setLoading(false);
    }
  }, [restaurantId, user]);

  const fetchMeals = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
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
        restaurantId: meal.restaurantId || meal.RestaurantId
      }));
      
      setMeals(normalizedMeals);
      
      // Initialize price range
      if (normalizedMeals.length > 0) {
        const maxPrice = Math.max(...normalizedMeals.map(m => m.price || 0), 10000);
        setPriceRange([0, maxPrice]);
      }
    } catch (err) {
      console.error("Error fetching meals:", err);
      showSnackbar("Failed to load meals: " + (err.response?.data || err.message), "error");
      setMeals([]);
    } finally {
      setLoading(false);
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

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === "checkbox") {
      setForm({ ...form, [name]: checked });
    } else {
      setForm({ ...form, [name]: value });
    }
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showSnackbar("Please select an image file", "error");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      showSnackbar("Image size must be less than 5MB", "error");
      return;
    }

    setImageFile(file);
    setUploadingImage(true);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    try {
      const response = await uploadImage(file);
      if (response.data?.imageUrl) {
        const uploadedImageUrl = response.data.imageUrl;
        setForm({ ...form, imageUrl: uploadedImageUrl });
        // Update preview to use the server URL instead of FileReader result
        const fullImageUrl = getImageUrl(uploadedImageUrl);
        setImagePreview(fullImageUrl);
        console.log("Image uploaded. URL:", uploadedImageUrl, "Full URL:", fullImageUrl);
        showSnackbar("Image uploaded successfully", "success");
      }
    } catch (err) {
      console.error("Upload error:", err);
      showSnackbar(err.response?.data || "Failed to upload image", "error");
      setImageFile(null);
      setImagePreview("");
    } finally {
      setUploadingImage(false);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith("http")) return imageUrl;
    // Construct full URL from base API URL
    // baseURL is "https://localhost:44300/api", so we need to remove "/api" and add the image path
    let baseUrl = api.defaults.baseURL.replace("/api", "");
    // For development, try both HTTP and HTTPS
    // If baseUrl is HTTPS, also try HTTP version
    if (baseUrl.startsWith("https://")) {
      // Keep HTTPS for now, but we can fallback to HTTP if needed
      baseUrl = baseUrl;
    }
    // Ensure imageUrl starts with /
    const imagePath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;
    const fullUrl = `${baseUrl}${imagePath}`;
    return fullUrl;
  };

  const handleAdd = () => {
    setForm({ name: "", description: "", price: "", category: "", isAvailable: true, isBestItem: false, imageUrl: "" });
    setImageFile(null);
    setImagePreview("");
    setEditingMeal(null);
    setShowForm(true);
  };

  const handleEdit = (mealName) => {
    const meal = meals.find(m => (m.name || m.Name) === mealName);
    if (!meal) {
      showSnackbar("Meal not found", "error");
      return;
    }
    const normalizedMeal = {
      mealId: meal.mealId || meal.MealId,
      name: meal.name || meal.Name,
      description: meal.description || meal.Description || "",
      price: meal.price || meal.Price,
      category: meal.category || meal.Category || "",
      imageUrl: meal.imageUrl || meal.ImageUrl || "",
      isAvailable: meal.isAvailable !== undefined ? meal.isAvailable : meal.IsAvailable,
      isBestItem: meal.isBestItem !== undefined ? meal.isBestItem : meal.IsBestItem,
    };
    setForm({
      name: normalizedMeal.name,
      description: normalizedMeal.description,
      price: normalizedMeal.price.toString(),
      category: normalizedMeal.category,
      imageUrl: normalizedMeal.imageUrl,
      isAvailable: normalizedMeal.isAvailable,
      isBestItem: normalizedMeal.isBestItem,
    });
    setImagePreview(normalizedMeal.imageUrl ? getImageUrl(normalizedMeal.imageUrl) : "");
    setImageFile(null);
    setEditingMeal(normalizedMeal);
    setShowForm(true);
  };

  const handleDelete = async (mealName) => {
    if (!window.confirm(`Are you sure you want to delete meal ${mealName}?`)) {
      return;
    }

    try {
      const meal = meals.find(m => (m.name || m.Name) === mealName);
      if (!meal) {
        showSnackbar("Meal not found", "error");
        return;
      }
      const mealId = meal.mealId || meal.MealId;
      await deleteMeal(mealId, restaurantId);
      showSnackbar("Meal deleted successfully", "success");
      fetchMeals();
    } catch (err) {
      showSnackbar(err.response?.data || "Failed to delete meal", "error");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const nameValidation = validateRequired(form.name, "Meal name");
    if (!nameValidation.valid) {
      newErrors.name = nameValidation.message;
    }

    const priceValidation = validatePrice(form.price);
    if (!priceValidation.valid) {
      newErrors.price = priceValidation.message;
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
      if (editingMeal) {
        await updateMeal(editingMeal.mealId, restaurantId, {
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          category: form.category,
          imageUrl: form.imageUrl,
          isAvailable: form.isAvailable,
          isBestItem: form.isBestItem,
        });
        showSnackbar("Meal updated successfully", "success");
      } else {
        await createMeal(restaurantId, {
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          category: form.category,
          imageUrl: form.imageUrl,
          isAvailable: form.isAvailable,
          isBestItem: form.isBestItem,
        });
        showSnackbar("Meal added successfully", "success");
      }
      setShowForm(false);
      setEditingMeal(null);
      setForm({ name: "", description: "", price: "", category: "", isAvailable: true, isBestItem: false, imageUrl: "" });
      setImageFile(null);
      setImagePreview("");
      setFormErrors({});
      fetchMeals();
    } catch (err) {
      showSnackbar(err.response?.data || "Failed to save meal", "error");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMeal(null);
    setForm({ name: "", description: "", price: "", category: "", isAvailable: true, isBestItem: false, imageUrl: "" });
    setImageFile(null);
    setImagePreview("");
    setFormErrors({});
  };

  if (!restaurantId) {
    return (
      <Layout title="Restaurant Admin Dashboard" navLinks={navLinks}>
        <Alert severity="warning">
          No restaurant associated with your account. Please contact admin.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Manage Meals" backPath="/restaurant-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Your Meals ({filteredMeals.length} of {meals.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleAdd}
            sx={{ borderRadius: 2 }}
          >
            Add New Meal
          </Button>
        </Box>

        <Box sx={{ mb: 2 }}>
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
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : meals.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <RestaurantMenu sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
              No meals found
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", mb: 3, fontWeight: 300 }}>
              Add your first meal to get started
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
              Add Meal
            </Button>
          </CardContent>
        </Card>
      ) : filteredMeals.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <RestaurantMenu sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
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
                        console.log("Meal image loaded:", name, fullImageUrl);
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
                      <ImageIcon sx={{ fontSize: 60, color: "grey.400" }} />
                    </Box>
                  )}
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
                        {!fullImageUrl && <RestaurantMenu color="primary" />}
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {name}
                        </Typography>
                        {isBestItem && (
                          <Star sx={{ color: "warning.main", fontSize: 20 }} />
                        )}
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
                      <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", mb: 2, fontWeight: 300 }}>
                        {description}
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
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
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={showForm} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingMeal ? "Edit Meal" : "Add New Meal"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Meal Name"
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
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Price"
              name="price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={handleChange}
              min="0"
              required
              error={!!formErrors.price}
              helperText={formErrors.price}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Category"
              name="category"
              value={form.category}
              onChange={handleChange}
              sx={{ mb: 2 }}
            />
            <Box sx={{ mb: 2 }}>
              <input
                accept="image/*"
                style={{ display: "none" }}
                id="image-upload"
                type="file"
                onChange={handleImageChange}
                disabled={uploadingImage}
              />
              <label htmlFor="image-upload">
                <Button
                  variant="outlined"
                  component="span"
                  fullWidth
                  startIcon={uploadingImage ? <CircularProgress size={20} /> : <CloudUpload />}
                  disabled={uploadingImage}
                  sx={{ mb: 1 }}
                >
                  {uploadingImage ? "Uploading..." : "Upload Image"}
                </Button>
              </label>
              {(imagePreview || form.imageUrl) && (
                <Box sx={{ mt: 2, textAlign: "center" }}>
                  <Box
                    component="img"
                    src={imagePreview || (form.imageUrl ? getImageUrl(form.imageUrl) : null)}
                    alt="Preview"
                    sx={{
                      maxWidth: "100%",
                      maxHeight: 200,
                      borderRadius: 2,
                      objectFit: "cover",
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: "grey.50",
                    }}
                    onLoad={() => {
                      console.log("Image loaded successfully:", imagePreview || getImageUrl(form.imageUrl));
                    }}
                    onError={(e) => {
                      console.error("Image load error. Attempted URL:", e.target.src);
                      // Try to show a placeholder
                      if (!e.target.src.includes("data:image")) {
                        e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='200'%3E%3Crect fill='%23f0f0f0' width='400' height='200'/%3E%3Ctext fill='%23999' font-family='sans-serif' font-size='16' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3EImage not found%3C/text%3E%3C/svg%3E";
                      }
                    }}
                  />
                  {form.imageUrl && (
                    <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", display: "block", mt: 1, wordBreak: "break-all", fontWeight: 300 }}>
                      Image URL: {form.imageUrl}
                    </Typography>
                  )}
                </Box>
              )}
            </Box>
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isAvailable}
                  onChange={handleChange}
                  name="isAvailable"
                />
              }
              label="Available"
              sx={{ mb: 1 }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.isBestItem}
                  onChange={handleChange}
                  name="isBestItem"
                />
              }
              label="Best Item"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingMeal ? "Update" : "Add"} Meal
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

export default RestaurantMeals;
