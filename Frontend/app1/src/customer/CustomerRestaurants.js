import { useState, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import {  Box,  Card,  CardContent,  Typography,  Grid,  Button,  CircularProgress,  Alert,  Snackbar,  TextField,  InputAdornment,  IconButton,  FormControl,  InputLabel,  Select,  MenuItem,  Collapse,  Paper,  Rating,  Chip,} from "@mui/material";
import {  Restaurant as RestaurantIcon,  LocationOn,  Phone,  AccessTime,  Search,  Clear,  FilterList,  ExpandMore,  ExpandLess,  Star,} from "@mui/icons-material";
import { getRestaurants } from "../services/CustomerService";
import { getAverageRating } from "../services/ReviewService";
import Layout from "../shared/components/Layout";
import { useThemeMode } from "../context/ThemeContext";

const CustomerRestaurants = () => {
  const { mode } = useThemeMode();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });

  // Check if navigated from home screen
  const fromHome = location.state?.fromHome || false;
  const backPath = fromHome ? "/" : "/customer-dashboard";

  const navLinks = [
    { path: "/customer-dashboard", label: "Dashboard" },
    { path: "/customer-reservations", label: "Reservations" },
    { path: "/customer-orders", label: "My Orders" },
  ];

  const fromReservation = location.state?.fromReservation === true;

  // Fetch restaurants on mount
  useEffect(() => {
    fetchRestaurants();
  }, []);

  const [locationFilter, setLocationFilter] = useState("");

  // Handle search and location query parameters from URL (on mount and when URL changes)
  useEffect(() => {
    const searchQuery = searchParams.get("search");
    const locationQuery = searchParams.get("location");
    
    if (searchQuery !== null && searchQuery !== undefined) {
      // Decode and update search term from URL
      const decodedQuery = decodeURIComponent(searchQuery);
      setSearchTerm(decodedQuery);
    } else if (searchParams.get("search") === null) {
      // Clear search if no search param in URL
      setSearchTerm("");
    }
    
    if (locationQuery !== null && locationQuery !== undefined) {
      // Decode and update location filter from URL
      const decodedLocation = decodeURIComponent(locationQuery);
      setLocationFilter(decodedLocation);
    } else if (searchParams.get("location") === null) {
      // Clear location if no location param in URL
      setLocationFilter("");
    }
  }, [searchParams]);

  const fetchRestaurants = async () => {
    try {
      setLoading(true);
      const response = await getRestaurants();
      const restaurantsData = response.data || [];
      
      // Fetch average ratings for each restaurant
      const normalizedRestaurants = await Promise.all(
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
      
      setRestaurants(normalizedRestaurants);
      setFilteredRestaurants(normalizedRestaurants);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      setSnackbar({ open: true, message: "Failed to load restaurants: " + (err.response?.data || err.message), severity: "error" });
      setRestaurants([]);
      setFilteredRestaurants([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort restaurants
  useEffect(() => {
    let filtered = [...restaurants];

    // Filter by location first (if specified)
    if (locationFilter) {
      const locationTerm = locationFilter.toLowerCase();
      filtered = filtered.filter(
        (r) => {
          const address = (r.address || "").toLowerCase();
          // Check if address contains the location/city name
          return address.includes(locationTerm);
        }
      );
    }

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

    // Sort restaurants
    if (sortBy !== "default") {
      filtered.sort((a, b) => {
        const nameA = (a.name || "").toLowerCase();
        const nameB = (b.name || "").toLowerCase();
        
        switch (sortBy) {
          case "name-asc":
            return nameA.localeCompare(nameB);
          case "name-desc":
            return nameB.localeCompare(nameA);
          default:
            return 0;
        }
      });
    }

    setFilteredRestaurants(filtered);
  }, [restaurants, searchTerm, locationFilter, sortBy]);

  const handleSelectRestaurant = (restaurantId) => {
    navigate(`/customer-restaurant/${restaurantId}`, { state: { fromHome } });
  };

  return (
    <Layout title="Select a Restaurant" backPath={backPath} navLinks={navLinks}>
      <Box sx={{ mb: 4 }}>
        {fromReservation && (
          <Alert severity="info" sx={{ mb: 3 }} icon={false}>
            <Typography variant="body2">
              <strong>Book a table:</strong> Pick a restaurant below, then open it and use &quot;Book a Table&quot; to choose date, time and guests.
            </Typography>
          </Alert>
        )}
        <Box sx={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center", 
          mb: 3, 
          flexWrap: "wrap", 
          gap: 2,
          animation: 'fadeIn 0.6s ease-in',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 600,
              color: mode === 'dark' ? 'white' : '#1a1a1a',
              fontWeight: 300,
              letterSpacing: '0.05em',
              fontFamily: "'Playfair Display', 'Georgia', serif",
            }}
          >
            Available Restaurants ({filteredRestaurants.length})
          </Typography>
        </Box>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2, alignItems: "center" }}>
            <TextField
              placeholder="Search restaurants by name, address, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  // Update URL with search params
                  const params = new URLSearchParams();
                  if (searchTerm.trim()) params.append("search", searchTerm.trim());
                  if (locationFilter) params.append("location", locationFilter);
                  window.history.pushState({}, "", `/customer-restaurants?${params.toString()}`);
                }
              }}
              sx={{ 
                flexGrow: 1, 
                minWidth: 200,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                  transition: "all 0.3s",
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
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setSearchTerm("");
                        const params = new URLSearchParams();
                        if (locationFilter) params.append("location", locationFilter);
                        window.history.pushState({}, "", `/customer-restaurants${params.toString() ? `?${params.toString()}` : ""}`);
                      }}
                      sx={{
                        transition: "all 0.3s",
                        "&:hover": {
                          transform: "scale(1.1)",
                        },
                      }}
                    >
                      <Clear />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {locationFilter && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1,
                  background: "rgba(26, 26, 26, 0.8)",
                  backdropFilter: "blur(10px)",
                  WebkitBackdropFilter: "blur(10px)",
                  borderRadius: 4,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 107, 53, 0.3)",
                  boxShadow: "0 2px 8px rgba(255, 107, 53, 0.1)",
                }}
              >
                <LocationOn sx={{ color: "#FF6B35" }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: "#FF6B35" }}>
                  {locationFilter}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setLocationFilter("");
                    const params = new URLSearchParams();
                    if (searchTerm.trim()) params.append("search", searchTerm.trim());
                    window.history.pushState({}, "", `/customer-restaurants${params.toString() ? `?${params.toString()}` : ""}`);
                  }}
                  sx={{ color: "#FF6B35", ml: 0.5 }}
                >
                  <Clear fontSize="small" />
                </IconButton>
              </Box>
            )}
            <FormControl 
              size="small" 
              sx={{ 
                minWidth: 150,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "4px",
                },
              }}
            >
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="default">Default</MenuItem>
                <MenuItem value="name-asc">Name: A to Z</MenuItem>
                <MenuItem value="name-desc">Name: Z to A</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<FilterList />}
              endIcon={showAdvancedFilters ? <ExpandLess /> : <ExpandMore />}
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              size="small"
              sx={{
                borderRadius: "12px",
                textTransform: "none",
                fontWeight: 600,
                transition: "all 0.3s",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                },
              }}
            >
              Filters
            </Button>
          </Box>

          <Collapse in={showAdvancedFilters}>
            <Paper sx={{ p: 2, bgcolor: "background.paper" }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSearchTerm("");
                  setSortBy("default");
                }}
              >
                Reset Filters
              </Button>
            </Paper>
          </Collapse>
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ 
          display: "flex", 
          flexDirection: "column",
          justifyContent: "center", 
          alignItems: "center",
          py: 8,
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
          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
            Loading restaurants...
          </Typography>
        </Box>
      ) : filteredRestaurants.length === 0 ? (
        <Card
          sx={{
            borderRadius: "4px",
            boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
          }}
        >
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <RestaurantIcon sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }} gutterBottom>
              {searchTerm || locationFilter 
                ? `No restaurants found${searchTerm ? ` matching "${searchTerm}"` : ""}${locationFilter ? ` in ${locationFilter}` : ""}`
                : "No restaurants available"}
            </Typography>
            {(searchTerm || locationFilter) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Try adjusting your search or location filters
              </Typography>
            )}
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
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
                    borderRadius: "4px",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    cursor: "pointer",
                    bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.02)",
                      boxShadow: "0 12px 32px rgba(0, 0, 0, 0.15)",
                    },
                  }}
                  onClick={() => handleSelectRestaurant(restaurantId)}
                >
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <RestaurantIcon 
                            color="primary" 
                            sx={{
                              transition: "all 0.3s",
                              "&:hover": {
                                transform: "scale(1.2) rotate(5deg)",
                              },
                            }}
                          />
                          <Typography variant="h6" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                            {name}
                          </Typography>
                        </Box>
                        {averageRating > 0 && (
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Rating value={averageRating} readOnly size="small" precision={0.1} />
                            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                              {averageRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
                            </Typography>
                          </Box>
                        )}
                      </Box>
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
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                        <Phone fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          {phone}
                        </Typography>
                      </Box>
                    )}

                    {(openTime || closeTime) && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                        <AccessTime fontSize="small" color="action" />
                        <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                          {openTime || "N/A"} - {closeTime || "N/A"}
                        </Typography>
                      </Box>
                    )}

                    <Button
                      variant="contained"
                      fullWidth
                      onClick={() => handleSelectRestaurant(restaurantId)}
                      sx={{ 
                        mt: 2,
                        borderRadius: "4px",
                        textTransform: "none",
                        fontWeight: 600,
                        py: 1.5,
                        background: "rgba(255, 255, 255, 0.1)",
                        color: mode === 'dark' ? "white" : "#1a1a1a",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        textTransform: "uppercase",
                        fontWeight: 300,
                        letterSpacing: "0.1em",
                        "&:hover": {
                          transform: "translateY(-2px)",
                          boxShadow: "0 8px 20px rgba(0, 0, 0, 0.4)",
                          background: "rgba(255, 255, 255, 0.2)",
                          border: "1px solid rgba(255, 255, 255, 0.3)",
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

export default CustomerRestaurants;
