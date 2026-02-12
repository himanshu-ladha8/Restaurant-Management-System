import api from "../api/axiosConfig";

/**
 * Meal Service - Handles all meal-related API calls for RestaurantAdmin
 */

// Get all meals for a restaurant
export const getMeals = (restaurantId) => {
  return api.get("/restaurant-admin/meals", {
    params: { restaurantId: restaurantId },
  });
};

// Get a single meal by ID
export const getMeal = (mealId, restaurantId) => {
  return api.get(`/restaurant-admin/meals/${mealId}/${restaurantId}`);
};

// Create a new meal
export const createMeal = (restaurantId, mealData) => {
  return api.post("/restaurant-admin/meals/CreateMeal", {
    Name: mealData.name,
    Description: mealData.description || "",
    Price: mealData.price,
    Category: mealData.category || "",
    IsAvailable: mealData.isAvailable !== undefined ? mealData.isAvailable : true,
    IsBestItem: mealData.isBestItem || false,
    ImageUrl: mealData.imageUrl || null,
    restaurantId: restaurantId,
  });
};

// Update an existing meal
export const updateMeal = (mealId, restaurantId, mealData) => {
  return api.put(`/restaurant-admin/meals/${mealId}`, {
    Name: mealData.name,
    Description: mealData.description || "",
    Price: mealData.price,
    Category: mealData.category || "",
    IsAvailable: mealData.isAvailable !== undefined ? mealData.isAvailable : true,
    IsBestItem: mealData.isBestItem || false,
    ImageUrl: mealData.imageUrl || null,
    restaurantId: restaurantId,
  });
};

// Delete a meal
export const deleteMeal = (mealId, restaurantId) => {
  return api.delete(`/restaurant-admin/meals/${mealId}/${restaurantId}`);
};
