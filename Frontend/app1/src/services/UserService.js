import api from "../api/axiosConfig";

export const getAllUsers = () => {
  return api.get("/admin/users");
};

export const getUserById = (id) => {
  return api.get(`/admin/users/${id}`);
};

export const updateUser = (id, userData) => {
  return api.put(`/admin/users/${id}`, {
    FullName: userData.fullName,
    Email: userData.email,
    PhoneNumber: userData.phoneNumber || null,
    UserType: userData.userType,
    RestaurantId: userData.restaurantId || null,
  });
};

export const deleteUser = (id) => {
  return api.delete(`/admin/users/${id}`);
};

