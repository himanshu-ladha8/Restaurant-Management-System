import api from "./axiosConfig";

export const login = (data) => {
  // Backend expects query parameters for login
  return api.post("/Auth/login", null, {
    params: {
      email: data.email,
      password: data.password,
    },
  });
};

export const register = (data) => {
  // Backend expects query parameters for register
  return api.post("/Auth/register", null, {
    params: {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
      PhoneNumber: data.PhoneNumber || data.phonenumber || "",
    },
  });
};

export const forgotPassword = (email) => {
  return api.post("/Auth/forgot-password", null, {
    params: {
      email: email,
    },
  });
};

export const resetPassword = (token, newPassword) => {
  return api.post("/Auth/reset-password", null, {
    params: {
      token: token,
      newPassword: newPassword,
    },
  });
};

export const sendOtp = (email, password) => {
  return api.post("/Auth/send-otp", null, {
    params: {
      email: email,
      password: password,
    },
  });
};

export const verifyOtpLogin = (email, otp) => {
  return api.post("/Auth/verify-otp-login", null, {
    params: {
      email: email,
      otp: otp,
    },
  });
};