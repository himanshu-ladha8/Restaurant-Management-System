import { useState, useEffect, useContext } from "react";
import { formatDateTime } from "../utils/dateUtils";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Divider,
  Stack,
} from "@mui/material";
import {
  CalendarToday,
  AccessTime,
  People,
  CheckCircle,
  Cancel,
  Schedule,
  FilterList,
  Phone,
  Email,
  Notes,
  Close,
} from "@mui/icons-material";
import {
  getRestaurantReservations,
  updateReservationStatus,
  suggestTime,
  getAvailableSlots,
} from "../services/ReservationService";
import Layout from "../shared/components/Layout";

const RestaurantReservations = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // Dialog states
  const [actionDialog, setActionDialog] = useState({ open: false, reservation: null, action: null, adminNotes: "" });
  const [suggestTimeDialog, setSuggestTimeDialog] = useState({ open: false, reservation: null });
  const [suggestTimeData, setSuggestTimeData] = useState({ time: "", notes: "" });
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const navLinks = [
    { path: "/restaurant-dashboard", label: "Dashboard" },
    { path: "/restaurant-tables", label: "Tables" },
    { path: "/restaurant-meals", label: "Meals" },
    { path: "/restaurant-orders", label: "Orders" },
    { path: "/restaurant-reservations", label: "Reservations" },
    { path: "/restaurant-reviews", label: "Reviews" },
  ];

  useEffect(() => {
    fetchReservations();
  }, [statusFilter, dateFilter]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await getRestaurantReservations(statusFilter || null, dateFilter || null);
      const reservationsData = response.data || [];

      const normalizedReservations = reservationsData.map((r) => ({
        reservationId: r.reservationId || r.ReservationId,
        restaurantId: r.restaurantId || r.RestaurantId,
        restaurantName: r.restaurantName || r.RestaurantName,
        tableId: r.tableId || r.TableId,
        tableNumber: r.tableNumber || r.TableNumber,
        tableCapacity: r.tableCapacity || r.TableCapacity,
        customerId: r.customerId || r.CustomerId,
        customerName: r.customerName || r.CustomerName,
        customerEmail: r.customerEmail || r.CustomerEmail,
        customerPhone: r.customerPhone || r.CustomerPhone,
        reservationDate: r.reservationDate || r.ReservationDate,
        reservationTime: r.reservationTime || r.ReservationTime,
        suggestedTime: r.suggestedTime || r.SuggestedTime,
        duration: r.duration || r.Duration,
        numberOfGuests: r.numberOfGuests || r.NumberOfGuests,
        status: r.status || r.Status,
        notes: r.notes || r.Notes,
        adminNotes: r.adminNotes || r.AdminNotes,
        createdAt: r.createdAt || r.CreatedAt,
        updatedAt: r.updatedAt || r.UpdatedAt,
      }));

      setReservations(normalizedReservations);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setSnackbar({
        open: true,
        message: "Failed to load reservations: " + (err.response?.data || err.message),
        severity: "error",
      });
      setReservations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reservationId, status, adminNotes = null) => {
    try {
      await updateReservationStatus(reservationId, status, adminNotes);
      setSnackbar({
        open: true,
        message: `Reservation ${status.toLowerCase()} successfully!`,
        severity: "success",
      });
      setActionDialog({ open: false, reservation: null, action: null, adminNotes: "" });
      fetchReservations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.response?.data || err.message || "Failed to update reservation",
        severity: "error",
      });
    }
  };

  const handleSuggestTime = async () => {
    if (!suggestTimeData.time) {
      setSnackbar({ open: true, message: "Please select a time", severity: "warning" });
      return;
    }

    if (!suggestTimeDialog.reservation || !suggestTimeDialog.reservation.reservationId) {
      setSnackbar({ open: true, message: "Reservation information is missing", severity: "error" });
      return;
    }

    try {
      const [hours, minutes] = suggestTimeData.time.split(":").map(Number);
      const timeSpan = `${hours}:${minutes.toString().padStart(2, "0")}:00`;

      await suggestTime(suggestTimeDialog.reservation.reservationId, timeSpan, suggestTimeData.notes);
      setSnackbar({
        open: true,
        message: "Alternative time suggested to customer successfully!",
        severity: "success",
      });
      setSuggestTimeDialog({ open: false, reservation: null });
      setSuggestTimeData({ time: "", notes: "" });
      fetchReservations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.response?.data || err.message || "Failed to suggest time",
        severity: "error",
      });
    }
  };

  const handleOpenSuggestTime = async (reservation) => {
    setActionDialog({ open: false, reservation: null, action: null });
    setSuggestTimeDialog({ open: true, reservation });
    setSuggestTimeData({ time: "", notes: "" });

    // Fetch available slots
    try {
      setLoadingSlots(true);
      // Handle both date string and Date object formats
      let dateStr;
      if (typeof reservation.reservationDate === 'string') {
        dateStr = reservation.reservationDate.includes('T') 
          ? reservation.reservationDate.split("T")[0] 
          : reservation.reservationDate;
      } else {
        // If it's a Date object or other format, convert to yyyy-MM-dd
        const date = new Date(reservation.reservationDate);
        dateStr = date.toISOString().split("T")[0];
      }
      
      const response = await getAvailableSlots(reservation.tableId, dateStr, reservation.duration);
      const slots = response.data || [];
      setAvailableSlots(slots);
      
      if (slots.length === 0) {
        setSnackbar({
          open: true,
          message: "No available time slots found for this date and table.",
          severity: "info",
        });
      }
    } catch (err) {
      console.error("Error fetching available slots:", err);
      setSnackbar({
        open: true,
        message: "Failed to load available time slots: " + (err.response?.data?.message || err.response?.data || err.message),
        severity: "error",
      });
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending":
        return "warning";
      case "Confirmed":
        return "success";
      case "Arrived":
        return "info";
      case "Rejected":
        return "error";
      case "Cancelled":
        return "default";
      case "Completed":
        return "info";
      default:
        return "default";
    }
  };

  const formatTime = (timeSpan) => {
    if (!timeSpan) return "N/A";
    const parts = timeSpan.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  const formatDate = (date) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  };

  return (
    <Layout title="Reservations" backPath="/restaurant-dashboard" navLinks={navLinks}>
      <Box sx={{ py: 4 }}>
        {/* Filters */}
        <Card sx={{ mb: 3, borderRadius: "16px" }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6} md={4}>
                <FormControl fullWidth>
                  <InputLabel>Filter by Status</InputLabel>
                  <Select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    label="Filter by Status"
                  >
                    <MenuItem value="">All Statuses</MenuItem>
                    <MenuItem value="Pending">Pending</MenuItem>
                    <MenuItem value="Confirmed">Confirmed</MenuItem>
                    <MenuItem value="Arrived">Arrived</MenuItem>
                    <MenuItem value="Rejected">Rejected</MenuItem>
                    <MenuItem value="Cancelled">Cancelled</MenuItem>
                    <MenuItem value="Completed">Completed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  label="Filter by Date"
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  onClick={() => {
                    setStatusFilter("");
                    setDateFilter("");
                  }}
                  fullWidth
                >
                  Clear Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Reservations List */}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : reservations.length === 0 ? (
          <Card sx={{ borderRadius: "16px" }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <CalendarToday sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
              <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", fontWeight: 300 }}>
                No reservations found
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <TableContainer component={Paper} sx={{ borderRadius: "16px" }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Date & Time</strong></TableCell>
                  <TableCell><strong>Customer</strong></TableCell>
                  <TableCell><strong>Table</strong></TableCell>
                  <TableCell><strong>Guests</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Actions</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.reservationId} hover>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {formatDate(reservation.reservationDate)}
                        </Typography>
                        <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)" }}>
                          {formatTime(reservation.reservationTime)}
                          {reservation.suggestedTime && (
                            <Chip
                              label={`Suggested: ${formatTime(reservation.suggestedTime)}`}
                              size="small"
                              color="info"
                              sx={{ ml: 1 }}
                            />
                          )}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {reservation.customerName}
                        </Typography>
                        {reservation.customerPhone && (
                          <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", display: "block" }}>
                            <Phone sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.5 }} />
                            {reservation.customerPhone}
                          </Typography>
                        )}
                        {reservation.customerEmail && (
                          <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)", display: "block" }}>
                            <Email sx={{ fontSize: 12, verticalAlign: "middle", mr: 0.5 }} />
                            {reservation.customerEmail}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        Table {reservation.tableNumber}
                      </Typography>
                      <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)" }}>
                        Capacity: {reservation.tableCapacity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <People sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{reservation.numberOfGuests}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)" }}>
                        {reservation.duration} min
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={reservation.status}
                        color={getStatusColor(reservation.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {reservation.status === "Pending" && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              startIcon={<CheckCircle />}
                              onClick={() => setActionDialog({ open: true, reservation, action: "confirm" })}
                            >
                              Confirm
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Cancel />}
                              onClick={() => setActionDialog({ open: true, reservation, action: "reject" })}
                            >
                              Reject
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              startIcon={<Schedule />}
                              onClick={() => handleOpenSuggestTime(reservation)}
                            >
                              Suggest Time
                            </Button>
                          </>
                        )}
                        {reservation.status === "Confirmed" && (
                          <>
                            <Button
                              size="small"
                              variant="contained"
                              color="info"
                              startIcon={<CheckCircle />}
                              onClick={() => handleStatusUpdate(reservation.reservationId, "Arrived")}
                            >
                              Arrive
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              color="info"
                              onClick={() => handleStatusUpdate(reservation.reservationId, "Completed")}
                            >
                              Mark Complete
                            </Button>
                          </>
                        )}
                        {reservation.status === "Arrived" && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="info"
                            onClick={() => handleStatusUpdate(reservation.reservationId, "Completed")}
                          >
                            Mark Complete
                          </Button>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* Action Dialog (Confirm/Reject) */}
        <Dialog
          open={actionDialog.open}
          onClose={() => setActionDialog({ open: false, reservation: null, action: null, adminNotes: "" })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            {actionDialog.action === "confirm" ? "Confirm Reservation" : "Reject Reservation"}
          </DialogTitle>
          <DialogContent>
            {actionDialog.reservation && (
              <Box>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Customer:</strong> {actionDialog.reservation.customerName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Date:</strong> {formatDate(actionDialog.reservation.reservationDate)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Time:</strong> {formatTime(actionDialog.reservation.reservationTime)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>Table:</strong> {actionDialog.reservation.tableNumber}
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Admin Notes (Optional)"
                  placeholder="Add any notes for this reservation..."
                  value={actionDialog.adminNotes}
                  onChange={(e) => setActionDialog({ ...actionDialog, adminNotes: e.target.value })}
                  sx={{ mt: 2 }}
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialog({ open: false, reservation: null, action: null, adminNotes: "" })}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={actionDialog.action === "confirm" ? "success" : "error"}
              onClick={() => {
                if (!actionDialog.reservation || !actionDialog.reservation.reservationId) {
                  setSnackbar({
                    open: true,
                    message: "Reservation information is missing",
                    severity: "error",
                  });
                  return;
                }
                handleStatusUpdate(
                  actionDialog.reservation.reservationId,
                  actionDialog.action === "confirm" ? "Confirmed" : "Rejected",
                  actionDialog.adminNotes || null
                );
              }}
            >
              {actionDialog.action === "confirm" ? "Confirm" : "Reject"}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Suggest Time Dialog */}
        <Dialog
          open={suggestTimeDialog.open}
          onClose={() => setSuggestTimeDialog({ open: false, reservation: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography>Suggest Alternative Time</Typography>
              <IconButton onClick={() => setSuggestTimeDialog({ open: false, reservation: null })}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {suggestTimeDialog.reservation && (
              <Box>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Current requested time: {formatTime(suggestTimeDialog.reservation.reservationTime)} on{" "}
                  {formatDate(suggestTimeDialog.reservation.reservationDate)}
                </Alert>

                {loadingSlots ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Available Time Slots</InputLabel>
                      <Select
                        value={suggestTimeData.time}
                        onChange={(e) => setSuggestTimeData({ ...suggestTimeData, time: e.target.value })}
                        label="Available Time Slots"
                      >
                        {availableSlots.length === 0 ? (
                          <MenuItem disabled>No available slots</MenuItem>
                        ) : (
                          availableSlots.map((slot, index) => (
                            <MenuItem key={index} value={slot.time}>
                              {slot.time}
                            </MenuItem>
                          ))
                        )}
                      </Select>
                    </FormControl>

                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Message to Customer (Optional)"
                      placeholder="Explain why you're suggesting this time..."
                      value={suggestTimeData.notes}
                      onChange={(e) => setSuggestTimeData({ ...suggestTimeData, notes: e.target.value })}
                    />
                  </>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSuggestTimeDialog({ open: false, reservation: null })}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="info"
              onClick={handleSuggestTime}
              disabled={!suggestTimeData.time}
            >
              Suggest Time
            </Button>
          </DialogActions>
        </Dialog>

        {/* Snackbar */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
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

export default RestaurantReservations;

