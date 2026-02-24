import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {  Box,  Container,  Card,  CardContent,  TextField,  Button,  Typography,  Alert,  Link as MuiLink,  CircularProgress,  InputAdornment,  IconButton,} from "@mui/material";
import { Lock, Visibility, VisibilityOff, ArrowBack } from "@mui/icons-material";
import { resetPassword } from "../api/authApi";
import { useThemeMode } from "../context/ThemeContext";

const ResetPassword = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const loginType = searchParams.get("type") || "admin";

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Invalid or missing reset token. Please request a new password reset link.");
    }
  }, [token]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validatePassword = (password) => {
    if (password.length < 6) {
      return "Password must be at least 6 characters long";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("Invalid reset token");
      return;
    }

    if (!form.newPassword || !form.confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    const passwordError = validatePassword(form.newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, form.newPassword);
      setSuccess(true);
      setTimeout(() => {
        navigate(loginType === "customer" ? "/customer-login" : "/admin-login");
      }, 3000);
    } catch (err) {
      setError(err.response?.data || "Failed to reset password. The link may have expired. Please request a new one.");
    } finally {
      setLoading(false);
    }
  };

  const getLoginPath = () => {
    return loginType === "customer" ? "/customer-login" : "/admin-login";
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
        <Card sx={{ 
          borderRadius: 4, 
          boxShadow: mode === 'dark' ? "0 24px 64px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.3)" : "0 24px 64px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.08)",
          bgcolor: "background.paper",
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        }}>
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Lock sx={{ fontSize: 60, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a", mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 300, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a", letterSpacing: "0.05em", fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                Reset Password
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                Enter your new password below
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3, bgcolor: mode === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)', border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)', color: mode === 'dark' ? '#FFFFFF' : '#1a1a1a' }}>
                {error}
              </Alert>
            )}

            {success ? (
              <Box>
                <Alert severity="success" sx={{ mb: 3, bgcolor: mode === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)', border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)' }}>
                  <Typography variant="body1" sx={{ fontWeight: 300, mb: 1, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }}>
                    Password reset successfully!
                  </Typography>
                  <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", fontWeight: 300 }}>
                    Redirecting to login page...
                  </Typography>
                </Alert>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={() => navigate(getLoginPath())}
                >
                  Go to Login
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="New Password"
                  name="newPassword"
                  type={showPassword ? "text" : "password"}
                  value={form.newPassword}
                  onChange={handleChange}
                  required
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: "action.active" }} />,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  helperText="Password must be at least 6 characters"
                />

                <TextField
                  fullWidth
                  label="Confirm New Password"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: <Lock sx={{ mr: 1, color: "action.active" }} />,
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          edge="end"
                        >
                          {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
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
                  disabled={loading || !token}
                  sx={{ mb: 3, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Reset Password"}
                </Button>

                <Box sx={{ textAlign: "center" }}>
                  <MuiLink
                    component={Link}
                    to={getLoginPath()}
                    sx={{ fontWeight: 300, color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", gap: 0.5, textTransform: "uppercase", letterSpacing: "0.1em", "&:hover": { color: mode === 'dark' ? "white" : "#1a1a1a" } }}
                  >
                    <ArrowBack sx={{ fontSize: 16 }} />
                    Back to Login
                  </MuiLink>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default ResetPassword;

