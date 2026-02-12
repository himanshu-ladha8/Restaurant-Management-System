/**
 * Date utility functions for formatting dates according to system locale and timezone
 */

/**
 * Format a date string to system locale date and time
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDateTime = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    // Use system locale and timezone
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true, // Use 12-hour format (AM/PM)
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
};

/**
 * Format a date string to system locale date only (no time)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    // Use system locale
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
};

/**
 * Format a date string to system locale time only (no date)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted time string
 */
export const formatTime = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    // Use system locale
    return date.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true, // Use 12-hour format (AM/PM)
    });
  } catch (error) {
    console.error("Error formatting time:", error);
    return "N/A";
  }
};

/**
 * Format a date string to a short format (MM/DD/YYYY HH:MM AM/PM)
 * @param {string|Date} dateString - Date string or Date object
 * @returns {string} Formatted date string
 */
export const formatShortDateTime = (dateString) => {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }
    
    // Use system locale with shorter format
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "N/A";
  }
};

