import { useState } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import {  Box,  Container,  Card,  CardContent,  TextField,  Button,  Typography,  Alert,  Link as MuiLink,  CircularProgress,} from "@mui/material";
import { Email, ArrowBack } from "@mui/icons-material";
import { forgotPassword } from "../api/authApi";
import { useThemeMode } from "../context/ThemeContext";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLink, setResetLink] = useState("");

  // Get the login type from location state or URL
  const loginType = location.state?.loginType || "admin";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    if (!email.trim()) {
      setError("Please enter your email address");
      setLoading(false);
      return;
    }

    try {
      const response = await forgotPassword(email);
      setSuccess(true);
      // In development, the backend returns the reset link
      // In production, this would be sent via email
      if (response.data?.resetLink) {
        setResetLink(response.data.resetLink);
      } else if (response.data?.resetToken) {
        // Construct the reset link if only token is provided
        const baseUrl = window.location.origin;
        const loginType = location.state?.loginType || "admin";
        setResetLink(`${baseUrl}/reset-password?token=${response.data.resetToken}&type=${loginType}`);
      }
    } catch (err) {
      setError(err.response?.data || "Failed to send password reset email. Please try again.");
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
          bgcolor: mode === 'dark' ? 'rgba(26, 26, 26, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
          border: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        }}>
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Email sx={{ fontSize: 60, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a", mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 300, mb: 1, color: mode === 'dark' ? "white" : "#1a1a1a", letterSpacing: "0.05em", fontFamily: "'Playfair Display', 'Georgia', serif" }}>
                Forgot Password?
              </Typography>
              <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }}>
                Enter your email address and we'll send you a link to reset your password
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
                    Password reset link generated!
                  </Typography>
                  <Typography variant="body2" sx={{ mb: 2, color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)", fontWeight: 300 }}>
                    {resetLink ? (
                      <>
                        <strong style={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "#1a1a1a" }}>Development Mode:</strong> Click the link below to reset your password.
                        <br />
                        <br />
                        <Typography
                          component="a"
                          href={resetLink}
                          sx={{
                            color: mode === 'dark' ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)",
                            textDecoration: "underline",
                            wordBreak: "break-all",
                            display: "block",
                            mt: 1,
                            "&:hover": {
                              color: mode === 'dark' ? "white" : "#1a1a1a",
                            },
                          }}
                        >
                          {resetLink}
                        </Typography>
                      </>
                    ) : (
                      "Please check your email inbox for instructions on how to reset your password. If you don't see the email, please check your spam folder."
                    )}
                  </Typography>
                </Alert>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate(getLoginPath())}
                  sx={{ mb: 2 }}
                >
                  Back to Login
                </Button>
              </Box>
            ) : (
              <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
                <TextField
                  fullWidth
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: <Email sx={{ mr: 1, color: "action.active" }} />,
                  }}
                  autoFocus
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{ mb: 3, py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : "Send Reset Link"}
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

export default ForgotPassword;

