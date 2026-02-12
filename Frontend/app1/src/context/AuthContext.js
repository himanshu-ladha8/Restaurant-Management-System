import { createContext, useState, useEffect, useCallback } from "react";

export const AuthContext = createContext();

const TOKEN_REFRESH_INTERVAL = parseInt(process.env.REACT_APP_TOKEN_REFRESH_INTERVAL || "300000", 10); // 5 minutes
const SESSION_TIMEOUT = parseInt(process.env.REACT_APP_SESSION_TIMEOUT || "3600000", 10); // 1 hour

export const AuthProvider = ({ children }) => {     //wraps entire app and authentication to all child
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (e) {
      console.error("Error parsing user from localStorage:", e);
      return null;
    }
  });
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check if token is expired
  const isTokenExpired = useCallback(() => {
    if (!user?.token) return true;
    
    try {
      const tokenData = JSON.parse(atob(user.token.split('.')[1]));
      const expirationTime = tokenData.exp * 1000; // Convert to milliseconds
      return Date.now() >= expirationTime;
    } catch (e) {
      console.error("Error checking token expiration:", e);
      return true;
    }
  }, [user]);

  // Check session timeout
  const checkSessionTimeout = useCallback(() => {
    const lastActivity = localStorage.getItem("lastActivity");
    if (lastActivity) {
      const timeSinceActivity = Date.now() - parseInt(lastActivity, 10);
      if (timeSinceActivity > SESSION_TIMEOUT) {
        logout();
        return true;
      }
    }
    return false;
  }, []);

  // Update last activity timestamp
  const updateLastActivity = useCallback(() => {
    localStorage.setItem("lastActivity", Date.now().toString());
  }, []);

  // Initialize auth check
  useEffect(() => {
    const initAuth = () => {
      setIsCheckingAuth(true);
      
      if (!user) {
        setIsCheckingAuth(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired()) {
        console.log("Token expired, logging out");
        logout();
        setIsCheckingAuth(false);
        return;
      }

      // Check session timeout
      if (checkSessionTimeout()) {
        setIsCheckingAuth(false);
        return;
      }

      updateLastActivity();
      setIsCheckingAuth(false);
    };

    initAuth();
  }, [user, isTokenExpired, checkSessionTimeout, updateLastActivity]);

  // Set up activity tracking
  useEffect(() => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    const updateActivity = () => {
      if (user) {
        updateLastActivity();
      }
    };

    events.forEach(event => {
      window.addEventListener(event, updateActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, [user, updateLastActivity]);

  // Set up token refresh check
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      if (isTokenExpired()) {
        console.log("Token expired during refresh check");
        logout();
      } else if (checkSessionTimeout()) {
        console.log("Session timeout");
        logout();
      } else {
        updateLastActivity();
      }
    }, TOKEN_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user, isTokenExpired, checkSessionTimeout, updateLastActivity]);

  const loginUser = (data) => {
    try {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data));
      localStorage.setItem("lastActivity", Date.now().toString());
      setUser(data);
    } catch (e) {
      console.error("Error saving user data:", e);
    }
  };

  const logout = useCallback(() => {
    // Store user role before logout (since user will be null after logout)
    const userRole = user?.role || user?.userType;
    const wasCustomer = userRole === "Customer";
    
    // Clear auth-related items
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("lastActivity");
    localStorage.removeItem("returnUrl");
    
    // Clear all cart data (both guest and user carts)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("guestCart_")) {
        localStorage.removeItem(key);
      }
    });
    
    setUser(null);
    
    // Always redirect customers to home page on logout
    if (wasCustomer) {
      window.location.href = "/";
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loginUser, logout, isCheckingAuth }}>
      {children}
    </AuthContext.Provider>
  );
};
