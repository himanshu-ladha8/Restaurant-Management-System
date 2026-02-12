import api from "../api/axiosConfig";

/**
 * Customer Service - Handles all customer-related API calls
 */

// Get all active restaurants
export const getRestaurants = () => {
  return api.get("/customer/restaurants");
};

// Get all tables for a restaurant
export const getRestaurantTables = (restaurantId) => {
  return api.get(`/customer/restaurants/${restaurantId}/tables`);
};

// Get available tables for a restaurant
export const getAvailableTables = (restaurantId) => {
  return api.get(`/customer/restaurants/${restaurantId}/tables/available`);
};

// Get meals for a restaurant
export const getRestaurantMeals = (restaurantId) => {
  return api.get(`/customer/restaurants/${restaurantId}/meals`);
};

// Customer leaves table - set table status to Available
export const leaveTable = (tableId) => {
  return api.put(`/customer/tables/${tableId}/leave`);
};

// Get meals by category from all restaurants
export const getMealsByCategory = (category) => {
  return api.get(`/customer/meals/category/${encodeURIComponent(category)}`);
};

