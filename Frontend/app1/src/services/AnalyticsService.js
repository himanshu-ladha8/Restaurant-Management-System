import api from "../api/axiosConfig";

/**
 * Analytics Service - Handles analytics API calls for RestaurantAdmin
 */

// Get analytics data
export const getAnalytics = (days = null, startDate = null, endDate = null) => {
  const params = {};
  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else if (days !== null) {
    params.days = days;
  }
  return api.get("/restaurant-admin/analytics", { params });
};

// Get day-by-day revenue breakdown
export const getDailyRevenue = (days = null, startDate = null, endDate = null) => {
  const params = {};
  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else if (days !== null) {
    params.days = days;
  }
  return api.get("/restaurant-admin/analytics/daily-revenue", { params });
};

// Get day-by-day food item sales
export const getDailyFoodSales = (days = null, startDate = null, endDate = null) => {
  const params = {};
  if (startDate && endDate) {
    params.startDate = startDate;
    params.endDate = endDate;
  } else if (days !== null) {
    params.days = days;
  }
  return api.get("/restaurant-admin/analytics/daily-food-sales", { params });
};

