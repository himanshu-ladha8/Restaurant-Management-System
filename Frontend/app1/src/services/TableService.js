import api from "../api/axiosConfig";

/**
 * Table Service - Handles all table-related API calls for RestaurantAdmin
 */

// Get all tables for a restaurant
export const getTables = (restaurantId) => {
  return api.get("/restaurant-admin/tables", {
    params: { _restaurantId: restaurantId },
  });
};

// Get a single table by ID
export const getTable = (restaurantId, tableId) => {
  return api.get(`/restaurant-admin/tables/${restaurantId}/${tableId}`);
};

// Create a new table
export const createTable = (restaurantId, tableData) => {
  return api.post("/restaurant-admin/tables", {
    TableNumber: tableData.tableNumber,
    Capacity: tableData.capacity,
    Status: tableData.status || "Available",
    RestaurantId: restaurantId,
  });
};

// Update an existing table
export const updateTable = (tableId, restaurantId, tableData) => {
  return api.put(`/restaurant-admin/tables/${tableId}`, {
    TableNumber: tableData.tableNumber,
    Capacity: tableData.capacity,
    Status: tableData.status,
    RestaurantId: restaurantId,
  });
};

// Delete a table
export const deleteTable = (restaurantId, tableId) => {
  return api.delete(`/restaurant-admin/tables/${restaurantId}/${tableId}`);
};
