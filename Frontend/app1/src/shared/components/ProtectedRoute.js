import { useContext } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Box, CircularProgress } from "@mui/material";
import { AuthContext } from "../../context/AuthContext";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isCheckingAuth } = useContext(AuthContext);
  const location = useLocation();

  // Show loading state while checking authentication
  if (isCheckingAuth) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // If no user is logged in
  if (!user) {
    // Store the attempted location to redirect back after login
    const returnUrl = location.pathname + location.search;
    localStorage.setItem("returnUrl", returnUrl);
    
    // Redirect to appropriate login based on route
    if (location.pathname.startsWith("/customer")) {
      return <Navigate to="/customer-login" replace />;
    } else if (location.pathname.startsWith("/restaurant") || location.pathname.startsWith("/admin")) {
      return <Navigate to="/admin-login" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // If role is required, check if user has the correct role
  if (requiredRole) {
    const userRole = user.role || user.userType;
    if (userRole !== requiredRole) {
      // Redirect based on user's actual role
      if (userRole === "Customer") {
        return <Navigate to="/customer-dashboard" replace />;
      } else if (userRole === "RestaurantAdmin") {
        return <Navigate to="/restaurant-dashboard" replace />;
      } else if (userRole === "Admin") {
        return <Navigate to="/admin-dashboard" replace />;
      }
      return <Navigate to="/" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

