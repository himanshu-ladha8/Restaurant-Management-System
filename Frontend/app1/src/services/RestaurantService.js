import api from "../api/axiosConfig";

/**
 * Restaurant Service - Handles all restaurant-related API calls
 */

// Complete restaurant setup for RestaurantAdmin (after registration)
export const completeRestaurantSetup = (userId, restaurantData) => {
  return api.post("/Auth/restaurant-admin/complete-setup", null, {
    params: {
      userId: userId,
      restaurantName: restaurantData.restaurantName,
      address: restaurantData.address || "",
      phone: restaurantData.phone || "",
      openTime: restaurantData.openTime || null,
      closeTime: restaurantData.closeTime || null,
    },
  });
};

// Get all restaurants (Admin only)
export const getAllRestaurants = () => {
  return api.get("/admin/restaurants");
};

// Get a single restaurant by ID
export const getRestaurant = (restaurantId) => {
  return api.get(`/admin/restaurants/${restaurantId}`);
};

// Create a new restaurant
export const createRestaurant = (restaurantData) => {
  return api.post("/admin/restaurants", {
    Name: restaurantData.name,
    Address: restaurantData.address || "",
    Phone: restaurantData.phone || "",
  });
};

// Update an existing restaurant
export const updateRestaurant = (restaurantId, restaurantData) => {
  return api.put(`/admin/restaurants/${restaurantId}`, {
    Name: restaurantData.name,
    Address: restaurantData.address || "",
    Phone: restaurantData.phone || "",
  });
};

// Delete a restaurant
export const deleteRestaurant = (restaurantId) => {
  return api.delete(`/admin/restaurants/${restaurantId}`);
};

// Get restaurant admin's own restaurant info
export const getMyRestaurant = () => {
  return api.get("/restaurant-admin/info/restaurant");
};

// Admin: Get all meals for a restaurant
export const getAdminRestaurantMeals = (restaurantId) => {
  return api.get(`/admin/restaurants/${restaurantId}/meals`);
};

// Admin: Disable a meal (remove from menu)
export const disableRestaurantMeal = (restaurantId, mealId, reason) => {
  return api.put(`/admin/restaurants/${restaurantId}/meals/${mealId}/disable`, {
    Reason: reason || "Item removed by Admin"
  });
};

// Admin: Enable a meal
export const enableRestaurantMeal = (restaurantId, mealId) => {
  return api.put(`/admin/restaurants/${restaurantId}/meals/${mealId}/enable`);
};

// Admin: Get all tables for a restaurant with status
export const getAdminRestaurantTables = (restaurantId) => {
  return api.get(`/admin/restaurants/${restaurantId}/tables`);
};

// Admin: Send notification to restaurant admin
export const notifyRestaurantAdmin = (restaurantId, message, title, type) => {
  return api.post(`/admin/restaurants/${restaurantId}/notify`, {
    Message: message,
    Title: title || "Admin Notification",
    Type: type || "info"
  });
};