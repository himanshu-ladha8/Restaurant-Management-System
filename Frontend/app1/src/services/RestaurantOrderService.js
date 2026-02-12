import api from "../api/axiosConfig";

/**
 * Restaurant Order Service - Handles all order-related API calls for RestaurantAdmin
 */

// Get all orders for the restaurant (with optional status filter)
export const getOrders = (status = null) => {
  const params = status ? { status } : {};
  return api.get("/restaurant-admin/orders", { params });
};

// Get a single order by ID
export const getOrder = (orderId) => {
  return api.get(`/restaurant-admin/orders/${orderId}`);
};

// Update order status
export const updateOrderStatus = (orderId, status, customerLeft = null) => {
  const payload = {
    OrderStatus: status,
  };
  // Only include CustomerLeft if status is "Completed"
  if (status === "Completed" && customerLeft !== null) {
    payload.CustomerLeft = customerLeft;
  }
  return api.put(`/restaurant-admin/orders/${orderId}/status`, payload);
};

// Get payments for an order
export const getOrderPayments = (orderId) => {
  return api.get(`/restaurant-admin/orders/${orderId}/payments`);
};

