import api from "../api/axiosConfig";

/**
 * Reservation Service - Handles all reservation-related API calls
 */

// Customer Reservation APIs

// Create a new reservation
export const createReservation = (reservationData) => {
  return api.post("/customer/reservations", {
    RestaurantId: reservationData.restaurantId,
    TableId: reservationData.tableId,
    ReservationDate: reservationData.reservationDate,
    ReservationTime: reservationData.reservationTime,
    Duration: reservationData.duration || 60, // Default 60 minutes
    NumberOfGuests: reservationData.numberOfGuests,
    Notes: reservationData.notes || null,
    CustomerPhone: reservationData.customerPhone || null,
    CustomerName: reservationData.customerName || null,
  });
};

// Get all reservations for current customer
export const getMyReservations = (restaurantId = null) => {
  const params = restaurantId ? { restaurantId } : {};
  return api.get("/customer/reservations", { params });
};

// Get a specific reservation
export const getReservation = (reservationId) => {
  return api.get(`/customer/reservations/${reservationId}`);
};

// Cancel a reservation
export const cancelReservation = (reservationId) => {
  return api.put(`/customer/reservations/${reservationId}/cancel`);
};

// Accept suggested time from admin
export const acceptSuggestedTime = (reservationId) => {
  return api.put(`/customer/reservations/${reservationId}/accept-suggested-time`);
};

// Restaurant Admin Reservation APIs

// Get all reservations for restaurant
export const getRestaurantReservations = (status = null, date = null) => {
  const params = {};
  if (status) params.status = status;
  if (date) params.date = date;
  return api.get("/restaurant-admin/reservations", { params });
};

// Get a specific reservation (admin)
export const getRestaurantReservation = (reservationId) => {
  return api.get(`/restaurant-admin/reservations/${reservationId}`);
};

// Update reservation status (Confirm, Reject, Complete)
export const updateReservationStatus = (reservationId, status, adminNotes = null) => {
  return api.put(`/restaurant-admin/reservations/${reservationId}/status`, {
    Status: status,
    AdminNotes: adminNotes || null,
  });
};

// Suggest alternative time to customer
export const suggestTime = (reservationId, suggestedTime, adminNotes = null) => {
  return api.put(`/restaurant-admin/reservations/${reservationId}/suggest-time`, {
    SuggestedTime: suggestedTime,
    AdminNotes: adminNotes || null,
  });
};

// Get available time slots for a date and table
export const getAvailableSlots = (tableId, date, duration = 60) => {
  return api.get("/restaurant-admin/reservations/available-slots", {
    params: { tableId, date, duration },
  });
};
























