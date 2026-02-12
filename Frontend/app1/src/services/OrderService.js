import api from "../api/axiosConfig";

/**
 * Order Service - Handles all order-related API calls for Customers
 */

// Create order from a table
export const createOrder = (tableId, items) => {
  return api.post(`/customer/tables/${tableId}/orders`, {
    Items: items.map(item => ({
      MealId: item.mealId,
      Quantity: item.quantity,
      Price: item.price, // Backend will recalculate from meal price
      TotalPrice: item.price * item.quantity, // Backend will recalculate
    })),
  });
};

// Get all orders for current customer (optionally filtered by restaurant)
export const getAllMyOrders = (restaurantId = null) => {
  const params = restaurantId ? { restaurantId } : {};
  return api.get("/customer/orders", { params });
};

// Get order details
export const getOrder = (orderId, restaurantId) => {
  return api.get(`/customer/orders/${orderId}/${restaurantId}`);
};

// Pay for an order
export const payOrder = (orderId, paymentData) => {
  return api.post(`/customer/orders/${orderId}/payments`, {
    Amount: paymentData.amount,
    PaymentMode: paymentData.paymentMode,
    TransactionId: paymentData.transactionId || null,
  });
};

// Cancel an order
export const cancelOrder = (orderId) => {
  return api.put(`/customer/orders/${orderId}/cancel`);
};

// Add items to an existing order (for incremental ordering)
export const addItemsToOrder = (orderId, items) => {
  return api.post(`/customer/orders/${orderId}/items`, {
    Items: items.map(item => ({
      MealId: item.mealId,
      Quantity: item.quantity,
      Price: item.price,
      TotalPrice: item.price * item.quantity,
    })),
  });
};

