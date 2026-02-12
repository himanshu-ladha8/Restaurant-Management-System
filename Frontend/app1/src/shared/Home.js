import { useState, useEffect, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import {   Box,   Container,   Typography,   Button,   Grid,   Card,   CardContent,   TextField,   InputAdornment,   IconButton,  Chip,  AppBar,  Toolbar,  Avatar,  Paper,  CircularProgress,  Snackbar,  Alert,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  List,  ListItem,  ListItemButton,  ListItemText,} from "@mui/material";
import {   Restaurant,   QrCode,   Search,   LocationOn,   ShoppingCart,   LocalDining,  ArrowForward,  Person,  AdminPanelSettings,  Star,  AccessTime,  Phone,  Close,} from "@mui/icons-material";
import { Rating } from "@mui/material";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { getRestaurants } from "../services/CustomerService";
import { getAverageRating } from "../services/ReviewService";
import ThemeToggle from "./components/ThemeToggle";

// Food category icons data
const foodCategories = [
  { name: "Italian", icon: ""},
  { name: "Roti", icon: "🫓" },
  { name: "Paneer", icon: "🧀" },
  { name: "Kofta", icon: "🍛" },
  { name: "Rice", icon: "🍚" },
  { name: "Biryani", icon: "🍛" },
  { name: "Dal", icon: "🥘" },
  { name: "Veg Sabji", icon: "🥗" },
  { name: "Naan", icon: "🫓" },
  { name: "Paratha", icon: "🫓" },
  { name: "Pulav", icon: "🍚" },
  { name: "Khichdi", icon: "🍲" },
  { name: "Rajma", icon: "🫘" },
  { name: "Chole", icon: "🫘" },
  { name: "Punjabi Strater", icon: "🥗" },
  { name: "Chinese Starter & Noodles", icon: "🥗" },
  { name: "Rigan olo", icon: "🍆" },
  { name: "Desserts", icon: "🍰" },
  { name: "Simulating Appetizer", icon: "🥤" },
];

const Home = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [location, setLocation] = useState("Select Location");
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  
  // Popular cities list
  const popularCities = [
    "Mumbai", "Delhi", "Bangalore", "Hyderabad", "Chennai", 
    "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Surat",
    "Indore", "Nadiad"
  ];

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await getRestaurants();
      const restaurantsData = response.data || [];
      
      // Fetch average ratings for each restaurant
      const restaurantsWithRatings = await Promise.all(
        restaurantsData.map(async (restaurant) => {
          const restaurantId = restaurant.restaurantId || restaurant.RestaurantId;
          let averageRating = 0;
          let totalReviews = 0;
          
          try {
            const ratingResponse = await getAverageRating(restaurantId);
            averageRating = ratingResponse.data?.averageRating || 0;
            totalReviews = ratingResponse.data?.totalReviews || 0;
          } catch (err) {
            // If rating fetch fails, use default values
            console.log(`Could not fetch rating for restaurant ${restaurantId}`);
          }
          
          return {
            restaurantId: restaurantId,
            name: restaurant.name || restaurant.Name,
            address: restaurant.address || restaurant.Address || "",
            phone: restaurant.phone || restaurant.Phone || "",
            openTime: restaurant.openTime || restaurant.OpenTime,
            closeTime: restaurant.closeTime || restaurant.CloseTime,
            averageRating: averageRating,
            totalReviews: totalReviews,
          };
        })
      );
      
      setRestaurants(restaurantsWithRatings);
      setFilteredRestaurants(restaurantsWithRatings.slice(0, 5)); // Show first 5 restaurants
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      setRestaurants([]);
      setFilteredRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    
    if (searchTerm.trim()) {
      params.append("search", searchTerm.trim());
    }
    
    if (location && location !== "Select Location") {
      params.append("location", location);
    }
    
    const queryString = params.toString();
    navigate(`/customer-restaurants${queryString ? `?${queryString}` : ""}`);
  };

  const handleCategoryClick = (category) => {
    navigate(`/category-items/${encodeURIComponent(category)}`);
  };

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: mode === 'dark' ? "#0a0a0a" : "#f5f5f5" }}>
      {/* Header */}
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          background: mode === 'dark' ? '#1a1a1a' : '#ffffff',
          boxShadow: 'none',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          py: 1,
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between", px: { xs: 1, sm: 2 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, cursor: "pointer" }} onClick={() => navigate("/")}>
              <Box
                component="img"
                src="/RestoFlow_logo.png"
                alt="RestoFlow Logo"
                sx={{
                  height: { xs: 40, sm: 50 },
                  width: "auto",
                  objectFit: "contain",
                }}
              />
            </Box>
            <Box sx={{ display: "flex", gap: { xs: 1, sm: 3 }, alignItems: "center" }}>
              <ThemeToggle />
              <Button
                component={Link}
                to="/customer-restaurants"
                sx={{ 
                  color: mode === 'dark' ? "white" : "#1a1a1a", 
                  fontWeight: 300, 
                  fontSize: { xs: "0.75rem", sm: "0.875rem" }, 
                  px: { xs: 1.5, sm: 2.5 },
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  transition: 'all 0.3s',
                  '&:hover': {
                    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                  },
                }}
              >
                Restaurants
              </Button>
              {user ? (
                <>
                  <Button
                    color="inherit"
                    onClick={() => {
                      const userRole = user.role || user.userType;
                      if (userRole === "Customer") {
                        navigate("/customer-dashboard");
                      } else if (userRole === "RestaurantAdmin") {
                        navigate("/restaurant-dashboard");
                      } else if (userRole === "Admin") {
                        navigate("/admin-dashboard");
                      }
                    }}
                    sx={{ 
                      color: mode === 'dark' ? "white" : "#1a1a1a", 
                      fontWeight: 300, 
                      fontSize: { xs: "0.75rem", sm: "0.875rem" }, 
                      px: { xs: 1.5, sm: 2.5 },
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      transition: 'all 0.3s',
                      '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    Dashboard
                  </Button>
                  <Avatar sx={{ bgcolor: mode === 'dark' ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)", width: { xs: 32, sm: 40 }, height: { xs: 32, sm: 40 } }}>
                    {user.fullName?.[0] || user.FullName?.[0] || "U"}
                  </Avatar>
                </>
              ) : (
                <>
                  <Button
                    component={Link}
                    to="/customer-login"
                    sx={{ 
                      color: mode === 'dark' ? "white" : "#1a1a1a", 
                      fontWeight: 300, 
                      fontSize: { xs: "0.75rem", sm: "0.875rem" }, 
                      px: { xs: 1.5, sm: 2.5 },
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      transition: 'all 0.3s',
                      '&:hover': {
                        backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                      },
                    }}
                  >
                    Sign In
                  </Button>
                  <Button
                    component={Link}
                    to="/customer-register"
                    variant="outlined"
                    sx={{
                      borderColor: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.23)",
                      borderWidth: 1,
                      color: mode === 'dark' ? "white" : "#1a1a1a",
                      fontSize: { xs: "0.75rem", sm: "0.875rem" },
                      px: { xs: 1.5, sm: 2.5 },
                      fontWeight: 300,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      transition: 'all 0.3s',
                      "&:hover": { 
                        borderColor: mode === 'dark' ? "white" : "#1a1a1a", 
                        borderWidth: 1,
                        bgcolor: mode === 'dark' ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.04)",
                      },
                    }}
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </Box>
          </Toolbar>
        </Container>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          position: "relative",
          minHeight: { xs: "70vh", md: "85vh" },
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          backgroundImage: mode === 'dark' 
            ? "linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 100%), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')"
            : "linear-gradient(135deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.5) 100%), url('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          "&::before": {
            content: '""',
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: mode === 'dark' ? "rgba(0, 0, 0, 0.5)" : "rgba(255, 255, 255, 0.3)",
            zIndex: 1,
          },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 2 }}>
          <Box sx={{ 
            textAlign: "center", 
            mb: 5,
            animation: 'fadeInUp 0.8s ease-out',
            '@keyframes fadeInUp': {
              from: { opacity: 0, transform: 'translateY(30px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            }
          }}>
            <Typography
              variant="h6"
              sx={{
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
                fontWeight: 300,
                mb: 3,
                fontSize: { xs: "0.875rem", sm: "1rem" },
                textTransform: "uppercase",
                letterSpacing: "0.2em",
                textShadow: mode === 'dark' ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(255, 255, 255, 0.5)",
              }}
            >
              THE ULTIMATE DINING EXPERIENCE
            </Typography>
            <Typography
              variant="h1"
              sx={{
                color: mode === 'dark' ? "white" : "#1a1a1a",
                fontWeight: 300,
                mb: 4,
                fontSize: { xs: "2.5rem", sm: "3.5rem", md: "4.5rem", lg: "5.5rem" },
                textShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.5)" : "0 4px 20px rgba(255, 255, 255, 0.8)",
                lineHeight: 1.1,
                letterSpacing: "0.02em",
                fontFamily: "'Playfair Display', 'Georgia', serif",
              }}
            >
              TURN EVERY MEAL INTO AN EVERLASTING MEMORY
            </Typography>
          </Box>

          {/* Search Bar */}
          <Paper
            elevation={6}
            sx={{
              p: 0,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              borderRadius: "4px",
              overflow: "hidden",
              maxWidth: 800,
              mx: "auto",
              bgcolor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              boxShadow: "0 16px 48px rgba(0, 0, 0, 0.3), 0 4px 16px rgba(0, 0, 0, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              "&:hover": {
                boxShadow: "0 24px 64px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(0, 0, 0, 0.3)",
                transform: "translateY(-4px) scale(1.01)",
                bgcolor: "rgba(255, 255, 255, 1)",
              },
            }}
          >
            <Box
              onClick={() => setLocationDialogOpen(true)}
              sx={{
                display: "flex",
                alignItems: "center",
                px: { xs: 1.5, sm: 2 },
                py: { xs: 1, sm: 0 },
                bgcolor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRight: { xs: "none", sm: "1px solid rgba(255, 255, 255, 0.5)" },
                borderBottom: { xs: "1px solid rgba(255, 255, 255, 0.5)", sm: "none" },
                minWidth: { xs: "100%", sm: 200 },
                cursor: "pointer",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:hover": {
                  bgcolor: "rgba(255, 255, 255, 0.95)",
                  transform: "scale(1.02)",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                },
              }}
            >
              <LocationOn sx={{ color: "#1a1a1a", mr: 1, fontSize: { xs: 20, sm: 24 } }} />
              <Typography variant="body2" sx={{ color: "#1a1a1a", flex: 1, fontSize: { xs: "0.75rem", sm: "0.875rem" }, fontWeight: 400 }}>
                {location}
              </Typography>
            </Box>
            <TextField
              placeholder="Search for restaurant, item or more"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              fullWidth
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 0,
                  fontSize: { xs: "0.875rem", sm: "1rem" },
                  transition: "all 0.3s",
                  "&:hover": {
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                  },
                  "&.Mui-focused": {
                    boxShadow: "0 4px 12px rgba(255, 107, 53, 0.2)",
                  },
                },
              }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={(e) => {
                        e.preventDefault();
                        handleSearch();
                      }} 
                      sx={{ color: "#1a1a1a" }}
                      aria-label="search"
                    >
                      <Search />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Paper>
        </Container>
      </Box>

      {/* Service Cards Section */}
      <Box sx={{ bgcolor: mode === 'dark' ? "#0a0a0a" : "#f5f5f5", py: { xs: 8, sm: 10 }, px: { xs: 2, sm: 3 } }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 300,
                mb: 2,
                fontSize: { xs: "1.75rem", md: "2.5rem" },
                color: mode === 'dark' ? "white" : "#1a1a1a",
                letterSpacing: "0.05em",
                fontFamily: "'Playfair Display', 'Georgia', serif",
              }}
            >
              How It Works
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                fontSize: { xs: "1rem", md: "1.125rem" },
                maxWidth: "600px",
                mx: "auto",
                fontWeight: 300,
              }}
            >
              Choose from our convenient ordering options
            </Typography>
          </Box>
        <Grid container spacing={{ xs: 3, sm: 4, md: 4 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: "100%",
                borderRadius: "4px",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px)",
                "&:hover": {
                  transform: "translateY(-10px)",
                  boxShadow: mode === 'dark' ? "0 16px 48px rgba(0, 0, 0, 0.5)" : "0 16px 48px rgba(0, 0, 0, 0.12)",
                  border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                },
              }}
              onClick={() => navigate("/customer-restaurants", { state: { fromHome: true } })}
            >
              <CardContent sx={{ p: { xs: 3, sm: 4 }, position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 300, mb: 0.5, color: mode === 'dark' ? "white" : "#1a1a1a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      QR MENU
                    </Typography>
                    <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)", fontWeight: 300 }}>
                      SCAN & ORDER
                    </Typography>
                  </Box>
                  <Chip 
                    label="UPTO 60% OFF" 
                    size="small" 
                    sx={{ 
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.08)", 
                      color: mode === 'dark' ? "white" : "#1a1a1a", 
                      fontWeight: 300,
                      borderRadius: "2px",
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                    }} 
                  />
                </Box>
                <Box
                  sx={{
                    height: { xs: 150, sm: 180, md: 200 },
                    background: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "scale(1.05) translateY(-2px)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    },
                  }}
                >
                  <QrCode sx={{ fontSize: { xs: 60, sm: 80, md: 100 }, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }} />
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  endIcon={<ArrowForward />}
                  sx={{
                    bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    py: 1.5,
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": { 
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                      transform: "translateY(-2px)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  Order Now
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card
              sx={{
                height: "100%",
                borderRadius: "4px",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
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
              onClick={() => navigate("/customer-restaurants", { state: { fromHome: true } })}
            >
              <CardContent sx={{ p: { xs: 2, sm: 3, md: 4 }, position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 300, mb: 0.5, color: mode === 'dark' ? "white" : "#1a1a1a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      RESTAURANT DISCOVERY
                    </Typography>
                    <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)", fontWeight: 300 }}>
                      BROWSE & ORDER
                    </Typography>
                  </Box>
                  <Chip 
                    label="UPTO 60% OFF" 
                    size="small" 
                    sx={{ 
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.08)", 
                      color: mode === 'dark' ? "white" : "#1a1a1a", 
                      fontWeight: 300,
                      borderRadius: "2px",
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                    }} 
                  />
                </Box>
                <Box
                  sx={{
                    height: 200,
                    background: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "scale(1.05) translateY(-2px)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    },
                  }}
                >
                  <LocalDining sx={{ fontSize: 100, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }} />
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  endIcon={<ArrowForward />}
                  sx={{
                    bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    py: 1.5,
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": { 
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                      transform: "translateY(-2px)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  Explore Restaurants
                </Button>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card
              sx={{
                height: "100%",
                borderRadius: "4px",
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
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
              onClick={() => {
                if (user) {
                  navigate("/customer-orders", { state: { fromHome: true } });
                } else {
                  localStorage.setItem("returnUrl", "/customer-orders");
                  localStorage.setItem("fromHome", "true");
                  navigate("/customer-login");
                }
              }}
            >
              <CardContent sx={{ p: 4, position: "relative", zIndex: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 300, mb: 0.5, color: mode === 'dark' ? "white" : "#1a1a1a", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                      ORDER TRACKING
                    </Typography>
                    <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.6)" : "rgba(0, 0, 0, 0.6)", fontWeight: 300 }}>
                      TRACK YOUR ORDERS
                    </Typography>
                  </Box>
                  <Chip 
                    label="LIVE" 
                    size="small" 
                    sx={{ 
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.08)", 
                      color: mode === 'dark' ? "white" : "#1a1a1a", 
                      fontWeight: 300,
                      borderRadius: "2px",
                      animation: 'pulse 2s ease-in-out infinite',
                      '@keyframes pulse': {
                        '0%, 100%': { opacity: 1 },
                        '50%': { opacity: 0.7 },
                      },
                    }} 
                  />
                </Box>
                <Box
                  sx={{
                    height: 200,
                    background: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      transform: "scale(1.05) translateY(-2px)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    },
                  }}
                >
                  <ShoppingCart sx={{ fontSize: 100, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }} />
                </Box>
                <Button
                  variant="contained"
                  fullWidth
                  endIcon={<ArrowForward />}
                  sx={{
                    bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    borderRadius: "4px",
                    textTransform: "uppercase",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    py: 1.5,
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": { 
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                      transform: "translateY(-2px)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                    },
                  }}
                >
                  Track Orders
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        </Container>
      </Box>

      {/* Food Categories Section */}
      <Box sx={{ 
        background: mode === 'dark' ? "#0a0a0a" : "#ffffff",
        py: { xs: 8, sm: 10 },
        position: "relative",
      }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 }, position: "relative", zIndex: 1 }}>
          <Box sx={{ textAlign: "center", mb: { xs: 6, md: 8 } }}>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 300, 
                mb: 2, 
                fontSize: { xs: "1.75rem", md: "2.5rem" },
                color: mode === 'dark' ? "white" : "#1a1a1a",
                letterSpacing: "0.05em",
                fontFamily: "'Playfair Display', 'Georgia', serif",
              }}
            >
              Explore Food Categories
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                fontSize: { xs: "1rem", md: "1.125rem" },
                maxWidth: "600px",
                mx: "auto",
                fontWeight: 300,
              }}
            >
              Browse through our wide selection of delicious food options
            </Typography>
          </Box>
          <Grid container spacing={{ xs: 1.5, sm: 2 }}>
            {foodCategories.map((category, index) => (
              <Grid item xs={4} sm={3} md={2.4} key={index}>
                <Card
                  sx={{
                    textAlign: "center",
                    p: { xs: 1.5, sm: 2 },
                    cursor: "pointer",
                    borderRadius: "4px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: mode === 'dark' ? "0 2px 8px rgba(0, 0, 0, 0.3)" : "0 2px 8px rgba(0, 0, 0, 0.08)",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                    bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    backdropFilter: "blur(20px)",
                    "&:hover": {
                      transform: "translateY(-4px) scale(1.05)",
                      boxShadow: mode === 'dark' ? "0 8px 16px rgba(0, 0, 0, 0.5)" : "0 8px 16px rgba(0, 0, 0, 0.12)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                      bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 1)" : "rgba(255, 255, 255, 1)",
                    },
                  }}
                  onClick={() => handleCategoryClick(category.name)}
                >
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      mb: 0.5, 
                      fontSize: { xs: "2rem", sm: "2.5rem" },
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.2) rotate(5deg)",
                      },
                    }}
                  >
                    {category.icon}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 300, fontSize: { xs: "0.7rem", sm: "0.875rem" }, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }}>
                    {category.name}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Restaurant Listings Section */}
      <Box sx={{ bgcolor: mode === 'dark' ? "#0a0a0a" : "#f5f5f5", py: { xs: 8, sm: 10 } }}>
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box sx={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center", 
            mb: { xs: 6, sm: 8 }, 
            flexWrap: "wrap", 
            gap: 2 
          }}>
            <Box>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 300, 
                  mb: 1,
                  fontSize: { xs: "1.75rem", md: "2.5rem" },
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  letterSpacing: "0.05em",
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                }}
              >
                Discover Best Restaurants
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                  fontSize: { xs: "0.875rem", md: "1rem" },
                  fontWeight: 300,
                }}
              >
                Find your favorite dining spots
              </Typography>
            </Box>
            <Button
              component={Link}
              to="/customer-restaurants"
              endIcon={<ArrowForward />}
              sx={{ 
                color: mode === 'dark' ? "white" : "#1a1a1a", 
                fontWeight: 300, 
                fontSize: { xs: "0.75rem", sm: "0.875rem" },
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.23)",
                px: 3,
                py: 1,
                transition: "all 0.3s",
                "&:hover": {
                  bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                  border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.5)" : "1px solid rgba(0, 0, 0, 0.4)",
                },
              }}
            >
              See All
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredRestaurants.length === 0 ? (
            <Card sx={{ bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)", border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)" }}>
              <CardContent sx={{ textAlign: "center", py: 8 }}>
                <Restaurant sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.5)", mb: 2 }} />
                <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                  No restaurants available
                </Typography>
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={{ xs: 2, sm: 3 }}>
              {filteredRestaurants.map((restaurant) => {
                const restaurantId = restaurant.restaurantId;
                const name = restaurant.name;
                const address = restaurant.address || "";
                const phone = restaurant.phone || "";
                const openTime = restaurant.openTime;
                const closeTime = restaurant.closeTime;
                const averageRating = restaurant.averageRating || 0;
                const totalReviews = restaurant.totalReviews || 0;

                return (
                  <Grid item xs={12} sm={6} md={4} key={restaurantId || name}>
                    <Card
                      sx={{
                        height: "100%",
                        cursor: "pointer",
                        borderRadius: "4px",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: mode === 'dark' ? "0 4px 20px rgba(0, 0, 0, 0.3)" : "0 4px 20px rgba(0, 0, 0, 0.08)",
                        border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                        bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                        backdropFilter: "blur(20px)",
                        overflow: "hidden",
                        "&:hover": {
                          transform: "translateY(-8px) scale(1.02)",
                          boxShadow: mode === 'dark' ? "0 16px 48px rgba(0, 0, 0, 0.5)" : "0 16px 48px rgba(0, 0, 0, 0.12)",
                          border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                        },
                      }}
                      onClick={() => navigate(`/customer-restaurant/${restaurantId}`, { state: { fromHome: true } })}
                    >
                      <Box
                        sx={{
                          height: 200,
                          background: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.02)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          transition: "all 0.3s",
                          borderBottom: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
                          "&:hover": {
                            transform: "scale(1.05)",
                          },
                        }}
                      >
                        <Restaurant sx={{ fontSize: 80, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }} />
                      </Box>
                      <CardContent sx={{ bgcolor: "transparent" }}>
                        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 300, flex: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                            {name}
                          </Typography>
                          {averageRating > 0 ? (
                            <Chip
                              label={averageRating.toFixed(1)}
                              size="small"
                              icon={<Star sx={{ fontSize: 16, color: "#FFD700" }} />}
                              sx={{ 
                                background: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)",
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                                color: mode === 'dark' ? "white" : "#1a1a1a",
                                borderRadius: "2px",
                                fontWeight: 300,
                                border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                                transition: "all 0.3s",
                                "&:hover": {
                                  transform: "scale(1.1)",
                                },
                              }}
                            />
                          ) : (
                            <Chip
                              label="New"
                              size="small"
                              sx={{ 
                                bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.05)", 
                                color: mode === 'dark' ? "white" : "#1a1a1a",
                                borderRadius: "2px",
                                fontWeight: 300,
                                border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                              }}
                            />
                          )}
                        </Box>
                        {averageRating > 0 && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Rating value={averageRating} readOnly size="small" precision={0.1} sx={{ '& .MuiRating-iconFilled': { color: '#FFD700' } }} />
                            <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                              ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                            </Typography>
                          </Box>
                        )}
                        {address && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                            <LocationOn fontSize="small" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }} />
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", flex: 1, fontWeight: 300 }}>
                              {address.length > 40 ? `${address.substring(0, 40)}...` : address}
                            </Typography>
                          </Box>
                        )}
                        {(openTime || closeTime) && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}>
                            <AccessTime fontSize="small" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }} />
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                              {openTime || "N/A"} - {closeTime || "N/A"}
                            </Typography>
                          </Box>
                        )}
                        <Button
                          variant="contained"
                          fullWidth
                          sx={{
                            mt: 2,
                            bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                            color: mode === 'dark' ? "white" : "#1a1a1a",
                            borderRadius: "4px",
                            textTransform: "uppercase",
                            fontWeight: 300,
                            letterSpacing: "0.1em",
                            py: 1.5,
                            border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": { 
                              bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                              transform: "translateY(-2px)",
                              border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                            },
                          }}
                        >
                          View Restaurant
                        </Button>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </Box>

      {/* Location Selection Dialog */}
      <Dialog 
        open={locationDialogOpen} 
        onClose={() => {
          setLocationDialogOpen(false);
          setLocationInput("");
        }}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: mode === 'dark' ? "#1a1a1a" : "#ffffff",
            color: mode === 'dark' ? "white" : "#1a1a1a",
            border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)",
          }
        }}
      >
        <DialogTitle>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 300, color: mode === 'dark' ? "white" : "#1a1a1a", letterSpacing: "0.05em" }}>
              Select Your City
            </Typography>
            <IconButton 
              size="small" 
              onClick={() => {
                setLocationDialogOpen(false);
                setLocationInput("");
              }}
              sx={{ color: mode === 'dark' ? "white" : "#1a1a1a" }}
            >
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            placeholder="Type your city name"
            value={locationInput}
            onChange={(e) => setLocationInput(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LocationOn sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }} />
                </InputAdornment>
              ),
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && locationInput.trim()) {
                setLocation(locationInput.trim());
                setLocationDialogOpen(false);
                setLocationInput("");
              }
            }}
          />
          
          <Typography variant="subtitle2" sx={{ fontWeight: 300, mb: 2, color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Popular Cities
          </Typography>
          <List sx={{ maxHeight: 300, overflow: "auto" }}>
            {popularCities
              .filter(city => 
                locationInput === "" || 
                city.toLowerCase().includes(locationInput.toLowerCase())
              )
              .map((city) => (
                <ListItem key={city} disablePadding>
                  <ListItemButton
                    onClick={() => {
                      setLocation(city);
                      setLocationDialogOpen(false);
                      setLocationInput("");
                    }}
                    sx={{
                      borderRadius: 1,
                      mb: 0.5,
                      transition: "all 0.3s",
                      color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                      "&:hover": {
                        background: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        transform: "translateX(4px)",
                        color: mode === 'dark' ? "white" : "#1a1a1a",
                      },
                    }}
                  >
                    <LocationOn sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mr: 2, fontSize: 20 }} />
                    <ListItemText primary={city} />
                  </ListItemButton>
                </ListItem>
              ))}
          </List>
          
          {locationInput.trim() && 
           !popularCities.some(city => city.toLowerCase() === locationInput.toLowerCase().trim()) && (
            <Box sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<LocationOn />}
                onClick={() => {
                  setLocation(locationInput.trim());
                  setLocationDialogOpen(false);
                  setLocationInput("");
                }}
                sx={{
                  borderColor: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.23)",
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  fontWeight: 300,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  "&:hover": {
                    borderColor: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.4)",
                    bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.04)",
                  },
                }}
              >
                Use "{locationInput.trim()}"
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setLocationDialogOpen(false);
              setLocationInput("");
            }}
            sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.1em", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a", bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" } }}
          >
            Cancel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Footer */}
      <Box sx={{ bgcolor: mode === 'dark' ? "#1a1a1a" : "#ffffff", color: mode === 'dark' ? "white" : "#1a1a1a", py: 6, borderTop: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.08)" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Box
                  component="img"
                  src="/RestoFlow_logo.png"
                  alt="RestoFlow Logo"
                  sx={{
                    height: 50,
                    width: "auto",
                    objectFit: "contain",
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 300, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                Order food. Discover best restaurants.
              </Typography>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 300, mb: 2, letterSpacing: "0.05em", color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                Quick Links
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button component={Link} to="/customer-restaurants" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", justifyContent: "flex-start", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.875rem", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a", bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" } }}>
                  Browse Restaurants
                </Button>
                <Button component={Link} to="/customer-login" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", justifyContent: "flex-start", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.875rem", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a", bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" } }}>
                  Sign In
                </Button>
                <Button component={Link} to="/customer-register" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", justifyContent: "flex-start", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.875rem", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a", bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" } }}>
                  Sign Up
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" sx={{ fontWeight: 300, mb: 2, letterSpacing: "0.05em", color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                For Partners
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Button component={Link} to="/admin-login" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", justifyContent: "flex-start", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.875rem", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a", bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" } }}>
                  Restaurant Admin Login
                </Button>
                <Button component={Link} to="/admin-register" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", justifyContent: "flex-start", fontWeight: 300, textTransform: "uppercase", letterSpacing: "0.1em", fontSize: "0.875rem", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a", bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)" } }}>
                  Partner With Us
                </Button>
              </Box>
            </Grid>
          </Grid>
          <Box sx={{ borderTop: mode === 'dark' ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.08)", mt: 4, pt: 4, textAlign: "center" }}>
            <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 300, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
              © 2024 RestaurantHub. All rights reserved. Created by Himanshu Ladha
            </Typography>
          </Box>
        </Container>
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
    </Box>
  );
};

export default Home;
