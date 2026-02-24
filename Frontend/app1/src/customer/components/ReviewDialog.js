import { useState, useEffect } from "react";
import {  Dialog,  DialogTitle,  DialogContent,  DialogActions,  Button,  Typography,  Box,  TextField,  Rating,  IconButton,  Alert,  CircularProgress,} from "@mui/material";
import { Close, Star } from "@mui/icons-material";
import { createOrUpdateReview, getMyReview } from "../../services/ReviewService";

const ReviewDialog = ({ open, onClose, restaurantId, restaurantName, onReviewSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingReview, setExistingReview] = useState(null);

  useEffect(() => {
    if (open && restaurantId) {
      loadExistingReview();
    } else if (!open) {
      // Defer reset to avoid concurrent render when parent closes dialog
      const t = setTimeout(() => {
        setRating(0);
        setComment("");
        setError("");
        setExistingReview(null);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [open, restaurantId]);

  const loadExistingReview = async () => {
    try {
      const response = await getMyReview(restaurantId);
      if (response.data) {
        const review = response.data;
        setExistingReview(review);
        setRating(review.rating || 0);
        setComment(review.comment || "");
      }
    } catch (err) {
      // No existing review - that's fine
      console.log("No existing review found");
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Please select a rating (1-5 stars)");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("Rating must be between 1 and 5 stars");
      return;
    }

    setError("");
    setLoading(true);

    try {
      await createOrUpdateReview(restaurantId, {
        rating: rating,
        comment: comment.trim() || null,
      });

      if (onReviewSubmitted) {
        onReviewSubmitted();
      }

      onClose();
    } catch (err) {
      console.error("Error submitting review:", err);
      
      // Extract error message from response
      let errorMessage = "Failed to submit review. Please try again.";
      if (err.response?.data) {
        if (typeof err.response.data === 'string') {
          errorMessage = err.response.data;
        } else if (err.response.data.message) {
          errorMessage = err.response.data.message;
        } else if (err.response.data.error) {
          errorMessage = err.response.data.error;
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            {existingReview ? "Update Your Review" : "Write a Review"}
          </Typography>
          <IconButton size="small" onClick={handleClose} disabled={loading}>
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.9)", mb: 2, fontWeight: 300 }}>
            Restaurant: <strong>{restaurantName || "Restaurant"}</strong>
          </Typography>
          {existingReview && (
            <Alert severity="info" sx={{ mb: 2 }}>
              You have already reviewed this restaurant. You can edit your review below. (Each customer can only review once, but you can update your review anytime.)
            </Alert>
          )}
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
            Rating *
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Rating
              name="restaurant-rating"
              value={rating}
              onChange={(event, newValue) => {
                setRating(newValue || 0);
                setError("");
              }}
              size="large"
              sx={{ fontSize: "2rem" }}
            />
            {rating > 0 && (
              <Typography variant="body1" sx={{ color: "rgba(255, 255, 255, 0.9)", fontWeight: 300 }}>
                {rating} {rating === 1 ? "star" : "stars"}
              </Typography>
            )}
          </Box>
        </Box>

        <TextField
          fullWidth
          multiline
          rows={4}
          label="Your Review (Optional)"
          placeholder="Share your experience at this restaurant..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          sx={{ mb: 2 }}
          helperText={`${comment.length}/500 characters`}
          inputProps={{ maxLength: 500 }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 1 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading || rating === 0}
          startIcon={loading ? <CircularProgress size={16} /> : <Star />}
        >
          {loading ? "Submitting..." : existingReview ? "Update Review" : "Submit Review"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReviewDialog;

