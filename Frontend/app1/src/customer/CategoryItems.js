import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  TextField,
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  Restaurant,
  LocationOn,
  ShoppingCart,
  Search,
  Clear,
  ArrowBack,
} from "@mui/icons-material";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { getMealsByCategory } from "../services/CustomerService";
import api from "../api/axiosConfig";

const CategoryItems = () => {
  const { category } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [meals, setMeals] = useState([]);
  const [filteredMeals, setFilteredMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);

  useEffect(() => {
    if (category) {
      fetchMealsByCategory();
    }
  }, [category]);

  useEffect(() => {
    // Filter meals by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const filtered = meals.filter(
        (meal) =>
          (meal.name || "").toLowerCase().includes(term) ||
          (meal.description || "").toLowerCase().includes(term) ||
          (meal.restaurantName || "").toLowerCase().includes(term)
      );
      setFilteredMeals(filtered);
    } else {
      setFilteredMeals(meals);
    }
  }, [searchTerm, meals]);

  const fetchMealsByCategory = async () => {
    try {
      setLoading(true);
      const response = await getMealsByCategory(category);
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
        restaurantId: meal.restaurantId || meal.RestaurantId,
        restaurantName: meal.restaurantName || meal.RestaurantName || "Restaurant",
        restaurantAddress: meal.restaurantAddress || meal.RestaurantAddress || "",
      }));
      
      setMeals(normalizedMeals);
      setFilteredMeals(normalizedMeals);
    } catch (err) {
      console.error("Error fetching meals by category:", err);
      showSnackbar("Failed to load items: " + (err.response?.data || err.message), "error");
      setMeals([]);
      setFilteredMeals([]);
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

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleAddToCart = (meal) => {
    if (!meal.isAvailable) {
      showSnackbar("This item is currently unavailable", "warning");
      return;
    }

    // Check if user is logged in
    if (!user) {
      setSelectedMeal(meal);
      setLoginDialogOpen(true);
      return;
    }

    // Check if user is a customer
    const userRole = user.role || user.userType;
    if (userRole !== "Customer") {
      showSnackbar("Please login as a customer to add items to cart", "warning");
      return;
    }

    // Add to cart - navigate to restaurant page to add item
    // Store the meal info in localStorage to add it after navigation
    localStorage.setItem("pendingCartItem", JSON.stringify({
      mealId: meal.mealId,
      name: meal.name,
      price: meal.price,
      restaurantId: meal.restaurantId,
    }));
    
    showSnackbar(`Redirecting to ${meal.restaurantName} to add item to cart...`, "info");
    navigate(`/customer-restaurant/${meal.restaurantId}`);
  };

  const handleLoginConfirm = () => {
    setLoginDialogOpen(false);
    // Store return URL and selected meal
    const returnUrl = `/category-items/${encodeURIComponent(category)}`;
    localStorage.setItem("returnUrl", returnUrl);
    if (selectedMeal) {
      localStorage.setItem("pendingCartItem", JSON.stringify({
        mealId: selectedMeal.mealId,
        name: selectedMeal.name,
        price: selectedMeal.price,
        restaurantId: selectedMeal.restaurantId,
      }));
    }
    navigate("/customer-login");
  };

  const handleViewRestaurant = (restaurantId) => {
    navigate(`/customer-restaurant/${restaurantId}`);
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: mode === 'dark' ? "#0a0a0a" : "#f5f5f5", py: 4 }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ mb: 4, display: "flex", alignItems: "center", gap: 2 }}>
          <IconButton
            onClick={() => navigate("/")}
            sx={{
              color: mode === 'dark' ? "white" : "#1a1a1a",
              "&:hover": {
                bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
              },
            }}
          >
            <ArrowBack />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 300,
                color: mode === 'dark' ? "white" : "#1a1a1a",
                letterSpacing: "0.05em",
                fontFamily: "'Playfair Display', 'Georgia', serif",
              }}
            >
              {category} Items
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                mt: 1,
                fontWeight: 300,
              }}
            >
              Browse {category} items from all restaurants
            </Typography>
          </Box>
        </Box>

        {/* Search Bar */}
        <Box sx={{ mb: 4 }}>
          <TextField
            fullWidth
            placeholder="Search items by name, description, or restaurant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "4px",
                bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                "&:hover": {
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                },
                "&.Mui-focused": {
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
                },
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }} />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setSearchTerm("")}
                    sx={{
                      color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                    }}
                  >
                    <Clear />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Box>

        {/* Loading State */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : filteredMeals.length === 0 ? (
          <Card
            sx={{
              bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
              border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
            }}
          >
            <CardContent sx={{ textAlign: "center", py: 8 }}>
              <Restaurant sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
              <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                {searchTerm
                  ? `No ${category} items found matching "${searchTerm}"`
                  : `No ${category} items available at the moment`}
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <Typography
              variant="body2"
              sx={{
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                mb: 3,
                fontWeight: 300,
              }}
            >
              Found {filteredMeals.length} {filteredMeals.length === 1 ? "item" : "items"}
            </Typography>

            <Grid container spacing={3}>
              {filteredMeals.map((meal) => {
                const imageUrl = getImageUrl(meal.imageUrl);
                return (
                  <Grid item xs={12} sm={6} md={4} key={`${meal.restaurantId}-${meal.mealId}`}>
                    <Card
                      sx={{
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        borderRadius: "4px",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                        border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                        bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(20px)",
                        "&:hover": {
                          transform: "translateY(-8px) scale(1.02)",
                          boxShadow: mode === 'dark' ? "0 16px 48px rgba(0, 0, 0, 0.5)" : "0 16px 48px rgba(0, 0, 0, 0.12)",
                          border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                        },
                      }}
                    >
                      {imageUrl && (
                        <CardMedia
                          component="img"
                          height="200"
                          image={imageUrl}
                          alt={meal.name}
                          sx={{
                            objectFit: "cover",
                            bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                          }}
                        />
                      )}
                      <CardContent sx={{ flexGrow: 1, display: "flex", flexDirection: "column" }}>
                        <Box sx={{ mb: 2 }}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 300,
                                color: mode === 'dark' ? "white" : "#1a1a1a",
                                flex: 1,
                              }}
                            >
                              {meal.name}
                            </Typography>
                            {meal.isBestItem && (
                              <Chip
                                label="Best"
                                size="small"
                                sx={{
                                  bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.08)",
                                  color: mode === 'dark' ? "white" : "#1a1a1a",
                                  fontWeight: 300,
                                  borderRadius: "2px",
                                }}
                              />
                            )}
                          </Box>
                          {meal.description && (
                            <Typography
                              variant="body2"
                              sx={{
                                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                                mb: 1,
                                fontWeight: 300,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {meal.description}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Restaurant fontSize="small" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }} />
                            <Typography
                              variant="body2"
                              sx={{
                                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                                fontWeight: 300,
                                cursor: "pointer",
                                "&:hover": {
                                  textDecoration: "underline",
                                },
                              }}
                              onClick={() => handleViewRestaurant(meal.restaurantId)}
                            >
                              {meal.restaurantName}
                            </Typography>
                          </Box>
                          {meal.restaurantAddress && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                              <LocationOn fontSize="small" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }} />
                              <Typography
                                variant="caption"
                                sx={{
                                  color: mode === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)",
                                  fontWeight: 300,
                                }}
                              >
                                {meal.restaurantAddress.length > 40
                                  ? `${meal.restaurantAddress.substring(0, 40)}...`
                                  : meal.restaurantAddress}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <Box sx={{ mt: "auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 300,
                              color: mode === 'dark' ? "white" : "#1a1a1a",
                            }}
                          >
                            ₹{meal.price?.toFixed(2) || "0.00"}
                          </Typography>
                          <Button
                            variant="contained"
                            startIcon={<ShoppingCart />}
                            onClick={() => handleAddToCart(meal)}
                            disabled={!meal.isAvailable}
                            sx={{
                              bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                              color: mode === 'dark' ? "white" : "#1a1a1a",
                              borderRadius: "4px",
                              textTransform: "uppercase",
                              fontWeight: 300,
                              letterSpacing: "0.1em",
                              border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              "&:hover": {
                                bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                                transform: "translateY(-2px)",
                                border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                              },
                              "&:disabled": {
                                bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                                color: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
                              },
                            }}
                          >
                            {meal.isAvailable ? "Add to Cart" : "Unavailable"}
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          </>
        )}

        {/* Login Dialog */}
        <Dialog
          open={loginDialogOpen}
          onClose={() => setLoginDialogOpen(false)}
          PaperProps={{
            sx: {
              bgcolor: mode === 'dark' ? "#1a1a1a" : "#ffffff",
              color: mode === 'dark' ? "white" : "#1a1a1a",
              border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 300, letterSpacing: "0.05em" }}>
            Login Required
          </DialogTitle>
          <DialogContent>
            <Typography sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
              Please login to add items to your cart and place orders.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button
              onClick={() => setLoginDialogOpen(false)}
              sx={{
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleLoginConfirm}
              variant="contained"
              sx={{
                bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                color: mode === 'dark' ? "white" : "#1a1a1a",
                fontWeight: 300,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                "&:hover": {
                  bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                },
              }}
            >
              Login
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
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
      </Container>
    </Box>
  );
};

export default CategoryItems;

