import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
} from "@mui/material";
import {
  CalendarToday,
  AccessTime,
  People,
  TableRestaurant,
  ArrowBack,
} from "@mui/icons-material";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import Layout from "../shared/components/Layout";
import { getRestaurantTables } from "../services/CustomerService";
import { createReservation } from "../services/ReservationService";

const CustomerReservationBooking = () => {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();

  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Form state
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [reservationDate, setReservationDate] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [numberOfGuests, setNumberOfGuests] = useState(2);
  const [duration, setDuration] = useState(60);
  const [notes, setNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Get tableId from location state if available
  const tableIdFromState = location.state?.tableId;

  useEffect(() => {
    if (restaurantId) {
      fetchTables();
      // Set default table if provided in state
      if (tableIdFromState) {
        setSelectedTableId(tableIdFromState);
      }
    }
    // Set default customer info from user
    if (user) {
      setCustomerName(user.fullName || user.FullName || "");
      setCustomerPhone(user.phoneNumber || user.PhoneNumber || "");
    }
    // Set minimum date to today
    const today = new Date().toISOString().split("T")[0];
    setReservationDate(today);
  }, [restaurantId, tableIdFromState, user]);

  const fetchTables = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const response = await getRestaurantTables(restaurantId);
      const tablesData = response.data || [];
      const normalizedTables = tablesData.map((table) => ({
        tableId: table.tableId || table.TableId,
        tableNumber: table.tableNumber || table.TableNumber,
        capacity: table.capacity || table.Capacity,
        status: table.status || table.Status,
      }));
      setTables(normalizedTables);
    } catch (err) {
      console.error("Error fetching tables:", err);
      setSnackbar({
        open: true,
        message: "Failed to load tables: " + (err.response?.data || err.message),
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedTableId) {
      setSnackbar({
        open: true,
        message: "Please select a table",
        severity: "error",
      });
      return;
    }

    if (!reservationDate || !reservationTime) {
      setSnackbar({
        open: true,
        message: "Please select date and time",
        severity: "error",
      });
      return;
    }

    // Validate date is not in the past
    const selectedDateTime = new Date(`${reservationDate}T${reservationTime}`);
    if (selectedDateTime < new Date()) {
      setSnackbar({
        open: true,
        message: "Cannot make reservations for past dates/times",
        severity: "error",
      });
      return;
    }

    // Validate number of guests
    const selectedTable = tables.find((t) => t.tableId === selectedTableId);
    if (selectedTable && numberOfGuests > selectedTable.capacity) {
      setSnackbar({
        open: true,
        message: `This table can only accommodate ${selectedTable.capacity} guests`,
        severity: "error",
      });
      return;
    }

    try {
      setSubmitting(true);
      await createReservation({
        restaurantId: parseInt(restaurantId),
        tableId: parseInt(selectedTableId),
        reservationDate: reservationDate,
        reservationTime: reservationTime,
        duration: duration,
        numberOfGuests: numberOfGuests,
        notes: notes || null,
        customerName: customerName || null,
        customerPhone: customerPhone || null,
      });

      setSnackbar({
        open: true,
        message: "Reservation request submitted successfully! Waiting for restaurant confirmation.",
        severity: "success",
      });

      // Navigate to reservations page after a short delay
      setTimeout(() => {
        navigate("/customer-reservations");
      }, 2000);
    } catch (err) {
      console.error("Error creating reservation:", err);
      const errorMessage =
        err.response?.data?.message ||
        err.response?.data ||
        err.message ||
        "Failed to create reservation";
      setSnackbar({
        open: true,
        message: errorMessage,
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const navLinks = [
    { path: "/customer-dashboard", label: "Dashboard" },
    { path: "/customer-restaurants", label: "Restaurants" },
    { path: "/customer-orders", label: "My Orders" },
    { path: "/customer-reservations", label: "My Reservations" },
  ];

  const backPath = restaurantId ? `/customer-restaurant/${restaurantId}` : "/customer-restaurants";

  // Generate time slots (every 30 minutes from 9 AM to 10 PM)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 9; hour < 22; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <Layout title="Book a Table" backPath={backPath} navLinks={navLinks}>
      <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
        <Card sx={{ mb: 3, bgcolor: mode === 'dark' ? "rgba(26, 26, 26, 0.8)" : "rgba(255, 255, 255, 0.9)" }}>
          <CardContent>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              Make a Reservation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Fill in the details below to request a table reservation
            </Typography>
          </CardContent>
        </Card>

        {loading ? (
          <Box display="flex" justifyContent="center" p={4}>
            <CircularProgress />
          </Box>
        ) : (
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Table Selection */}
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel>Select Table</InputLabel>
                  <Select
                    value={selectedTableId || ""}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    label="Select Table"
                  >
                    {tables.map((table) => (
                      <MenuItem key={table.tableId} value={table.tableId}>
                        <Box display="flex" alignItems="center" gap={2} width="100%">
                          <TableRestaurant />
                          <Box flex={1}>
                            <Typography>Table {table.tableNumber}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              Capacity: {table.capacity} guests • Status: {table.status}
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Date Selection */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Reservation Date"
                  type="date"
                  value={reservationDate}
                  onChange={(e) => setReservationDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  required
                  inputProps={{ min: new Date().toISOString().split("T")[0] }}
                  InputProps={{
                    startAdornment: <CalendarToday sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>

              {/* Time Selection */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Reservation Time</InputLabel>
                  <Select
                    value={reservationTime}
                    onChange={(e) => setReservationTime(e.target.value)}
                    label="Reservation Time"
                    startAdornment={<AccessTime sx={{ mr: 1 }} />}
                  >
                    {timeSlots.map((time) => (
                      <MenuItem key={time} value={time}>
                        {time}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Number of Guests */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Number of Guests"
                  type="number"
                  value={numberOfGuests}
                  onChange={(e) => setNumberOfGuests(parseInt(e.target.value) || 1)}
                  required
                  inputProps={{ min: 1, max: 20 }}
                  InputProps={{
                    startAdornment: <People sx={{ mr: 1, color: "text.secondary" }} />,
                  }}
                />
              </Grid>

              {/* Duration */}
              <Grid item xs={12} md={6}>
                <FormControl fullWidth required>
                  <InputLabel>Duration (minutes)</InputLabel>
                  <Select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    label="Duration (minutes)"
                  >
                    <MenuItem value={30}>30 minutes</MenuItem>
                    <MenuItem value={60}>1 hour</MenuItem>
                    <MenuItem value={90}>1.5 hours</MenuItem>
                    <MenuItem value={120}>2 hours</MenuItem>
                    <MenuItem value={180}>3 hours</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {/* Customer Name */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Your Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder={user?.fullName || user?.FullName || "Enter your name"}
                />
              </Grid>

              {/* Customer Phone */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Phone Number"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder={user?.phoneNumber || user?.PhoneNumber || "Enter your phone"}
                />
              </Grid>

              {/* Notes */}
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Special Requests or Notes (Optional)"
                  multiline
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any special requests or notes for the restaurant..."
                />
              </Grid>

              {/* Submit Button */}
              <Grid item xs={12}>
                <Box display="flex" gap={2} justifyContent="flex-end">
                  <Button
                    variant="outlined"
                    onClick={() => navigate(backPath)}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submitting}
                    startIcon={submitting ? <CircularProgress size={20} /> : null}
                  >
                    {submitting ? "Submitting..." : "Submit Reservation"}
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </form>
        )}

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar({ ...snackbar, open: false })}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </Layout>
  );
};

export default CustomerReservationBooking;
