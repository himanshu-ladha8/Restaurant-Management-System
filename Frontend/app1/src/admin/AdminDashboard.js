import { useContext, useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { Box, Grid, Card, CardContent, Typography, CircularProgress } from "@mui/material";
import { TrendingUp } from "@mui/icons-material";
import Layout from "../shared/components/Layout";
import { getAllRestaurants } from "../services/RestaurantService";
import { getAllUsers } from "../services/UserService";

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [stats, setStats] = useState({
    restaurants: 0,
    users: 0,
    loading: true,
  });

  const navLinks = [
    { path: "/admin-restaurants", label: "Restaurants" },
    { path: "/admin-users", label: "Users" },
  ];

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [restaurantsRes, usersRes] = await Promise.all([
          getAllRestaurants(),
          getAllUsers(),
        ]);

        setStats({
          restaurants: restaurantsRes.data?.length || 0,
          users: usersRes.data?.length || 0,
          loading: false,
        });
      } catch (err) {
        console.error("Error fetching stats:", err);
        setStats({ restaurants: 0, users: 0, loading: false });
      }
    };

    fetchStats();
  }, []);

  // Auto-scroll function for dashboard cards
  const handleCardClick = (targetId) => {
    setTimeout(() => {
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        targetElement.style.transition = 'box-shadow 0.3s ease';
        targetElement.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.3)';
        setTimeout(() => {
          targetElement.style.boxShadow = '';
        }, 2000);
      }
    }, 100);
  };

  return (
    <Layout title="Admin Dashboard" navLinks={navLinks}>
      <Box>
        <Box sx={{ 
          mb: 4,
          animation: 'fadeIn 0.6s ease-in',
          '@keyframes fadeIn': {
            from: { opacity: 0, transform: 'translateY(-10px)' },
            to: { opacity: 1, transform: 'translateY(0)' }
          }
        }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 600, 
              mb: 1,
              color: mode === 'dark' ? 'white' : '#1a1a1a',
              fontWeight: 300,
              letterSpacing: '0.05em',
              fontFamily: "'Playfair Display', 'Georgia', serif",
            }}
          >
            Welcome, {user?.email || "Admin"}!
          </Typography>
          <Typography variant="body1" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
            Manage your restaurant management system
          </Typography>
        </Box>

        {stats.loading ? (
          <Box sx={{ 
            display: "flex", 
            flexDirection: "column",
            justifyContent: "center", 
            alignItems: "center",
            py: 8,
            gap: 2,
          }}>
            <CircularProgress 
              size={60} 
              thickness={4}
              sx={{
                animation: 'pulse 2s ease-in-out infinite',
                '@keyframes pulse': {
                  '0%, 100%': { opacity: 1 },
                  '50%': { opacity: 0.5 },
                },
              }}
            />
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
              Loading dashboard...
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3} justifyContent="center">
            <Grid item xs={12} sm={6} md={4}>
              <Card
                onClick={() => handleCardClick('system-overview-section')}
                sx={{
                  background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                  border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                    transition: "left 0.5s",
                  },
                  "&:hover": {
                    transform: "translateY(-8px) scale(1.02)",
                    boxShadow: "0 12px 32px rgba(102, 126, 234, 0.4)",
                    "&::before": {
                      left: "100%",
                    },
                  },
                  "&:active": {
                    transform: "translateY(-4px) scale(1.01)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <TrendingUp sx={{ fontSize: 60, mb: 2, color: mode === 'dark' ? "white" : "#1a1a1a" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                    System Overview
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                    Total Restaurants: {stats.restaurants}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.9, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
                    Total Users: {stats.users}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card
                onClick={() => {
                  const element = document.getElementById('restaurants-section');
                  if (element) {
                    window.location.href = '/admin-restaurants';
                  } else {
                    window.location.href = '/admin-restaurants';
                  }
                }}
                sx={{
                  background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                  border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 12px rgba(240, 147, 251, 0.3)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                    transition: "left 0.5s",
                  },
                  "&:hover": {
                    transform: "translateY(-8px) scale(1.02)",
                    boxShadow: "0 12px 32px rgba(240, 147, 251, 0.4)",
                    "&::before": {
                      left: "100%",
                    },
                  },
                  "&:active": {
                    transform: "translateY(-4px) scale(1.01)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                    {stats.restaurants}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                    Restaurants
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card
                onClick={() => {
                  const element = document.getElementById('users-section');
                  if (element) {
                    window.location.href = '/admin-users';
                  } else {
                    window.location.href = '/admin-users';
                  }
                }}
                sx={{
                  background: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)",
                  border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  borderRadius: "16px",
                  cursor: "pointer",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 4px 12px rgba(79, 172, 254, 0.3)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: "-100%",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)",
                    transition: "left 0.5s",
                  },
                  "&:hover": {
                    transform: "translateY(-8px) scale(1.02)",
                    boxShadow: "0 12px 32px rgba(79, 172, 254, 0.4)",
                    "&::before": {
                      left: "100%",
                    },
                  },
                  "&:active": {
                    transform: "translateY(-4px) scale(1.01)",
                  },
                }}
              >
                <CardContent sx={{ p: 4, textAlign: "center" }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                    {stats.users}
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: mode === 'dark' ? "white" : "#1a1a1a" }}>
                    Users
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </Layout>
  );
};

export default AdminDashboard;
