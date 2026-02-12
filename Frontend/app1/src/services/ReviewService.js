import api from "../api/axiosConfig";

/**
 * Review Service - Handles all review-related API calls
 */

// Get all reviews for a restaurant
export const getRestaurantReviews = (restaurantId) => {
  return api.get(`/customer/restaurants/${restaurantId}/reviews`);
};

// Get average rating for a restaurant
export const getAverageRating = (restaurantId) => {
  return api.get(`/customer/restaurants/${restaurantId}/average-rating`);
};

// Create or update a review
export const createOrUpdateReview = (restaurantId, reviewData) => {
  return api.post(`/customer/restaurants/${restaurantId}/reviews`, {
    Rating: reviewData.rating,
    Comment: reviewData.comment || null,
  });
};

// Get customer's review for a restaurant
export const getMyReview = (restaurantId) => {
  return api.get(`/customer/restaurants/${restaurantId}/my-review`);
};

// Delete a review
export const deleteReview = (reviewId) => {
  return api.delete(`/customer/reviews/${reviewId}`);
};

// Restaurant Admin: Get all reviews
export const getRestaurantAdminReviews = () => {
  return api.get("/restaurant-admin/reviews");
};

// Restaurant Admin: Get review statistics
export const getReviewStatistics = () => {
  return api.get("/restaurant-admin/reviews/statistics");
};

