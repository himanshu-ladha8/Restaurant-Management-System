import { useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {  Box,  Container,  Card,  CardContent,  TextField,  Button,  Typography,  Alert,  CircularProgress,} from "@mui/material";
import { Restaurant } from "@mui/icons-material";
import { completeRestaurantSetup } from "../services/RestaurantService";
import { AuthContext } from "../context/AuthContext";

const CompleteRestaurantDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  // userId from registration (state) or from logged-in user (after login)
  const userId = location.state?.userId ?? user?.userId;

  const [form, setForm] = useState({
    restaurantName: "",
    address: "",
    phone: "",
    openTime: "",
    closeTime: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    if (!userId) {
      setError("Invalid session. Please log in or register again.");
      setTimeout(() => navigate("/admin-register"), 2000);
      return;
    }

    if (!form.restaurantName.trim()) {
      setError("Please enter restaurant name");
      return;
    }

    setLoading(true);
    try {
      await completeRestaurantSetup(userId, form);
      alert("Restaurant details saved successfully! You can now login.");
      navigate("/admin-login");
    } catch (err) {
      setError(err.response?.data || "Failed to save restaurant details");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#0a0a0a",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <Card sx={{ borderRadius: 4, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
          <CardContent sx={{ p: 5 }}>
            <Box sx={{ textAlign: "center", mb: 4 }}>
              <Restaurant sx={{ fontSize: 60, color: "primary.main", mb: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 600, mb: 1 }}>
                Complete Restaurant Details
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 300 }}>
                Please provide your restaurant information to complete registration
              </Typography>
            </Box>

            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
              <TextField
                fullWidth
                name="restaurantName"
                label="Restaurant Name"
                value={form.restaurantName}
                onChange={handleChange}
                required
                sx={{ mb: 3 }}
                autoFocus
              />

              <TextField
                fullWidth
                name="address"
                label="Address"
                value={form.address}
                onChange={handleChange}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                name="phone"
                type="tel"
                label="Phone Number"
                value={form.phone}
                onChange={handleChange}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                name="openTime"
                type="time"
                label="Opening Time"
                value={form.openTime}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                name="closeTime"
                type="time"
                label="Closing Time"
                value={form.closeTime}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ mb: 3 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ py: 1.5 }}
              >
                {loading ? <CircularProgress size={24} /> : "Complete Registration"}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default CompleteRestaurantDetails;
