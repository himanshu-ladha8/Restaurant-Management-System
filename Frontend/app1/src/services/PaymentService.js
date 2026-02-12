import api from "../api/axiosConfig";

/**
 * Payment Service - Handles all payment-related API calls
 */

// Get payment history for customer
export const getMyPayments = (orderId = null) => {
  const params = orderId ? { orderId } : {};
  return api.get("/customer/payments", { params });
};

// Create Stripe payment intent
export const createStripePaymentIntent = (orderId, amount) => {
  return api.post(
    `/payments/create-intent?orderId=${orderId}&amount=${amount}`
  );
};

// ✅ FIXED: Send confirmation data IN BODY
export const confirmStripePayment = (
  orderId,
  amount,
  paymentIntentId
) => {
  return api.post(
    `/payments/confirm?orderId=${orderId}&amount=${amount}&paymentIntentId=${paymentIntentId}`
  );
};


// Get payment receipt
export const getPaymentReceipt = (paymentId) => {
  return api.get(`/customer/payments/${paymentId}/receipt`);
};

// Get saved payment methods
export const getSavedPaymentMethods = () => {
  return api.get("/payments/saved-methods");
};

// Save a payment method
export const savePaymentMethod = (paymentMethodId, isDefault = false) => {
  return api.post("/payments/save-method", {
    paymentMethodId,
    isDefault,
  });
};

// Delete a saved payment method
export const deleteSavedPaymentMethod = (savedPaymentMethodId) => {
  return api.delete(`/payments/saved-methods/${savedPaymentMethodId}`);
};

// Create payment intent with saved payment method
export const createPaymentIntentWithSavedMethod = (orderId, amount, paymentMethodId) => {
  return api.post(
    `/payments/create-intent-with-method?orderId=${orderId}&amount=${amount}&paymentMethodId=${paymentMethodId}`
  );
};