import { useState, useEffect, useContext } from "react";
import { formatDateTime } from "../utils/dateUtils";
import { AuthContext } from "../context/AuthContext";
import {  Box,  Card,  CardContent,  Typography,  Grid,  CircularProgress,  Alert,  Snackbar,  Rating,  Chip,  Paper,  Divider,} from "@mui/material";
import { Star, RateReview, TrendingUp } from "@mui/icons-material";
import { getRestaurantAdminReviews, getReviewStatistics } from "../services/ReviewService";
import Layout from "../shared/components/Layout";

const RestaurantReviews = () => {
  const { user } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "error" });

  const navLinks = [
    { path: "/restaurant-dashboard", label: "Dashboard" },
    { path: "/restaurant-tables", label: "Tables" },
    { path: "/restaurant-meals", label: "Meals" },
    { path: "/restaurant-orders", label: "Orders" },
    { path: "/restaurant-reservations", label: "Reservations" },
    { path: "/restaurant-reviews", label: "Reviews" },
  ];

  useEffect(() => {
    fetchReviews();
    fetchStatistics();
  }, []);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await getRestaurantAdminReviews();
      const reviewsData = response.data || [];
      
      const normalizedReviews = reviewsData.map(review => ({
        reviewId: review.reviewId || review.ReviewId,
        customerId: review.customerId || review.CustomerId,
        customerName: review.customerName || review.CustomerName || "Anonymous",
        customerEmail: review.customerEmail || review.CustomerEmail || "",
        rating: review.rating || review.Rating,
        comment: review.comment || review.Comment || "",
        createdAt: review.createdAt || review.CreatedAt,
      }));
      
      setReviews(normalizedReviews);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      setSnackbar({ 
        open: true, 
        message: "Failed to load reviews: " + (err.response?.data || err.message), 
        severity: "error" 
      });
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await getReviewStatistics();
      setStatistics(response.data);
    } catch (err) {
      console.error("Error fetching review statistics:", err);
    }
  };

  return (
    <Layout title="Customer Reviews" backPath="/restaurant-dashboard" navLinks={navLinks}>
      {/* Statistics Cards */}
      {statistics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <RateReview color="primary" />
                  <Typography variant="subtitle2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 300 }}>
                    Total Reviews
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {statistics.totalReviews || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <Star color="primary" />
                  <Typography variant="subtitle2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 300 }}>
                    Average Rating
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {statistics.averageRating || 0}
                  </Typography>
                  <Rating value={statistics.averageRating || 0} readOnly precision={0.1} size="small" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <TrendingUp color="primary" />
                  <Typography variant="subtitle2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 300 }}>
                    5 Star Reviews
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700 }}>
                  {statistics.ratingDistribution?.fiveStar || 0}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1, fontWeight: 300 }}>
                  Rating Distribution
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption">5★</Typography>
                    <Box sx={{ flex: 1, bgcolor: "grey.200", height: 8, borderRadius: 1, overflow: "hidden" }}>
                      <Box 
                        sx={{ 
                          bgcolor: "success.main", 
                          height: "100%", 
                          width: `${((statistics.ratingDistribution?.fiveStar || 0) / (statistics.totalReviews || 1)) * 100}%` 
                        }} 
                      />
                    </Box>
                    <Typography variant="caption">{statistics.ratingDistribution?.fiveStar || 0}</Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="caption">4★</Typography>
                    <Box sx={{ flex: 1, bgcolor: "grey.200", height: 8, borderRadius: 1, overflow: "hidden" }}>
                      <Box 
                        sx={{ 
                          bgcolor: "primary.main", 
                          height: "100%", 
                          width: `${((statistics.ratingDistribution?.fourStar || 0) / (statistics.totalReviews || 1)) * 100}%` 
                        }} 
                      />
                    </Box>
                    <Typography variant="caption">{statistics.ratingDistribution?.fourStar || 0}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Reviews List */}
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        All Reviews ({reviews.length})
      </Typography>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <RateReview sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 300 }} gutterBottom>
              No reviews yet
            </Typography>
            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 300 }}>
              Customers haven't left any reviews for your restaurant yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {reviews.map((review) => {
            const reviewId = review.reviewId;
            const customerName = review.customerName;
            const rating = review.rating;
            const comment = review.comment;
            const createdAt = review.createdAt;

            return (
              <Grid item xs={12} key={reviewId}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {customerName}
                          </Typography>
                          <Chip
                            label={`${rating} ${rating === 1 ? 'Star' : 'Stars'}`}
                            size="small"
                            color={rating >= 4 ? "success" : rating >= 3 ? "warning" : "error"}
                            icon={<Star />}
                          />
                        </Box>
                        <Rating value={rating || 0} readOnly size="small" sx={{ mb: 1 }} />
                        {comment && (
                          <Typography variant="body1" sx={{ mt: 1, mb: 1 }}>
                            {comment}
                          </Typography>
                        )}
                        <Typography variant="caption" sx={{ color: "rgba(255, 255, 255, 0.7)", fontWeight: 300 }}>
                          {createdAt ? formatDateTime(createdAt) : "N/A"}
                        </Typography>
                      </Box>
                    </Box>
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

export default RestaurantReviews;

