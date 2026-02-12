import { useState, useContext, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import {  Box,  Container,  Card,  CardContent,  TextField,  Button,  Typography,  Alert,  Link as MuiLink,  CircularProgress,  Snackbar,  Chip,  Stepper,  Step,  StepLabel,  InputAdornment,  IconButton,} from "@mui/material";
import { AdminPanelSettings, Lock, Email, VerifiedUser, Visibility, VisibilityOff, CheckCircle } from "@mui/icons-material";
import { sendOtp, verifyOtpLogin } from "../api/authApi";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import { validateEmail, validateRequired } from "../utils/validation";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [receivedOtp, setReceivedOtp] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [successMessage, setSuccessMessage] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const emailInputRef = useRef(null);
  const otpInputRef = useRef(null);
  const { loginUser } = useContext(AuthContext);

  // Auto-focus email input on mount
  useEffect(() => {
    if (!otpSent && emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, [otpSent]);

  // Auto-focus OTP input when OTP is sent
  useEffect(() => {
    if (otpSent && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 100);
    }
  }, [otpSent]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    const passwordValidation = validateRequired(password, "Password");
    if (!passwordValidation.valid) {
      newErrors.password = passwordValidation.message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});

    if (!validateForm()) {
      setError("Please fix the errors in the form");
      return;
    }

    setOtpLoading(true);
    
    try {
      const res = await sendOtp(email, password);
      setOtpSent(true);
      setResendCountdown(60); // Start 60 second countdown
      // Display the OTP received from backend (for development/testing only)
      if (res.data?.otp) {
        setReceivedOtp(res.data.otp);
      }
      setError("");
    } catch (err) {
      setError(err.response?.data || "Failed to send OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0) return;
    
    setError("");
    setOtp("");
    setOtpLoading(true);
    
    try {
      const res = await sendOtp(email, password);
      setResendCountdown(60); // Reset countdown
      if (res.data?.otp) {
        setReceivedOtp(res.data.otp);
      }
      setSuccessMessage("OTP resent successfully!");
      setShowSuccess(true);
    } catch (err) {
      setError(err.response?.data || "Failed to resend OTP. Please try again.");
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setErrors({});

    if (!otp || otp.length !== 4) {
      setError("Please enter a valid 4-digit OTP");
      return;
    }

    setLoading(true);
    
    try {
      const res = await verifyOtpLogin(email, otp);
      
      // Check if user is Admin or RestaurantAdmin
      const role = res.data.role;
      if (role === "Customer") {
        setError("This login is for Admin/Restaurant Admin only. Please use customer login.");
        setLoading(false);
        return;
      }
      
      loginUser(res.data);
      
      // Show success message
      setSuccessMessage("Login successful! Redirecting...");
      setShowSuccess(true);
      
      // Redirect after a brief delay
      setTimeout(() => {
        const returnUrl = localStorage.getItem("returnUrl");
        if (returnUrl) {
          localStorage.removeItem("returnUrl");
          navigate(returnUrl);
        } else {
          // Redirect based on role
          if (role === "Admin") {
            navigate("/admin-dashboard");
          } else if (role === "RestaurantAdmin") {
            navigate("/restaurant-dashboard");
          }
        }
      }, 1000);
    } catch (err) {
      setError(err.response?.data || "Invalid OTP. Please try again.");
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setOtpSent(false);
    setOtp("");
    setReceivedOtp("");
    setError("");
    setResendCountdown(0);
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
          <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
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
                Admin / Restaurant Admin Login
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mb: 1, fontWeight: 300 }}>
                Sign in to manage your restaurant system
              </Typography>
              <Chip 
                label="For Admin & Restaurant Admin only" 
                size="small" 
                variant="outlined"
                sx={{ 
                  mt: 1,
                  borderRadius: "2px",
                  fontWeight: 300,
                  borderColor: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.23)",
                  color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                }}
              />
            </Box>

            {/* Step Indicator */}
            <Stepper 
              activeStep={otpSent ? 1 : 0} 
              sx={{ 
                mb: 4,
                "& .MuiStepLabel-root": {
                  "& .MuiStepLabel-label": {
                    fontWeight: 300,
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                    "&.Mui-active": {
                      color: mode === 'dark' ? "white" : "#1a1a1a",
                    },
                    "&.Mui-completed": {
                      color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
                    },
                  },
                },
                "& .MuiStepIcon-root": {
                  color: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
                  "&.Mui-active": {
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)",
                  },
                  "&.Mui-completed": {
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
                  },
                },
              }}
            >
              <Step>
                <StepLabel>Enter Credentials</StepLabel>
              </Step>
              <Step>
                <StepLabel>Verify OTP</StepLabel>
              </Step>
            </Stepper>

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

            {!otpSent ? (
              <Box component="form" onSubmit={handleSendOtp} sx={{ mt: 3 }}>
                <TextField
                  inputRef={emailInputRef}
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: "" });
                  }}
                  onBlur={() => {
                    if (email && !validateEmail(email)) {
                      setErrors({ ...errors, email: "Please enter a valid email address" });
                    }
                  }}
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
                        boxShadow: "0 4px 12px rgba(78, 205, 196, 0.2)",
                      },
                    },
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Email sx={{ color: "action.active" }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: "" });
                  }}
                  onBlur={() => {
                    if (password && !validateRequired(password, "Password").valid) {
                      setErrors({ ...errors, password: validateRequired(password, "Password").message });
                    }
                  }}
                  required
                  error={!!errors.password}
                  helperText={errors.password}
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
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock sx={{ color: "action.active" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          aria-label="toggle password visibility"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{
                            transition: "all 0.3s",
                            "&:hover": {
                              transform: "scale(1.1)",
                            },
                          }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={otpLoading}
                  sx={{ 
                    mb: 2, 
                    py: 1.5,
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    background: mode === 'dark' ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                    color: mode === 'dark' ? "white" : "#1a1a1a",
                    border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid rgba(0, 0, 0, 0.12)",
                    boxShadow: mode === 'dark' ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    textTransform: "uppercase",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: mode === 'dark' ? "0 8px 20px rgba(0, 0, 0, 0.4)" : "0 8px 20px rgba(0, 0, 0, 0.12)",
                      background: mode === 'dark' ? "rgba(255, 255, 255, 0.2)" : "rgba(0, 0, 0, 0.12)",
                      border: mode === 'dark' ? "1px solid rgba(255, 255, 255, 0.3)" : "1px solid rgba(0, 0, 0, 0.2)",
                    },
                    "&:disabled": {
                      background: "rgba(255, 255, 255, 0.05)",
                      color: "rgba(255, 255, 255, 0.3)",
                    },
                  }}
                  startIcon={otpLoading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {otpLoading ? "Sending OTP..." : "Send OTP"}
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleVerifyOtp} sx={{ mt: 3 }}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3,
                    borderRadius: "12px",
                    animation: 'slideIn 0.3s ease-out',
                    bgcolor: mode === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                    border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 300, mb: 1, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }}>
                    OTP Sent Successfully!
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 1, color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", fontWeight: 300 }}>
                    We've sent a 4-digit OTP to <strong style={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }}>{email}</strong>
                  </Typography>
                  {receivedOtp && (
                    <Typography variant="body2" sx={{ mt: 1, fontFamily: "monospace", fontSize: "0.875rem", color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
                      (Dev Mode) OTP: <strong style={{ fontSize: "1rem", letterSpacing: "0.2rem", color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }}>{receivedOtp}</strong>
                    </Typography>
                  )}
                </Alert>

                <TextField
                  inputRef={otpInputRef}
                  fullWidth
                  label="Enter 4-Digit OTP"
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setOtp(value);
                    if (error) setError("");
                  }}
                  required
                  error={!!errors.otp}
                  helperText={errors.otp || "Enter the 4-digit OTP sent to your email"}
                  sx={{ 
                    mb: 2,
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
                  inputProps={{
                    maxLength: 4,
                    style: { textAlign: "center", fontSize: "1.5rem", letterSpacing: "0.5rem" }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <VerifiedUser sx={{ color: "action.active" }} />
                      </InputAdornment>
                    ),
                  }}
                />

                {/* Resend OTP Section */}
                <Box sx={{ textAlign: "center", mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1, color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                    Didn't receive the OTP?
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    onClick={handleResendOtp}
                    disabled={resendCountdown > 0 || otpLoading}
                    sx={{ 
                      textTransform: "uppercase",
                      fontWeight: 300,
                      letterSpacing: "0.1em",
                      color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                      transition: "all 0.3s",
                      "&:hover": {
                        transform: "scale(1.05)",
                        color: mode === 'dark' ? "white" : "#1a1a1a",
                        bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                      },
                      "&:disabled": {
                        color: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.3)",
                      },
                    }}
                  >
                    {resendCountdown > 0 
                      ? `Resend OTP in ${resendCountdown}s` 
                      : "Resend OTP"}
                  </Button>
                </Box>

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading || otp.length !== 4}
                  sx={{ 
                    mb: 2, 
                    py: 1.5,
                    borderRadius: "12px",
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
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                >
                  {loading ? "Verifying..." : "Verify OTP & Login"}
                </Button>

                <Button
                  fullWidth
                  variant="outlined"
                  size="medium"
                  onClick={handleBackToLogin}
                  sx={{ 
                    mb: 2,
                    borderRadius: "12px",
                    textTransform: "uppercase",
                    fontWeight: 300,
                    letterSpacing: "0.1em",
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                    borderWidth: 2,
                    borderColor: mode === 'dark' ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.23)",
                    transition: "all 0.3s",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      borderWidth: 2,
                      borderColor: mode === 'dark' ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.4)",
                      boxShadow: mode === 'dark' ? "0 4px 12px rgba(0, 0, 0, 0.3)" : "0 4px 12px rgba(0, 0, 0, 0.1)",
                      bgcolor: mode === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.04)",
                    },
                  }}
                >
                  Back to Login
                </Button>
              </Box>
            )}

              <Box sx={{ textAlign: "center", mb: 2 }}>
                <MuiLink
                  component={Link}
                  to="/forgot-password"
                  state={{ loginType: "admin" }}
                  sx={{ 
                    fontWeight: 600, 
                    fontSize: "0.875rem",
                    color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                    transition: "all 0.3s",
                    "&:hover": {
                      transform: "scale(1.05)",
                      color: mode === 'dark' ? "white" : "#1a1a1a",
                    },
                  }}
                >
                  Forgot Password?
                </MuiLink>
              </Box>

              <Box sx={{ textAlign: "center" }}>
                <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                  Don't have an account?{" "}
                  <MuiLink 
                    component={Link} 
                    to="/admin-register" 
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
                    Register here
                  </MuiLink>
                </Typography>
              </Box>
          </CardContent>
        </Card>
      </Container>

      {/* Success Snackbar */}
      <Snackbar
        open={showSuccess}
        autoHideDuration={3000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert 
          onClose={() => setShowSuccess(false)} 
          severity="success" 
          icon={<CheckCircle />}
          sx={{ width: "100%" }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminLogin;
