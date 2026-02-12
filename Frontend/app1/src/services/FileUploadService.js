import api from "../api/axiosConfig";

/**
 * File Upload Service - Handles image uploads
 */

export const uploadImage = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  
  return api.post("/FileUpload/upload-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

