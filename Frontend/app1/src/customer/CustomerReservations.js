import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Grid,
  Paper,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
} from "@mui/material";
import {
  CalendarToday,
  AccessTime,
  People,
  CheckCircle,
  Cancel,
  Schedule,
  Phone,
  Email,
  Close,
  Restaurant,
  QrCode,
  ShoppingCart,
} from "@mui/icons-material";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import Layout from "../shared/components/Layout";
import {
  getMyReservations,
  cancelReservation,
  acceptSuggestedTime,
} from "../services/ReservationService";

const CustomerReservations = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [actionDialog, setActionDialog] = useState({ open: false, reservation: null, action: null });

  useEffect(() => {
    if (user) {
      fetchReservations();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const response = await getMyReservations();
      const reservationsData = response.data || [];

      const normalizedReservations = reservationsData.map((r) => ({
        reservationId: r.reservationId || r.ReservationId,
        restaurantId: r.restaurantId || r.RestaurantId,
        restaurantName: r.restaurantName || r.RestaurantName,
        tableId: r.tableId || r.TableId,
        tableNumber: r.tableNumber || r.TableNumber,
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

  const handleCancel = async () => {
    if (!actionDialog.reservation || !actionDialog.reservation.reservationId) {
      setSnackbar({
        open: true,
        message: "Reservation information is missing",
        severity: "error",
      });
      return;
    }

    try {
      await cancelReservation(actionDialog.reservation.reservationId);
      setSnackbar({
        open: true,
        message: "Reservation cancelled successfully!",
        severity: "success",
      });
      setActionDialog({ open: false, reservation: null, action: null });
      fetchReservations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.response?.data || err.message || "Failed to cancel reservation",
        severity: "error",
      });
    }
  };

  const handleAcceptSuggestedTime = async () => {
    if (!actionDialog.reservation || !actionDialog.reservation.reservationId) {
      setSnackbar({
        open: true,
        message: "Reservation information is missing",
        severity: "error",
      });
      return;
    }

    try {
      await acceptSuggestedTime(actionDialog.reservation.reservationId);
      setSnackbar({
        open: true,
        message: "Suggested time accepted! Reservation confirmed.",
        severity: "success",
      });
      setActionDialog({ open: false, reservation: null, action: null });
      fetchReservations();
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.message || err.response?.data || err.message || "Failed to accept suggested time",
        severity: "error",
      });
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

  if (!user) {
    return (
      <Layout>
        <Alert severity="info" sx={{ mb: 3 }}>
          Please login to view your reservations.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="My Reservations" backPath="/customer-dashboard">
      <Box sx={{ py: 4 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : reservations.length === 0 ? (
          <Card sx={{ borderRadius: "16px" }}>
            <CardContent sx={{ textAlign: "center", py: 6 }}>
              <CalendarToday sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
              <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300, mb: 2 }}>
                No reservations found
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate("/customer-restaurants")}
                sx={{ mt: 2 }}
              >
                Browse Restaurants
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {reservations.map((reservation) => (
              <Grid item xs={12} md={6} key={reservation.reservationId}>
                <Card sx={{ borderRadius: "16px", height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {reservation.restaurantName}
                        </Typography>
                        <Chip
                          label={reservation.status}
                          color={getStatusColor(reservation.status)}
                          size="small"
                          sx={{ mb: 1 }}
                        />
                      </Box>
                      <Restaurant sx={{ fontSize: 32, color: "primary.main" }} />
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Grid container spacing={2}>
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <CalendarToday sx={{ fontSize: 18 }} />
                          <Typography variant="body2">
                            <strong>Date:</strong> {formatDate(reservation.reservationDate)}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <AccessTime sx={{ fontSize: 18 }} />
                          <Typography variant="body2">
                            <strong>Time:</strong> {formatTime(reservation.reservationTime)}
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
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          <People sx={{ fontSize: 18 }} />
                          <Typography variant="body2">
                            <strong>Guests:</strong> {reservation.numberOfGuests} • <strong>Duration:</strong> {reservation.duration} min
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          <strong>Table:</strong> {reservation.tableNumber}
                        </Typography>
                      </Grid>
                      {reservation.notes && (
                        <Grid item xs={12}>
                          <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)" }}>
                            <strong>Your Notes:</strong> {reservation.notes}
                          </Typography>
                        </Grid>
                      )}
                      {reservation.adminNotes && (
                        <Grid item xs={12}>
                          <Alert severity="info" sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              <strong>Restaurant Message:</strong> {reservation.adminNotes}
                            </Typography>
                          </Alert>
                        </Grid>
                      )}
                    </Grid>

                    <Divider sx={{ my: 2 }} />

                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                      {reservation.status === "Pending" && reservation.suggestedTime && (
                        <Button
                          variant="contained"
                          color="success"
                          size="small"
                          startIcon={<CheckCircle />}
                          onClick={() => setActionDialog({ open: true, reservation, action: "accept" })}
                        >
                          Accept Suggested Time
                        </Button>
                      )}
                      {(reservation.status === "Confirmed" || reservation.status === "Arrived") && (
                        <>
                          <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<QrCode />}
                            onClick={() => navigate(`/table-menu/${reservation.tableId}`)}
                          >
                            View QR Code & Order
                          </Button>
                          <Button
                            variant="outlined"
                            color="primary"
                            size="small"
                            startIcon={<ShoppingCart />}
                            onClick={() => navigate(`/customer-restaurants/${reservation.restaurantId}`, { state: { tableId: reservation.tableId } })}
                          >
                            Order Items
                          </Button>
                        </>
                      )}
                      {(reservation.status === "Pending" || reservation.status === "Confirmed") && (
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<Cancel />}
                          onClick={() => setActionDialog({ open: true, reservation, action: "cancel" })}
                        >
                          Cancel
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Action Dialog */}
        <Dialog
          open={actionDialog.open}
          onClose={() => setActionDialog({ open: false, reservation: null, action: null })}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography>
                {actionDialog.action === "cancel" ? "Cancel Reservation" : "Accept Suggested Time"}
              </Typography>
              <IconButton onClick={() => setActionDialog({ open: false, reservation: null, action: null })}>
                <Close />
              </IconButton>
            </Box>
          </DialogTitle>
          <DialogContent>
            {actionDialog.reservation && (
              <Box>
                {actionDialog.action === "accept" ? (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Accept the suggested time: <strong>{formatTime(actionDialog.reservation.suggestedTime)}</strong> on{" "}
                      {formatDate(actionDialog.reservation.reservationDate)}?
                    </Typography>
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Are you sure you want to cancel this reservation at {actionDialog.reservation.restaurantName}?
                    </Typography>
                  </Alert>
                )}
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Date:</strong> {formatDate(actionDialog.reservation.reservationDate)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  <strong>Time:</strong> {formatTime(actionDialog.reservation.reservationTime)}
                </Typography>
                <Typography variant="body2">
                  <strong>Table:</strong> {actionDialog.reservation.tableNumber}
                </Typography>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialog({ open: false, reservation: null, action: null })}>
              No
            </Button>
            <Button
              variant="contained"
              color={actionDialog.action === "accept" ? "success" : "error"}
              onClick={actionDialog.action === "accept" ? handleAcceptSuggestedTime : handleCancel}
            >
              {actionDialog.action === "accept" ? "Accept" : "Yes, Cancel"}
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

export default CustomerReservations;


