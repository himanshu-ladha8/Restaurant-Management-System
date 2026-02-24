import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {  Box,  Container,  Card,  CardContent,  TextField,  Button,  Typography,  Alert,  Link as MuiLink,  MenuItem,  Select,  FormControl,  InputLabel,} from "@mui/material";
import { AdminPanelSettings, Person, Email, Lock, Phone } from "@mui/icons-material";
import { register } from "../api/authApi";
import { useThemeMode } from "../context/ThemeContext";

const AdminRegister = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phonenumber: "",
    role: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    // Validate role is selected
    if (!form.role) {
      setError("Please select a role");
      setLoading(false);
      return;
    }
    
    // Only allow Admin or RestaurantAdmin
    if (form.role === "Customer") {
      setError("This registration is for Admin/Restaurant Admin only. Please use customer registration.");
      setLoading(false);
      return;
    }
    
    try {
      const response = await register(form);
      
      // If RestaurantAdmin, redirect to complete restaurant details
      if (form.role === "RestaurantAdmin" && response.data?.userId) {
        navigate("/complete-restaurant-details", {
          state: { userId: response.data.userId }
        });
      } else {
        // For Admin, go to login
        alert("Registration successful! Please login.");
        navigate("/admin-login");
      }
    } catch (err) {
      setError(err.response?.data || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: mode === 'dark' ? "#0a0a0a" : "#f5f5f5",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card 
          sx={{ 
            borderRadius: "4px", 
            boxShadow: mode === 'dark' ? "0 24px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)" : "0 24px 64px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)",
            transition: "all 0.3s",
            animation: 'fadeIn 0.6s ease-in',
            bgcolor: mode === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(30px) saturate(180%)',
            WebkitBackdropFilter: 'blur(30px) saturate(180%)',
            border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
            '@keyframes fadeIn': {
              from: { opacity: 0, transform: 'translateY(-20px)' },
              to: { opacity: 1, transform: 'translateY(0)' }
            },
            '&:hover': {
              boxShadow: mode === 'dark' ? "0 32px 80px rgba(0,0,0,0.6), 0 12px 32px rgba(0,0,0,0.4)" : "0 32px 80px rgba(0,0,0,0.15), 0 12px 32px rgba(0,0,0,0.1)",
              border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid rgba(0, 0, 0, 0.12)',
            },
          }}
        >
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ 
              textAlign: "center", 
              mb: 4,
              animation: 'fadeIn 0.8s ease-in',
            }}>
              <AdminPanelSettings sx={{ 
                fontSize: 60, 
                color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a", 
                mb: 2,
                transition: "all 0.3s",
                "&:hover": {
                  transform: "scale(1.1) rotate(5deg)",
                },
              }} />
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 300, 
                  mb: 1,
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  letterSpacing: "0.05em",
                  fontFamily: "'Playfair Display', 'Georgia', serif",
                }}
              >
                Admin / Restaurant Admin Registration
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Create your account to get started
              </Typography>
            </Box>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3,
                  borderRadius: "12px",
                  animation: 'slideIn 0.3s ease-out',
                  bgcolor: mode === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                  border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                  color: mode === 'dark' ? '#FFFFFF' : '#1a1a1a',
                }}
              >
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                name="fullName"
                label="Full Name"
                value={form.fullName}
                onChange={handleChange}
                required
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(78, 205, 196, 0.2)",
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <Person sx={{ mr: 1, color: "action.active" }} />,
                }}
              />

              <TextField
                fullWidth
                name="email"
                type="email"
                label="Email Address"
                value={form.email}
                onChange={handleChange}
                required
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(78, 205, 196, 0.2)",
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <Email sx={{ mr: 1, color: "action.active" }} />,
                }}
              />

              <TextField
                fullWidth
                name="password"
                type="password"
                label="Password"
                value={form.password}
                onChange={handleChange}
                required
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(78, 205, 196, 0.2)",
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <Lock sx={{ mr: 1, color: "action.active" }} />,
                }}
              />
              
              <TextField
                fullWidth
                name="phonenumber"
                type="tel"
                label="Phone Number"
                value={form.phonenumber}
                onChange={handleChange}
                required
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(78, 205, 196, 0.2)",
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: "action.active" }} />,
                }}
              />

              <FormControl 
                fullWidth 
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                  },
                }}
              >
                <InputLabel>Role</InputLabel>
                <Select
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  label="Role"
                  required
                >
                  <MenuItem value="" disabled>Select Role</MenuItem>
                  <MenuItem value="RestaurantAdmin">Restaurant Admin</MenuItem>
                  <MenuItem value="Admin">Admin</MenuItem>
                </Select>
              </FormControl>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ 
                  mb: 3, 
                  py: 1.5,
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: 600,
                  background: "linear-gradient(135deg, #4ECDC4 0%, #44A08D 100%)",
                  boxShadow: "0 4px 12px rgba(78, 205, 196, 0.3)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: "0 8px 20px rgba(78, 205, 196, 0.4)",
                    background: "linear-gradient(135deg, #3BA39C 0%, #357A6F 100%)",
                  },
                  "&:disabled": {
                    background: "rgba(0, 0, 0, 0.12)",
                  },
                }}
              >
                {loading ? "Registering..." : "Register"}
              </Button>

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{" "}
                  <MuiLink 
                    component={Link} 
                    to="/admin-login" 
                    sx={{ 
                      fontWeight: 600,
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.05)",
                      },
                    }}
                  >
                    Login here
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default AdminRegister;
