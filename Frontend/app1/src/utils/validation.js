/**
 * Validation utility functions
 */

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone) => {
  // Allow various phone formats
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validatePassword = (password) => {
  // At least 6 characters
  if (password.length < 6) {
    return { valid: false, message: "Password must be at least 6 characters long" };
  }
  // At least one letter and one number
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    return { valid: false, message: "Password must contain at least one letter and one number" };
  }
  return { valid: true, message: "" };
};

export const validatePrice = (price) => {
  const numPrice = parseFloat(price);
  if (isNaN(numPrice) || numPrice < 0) {
    return { valid: false, message: "Price must be a positive number" };
  }
  return { valid: true, message: "" };
};

export const validateTableNumber = (tableNumber) => {
  if (!tableNumber || tableNumber.trim().length === 0) {
    return { valid: false, message: "Table number is required" };
  }
  return { valid: true, message: "" };
};

export const validateCapacity = (capacity) => {
  const numCapacity = parseInt(capacity, 10);
  if (isNaN(numCapacity) || numCapacity < 1 || numCapacity > 50) {
    return { valid: false, message: "Capacity must be between 1 and 50" };
  }
  return { valid: true, message: "" };
};

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === "string" && value.trim().length === 0)) {
    return { valid: false, message: `${fieldName} is required` };
  }
  return { valid: true, message: "" };
};

export const validateTableId = (tableId) => {
  if (!tableId) {
    return { valid: false, message: "Table ID is required" };
  }
  const numId = parseInt(tableId, 10);
  if (isNaN(numId) || numId <= 0) {
    return { valid: false, message: "Invalid table ID" };
  }
  return { valid: true, message: "" };
};

