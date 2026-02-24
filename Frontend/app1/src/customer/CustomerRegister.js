import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {  Box,  Container,  Card,  CardContent,  TextField,  Button,  Typography,  Alert,  Link as MuiLink,} from "@mui/material";
import { Person, Email, Lock, Phone } from "@mui/icons-material";
import { register } from "../api/authApi";
import { validateEmail, validatePhone, validatePassword, validateRequired } from "../utils/validation";
import { useThemeMode } from "../context/ThemeContext";

const CustomerRegister = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phonenumber: "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate full name
    const nameValidation = validateRequired(form.fullName, "Full name");
    if (!nameValidation.valid) {
      newErrors.fullName = nameValidation.message;
    }

    // Validate email
    if (!validateEmail(form.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Validate password
    const passwordValidation = validatePassword(form.password);
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }

    // Validate phone
    if (form.phonenumber && !validatePhone(form.phonenumber)) {
      newErrors.phonenumber = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});

    if (!validateForm()) {
      setError("Please fix the errors in the form");
      return;
    }

    setLoading(true);
    
    try {
      // Set role to Customer automatically
      const registrationData = {
        ...form,
        role: "Customer"
      };
      
      const response = await register(registrationData);
      
      alert("Registration successful! Please login.");
      navigate("/customer-login");
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
              <Person sx={{ 
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
                Customer Registration
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Create your account to start ordering
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
                error={!!errors.fullName}
                helperText={errors.fullName}
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
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
                error={!!errors.email}
                helperText={errors.email}
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
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
                error={!!errors.password}
                helperText={errors.password || "Must be at least 6 characters with letters and numbers"}
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
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
                error={!!errors.phonenumber}
                helperText={errors.phonenumber}
                sx={{ 
                  mb: 3,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "4px",
                    transition: "all 0.3s",
                    "&:hover": {
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
                    },
                    "&.Mui-focused": {
                      boxShadow: "0 4px 12px rgba(102, 126, 234, 0.2)",
                    },
                  },
                }}
                InputProps={{
                  startAdornment: <Phone sx={{ mr: 1, color: "action.active" }} />,
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ 
                  mb: 3, 
                  py: 1.5,
                  borderRadius: "4px",
                  textTransform: "uppercase",
                  fontWeight: 300,
                  letterSpacing: "0.1em",
                  background: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                  color: mode === 'dark' ? "white" : "#1a1a1a",
                  border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                  boxShadow: mode === 'dark' ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: mode === 'dark' ? "0 8px 20px rgba(0, 0, 0, 0.4)" : "0 8px 20px rgba(0, 0, 0, 0.12)",
                    background: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                  },
                  "&:disabled": {
                    background: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
                  },
                }}
              >
                {loading ? "Registering..." : "Register"}
              </Button>

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                  Already have an account?{" "}
                  <MuiLink 
                    component={Link} 
                    to="/customer-login" 
                    sx={{ 
                      fontWeight: 600,
                      color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a",
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        color: mode === 'dark' ? "white" : "#1a1a1a",
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

export default CustomerRegister;
