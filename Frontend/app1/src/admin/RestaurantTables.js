import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useThemeMode } from "../context/ThemeContext";
import {  Box,  Button,  Card,  CardContent,  Typography,  TextField,  Dialog,  DialogTitle,  DialogContent,  DialogActions,  Grid,  Chip,  CircularProgress,  Alert,  Snackbar,  MenuItem,  Select,  FormControl,  InputLabel,} from "@mui/material";
import {  Add,  Edit,  Delete,  TableRestaurant,  QrCode,  Download,} from "@mui/icons-material";
import {  getTables,  createTable,  updateTable,  deleteTable,} from "../services/TableService";
import Layout from "../shared/components/Layout";
import { QRCodeSVG } from "qrcode.react";
import { validateTableNumber, validateCapacity, validateRequired } from "../utils/validation";

const RestaurantTables = () => {
  const { user } = useContext(AuthContext);
  const { mode } = useThemeMode();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [form, setForm] = useState({
    tableNumber: "",
    capacity: "",
    status: "Available",
  });
  const [formErrors, setFormErrors] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [qrDialog, setQrDialog] = useState({ open: false, table: null, qrUrl: "" });

  const restaurantId = user?.restaurantId;

  const navLinks = [
    { path: "/restaurant-dashboard", label: "Dashboard" },
    { path: "/restaurant-tables", label: "Tables" },
    { path: "/restaurant-meals", label: "Meals" },
    { path: "/restaurant-orders", label: "Orders" },
    { path: "/restaurant-reservations", label: "Reservations" },
  ];

  useEffect(() => {
    if (restaurantId) {
      fetchTables();
    } else {
      setLoading(false);
    }
  }, [restaurantId]);

  const fetchTables = async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await getTables(restaurantId);
      const tablesData = response.data || [];
      
      const normalizedTables = tablesData.map(table => ({
        tableId: table.tableId || table.TableId,
        tableNumber: table.tableNumber || table.TableNumber,
        capacity: table.capacity || table.Capacity,
        status: table.status || table.Status,
        restaurantId: table.restaurantId || table.RestaurantId
      }));
      
      setTables(normalizedTables);
    } catch (err) {
      console.error("Error fetching tables:", err);
      showSnackbar("Failed to load tables: " + (err.response?.data || err.message), "error");
      setTables([]);
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    // Clear error for this field when user starts typing
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const handleAdd = () => {
    setForm({ tableNumber: "", capacity: "", status: "Available" });
    setEditingTable(null);
    setShowForm(true);
  };

  const handleEdit = (tableNumber) => {
    const table = tables.find(t => (t.tableNumber || t.TableNumber) === tableNumber);
    if (!table) {
      showSnackbar("Table not found", "error");
      return;
    }
    const normalizedTable = {
      tableId: table.tableId || table.TableId,
      tableNumber: table.tableNumber || table.TableNumber,
      capacity: table.capacity || table.Capacity,
      status: table.status || table.Status,
    };
    setForm({
      tableNumber: normalizedTable.tableNumber,
      capacity: normalizedTable.capacity.toString(),
      status: normalizedTable.status,
    });
    setEditingTable(normalizedTable);
    setShowForm(true);
  };

  const handleDelete = async (tableNumber) => {
    if (!window.confirm(`Are you sure you want to delete table ${tableNumber}?`)) {
      return;
    }

    try {
      const table = tables.find(t => (t.tableNumber || t.TableNumber) === tableNumber);
      if (!table) {
        showSnackbar("Table not found", "error");
        return;
      }
      const tableId = table.tableId || table.TableId;
      await deleteTable(restaurantId, tableId);
      showSnackbar("Table deleted successfully", "success");
      fetchTables();
    } catch (err) {
      showSnackbar(err.response?.data || "Failed to delete table", "error");
    }
  };

  const validateForm = () => {
    const newErrors = {};

    const tableNumberValidation = validateTableNumber(form.tableNumber);
    if (!tableNumberValidation.valid) {
      newErrors.tableNumber = tableNumberValidation.message;
    }

    const capacityValidation = validateCapacity(form.capacity);
    if (!capacityValidation.valid) {
      newErrors.capacity = capacityValidation.message;
    }

    setFormErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showSnackbar("Please fix the errors in the form", "error");
      return;
    }

    try {
      if (editingTable) {
        await updateTable(editingTable.tableId, restaurantId, {
          tableNumber: form.tableNumber,
          capacity: parseInt(form.capacity),
          status: form.status,
        });
        showSnackbar("Table updated successfully", "success");
      } else {
        await createTable(restaurantId, {
          tableNumber: form.tableNumber,
          capacity: parseInt(form.capacity),
          status: form.status,
        });
        showSnackbar("Table added successfully", "success");
      }
      setShowForm(false);
      setEditingTable(null);
      setForm({ tableNumber: "", capacity: "", status: "Available" });
      setFormErrors({});
      fetchTables();
    } catch (err) {
      showSnackbar(err.response?.data || "Failed to save table", "error");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTable(null);
    setForm({ tableNumber: "", capacity: "", status: "Available" });
    setFormErrors({});
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Available":
        return "success";
      case "Occupied":
        return "error";
      case "Reserved":
        return "warning";
      case "Maintenance":
        return "default";
      default:
        return "default";
    }
  };

  const generateQRUrl = (tableId) => {
    // Get the current origin (e.g., http://localhost:3000 or production URL)
    const origin = window.location.origin;
    return `${origin}/table-menu/${tableId}`;
  };

  const handleShowQR = (table) => {
    const qrUrl = generateQRUrl(table.tableId);
    setQrDialog({ open: true, table, qrUrl });
  };

  const handleCloseQR = () => {
    setQrDialog({ open: false, table: null, qrUrl: "" });
  };

  const handleDownloadQR = () => {
    if (!qrDialog.qrUrl) return;
    
    // Create a canvas element to render the QR code
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = 512;
    canvas.height = 512;
    
    // Create a temporary container to render QR code
    const tempDiv = document.createElement("div");
    tempDiv.style.position = "absolute";
    tempDiv.style.left = "-9999px";
    document.body.appendChild(tempDiv);
    
    // Use a library method or create image from SVG
    // For simplicity, we'll create a download link for the URL
    const link = document.createElement("a");
    link.href = qrDialog.qrUrl;
    link.download = `table-${qrDialog.table?.tableNumber || qrDialog.table?.tableId}-menu-qr.txt`;
    link.click();
    
    // Alternative: Copy URL to clipboard
    navigator.clipboard.writeText(qrDialog.qrUrl).then(() => {
      showSnackbar("QR code URL copied to clipboard!", "success");
    });
  };

  if (!restaurantId) {
    return (
      <Layout title="Restaurant Admin Dashboard" navLinks={navLinks}>
        <Alert severity="warning">
          No restaurant associated with your account. Please contact admin.
        </Alert>
      </Layout>
    );
  }

  return (
    <Layout title="Manage Tables" backPath="/restaurant-dashboard" navLinks={navLinks}>
      <Box sx={{ mb: 4, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Your Tables ({tables.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleAdd}
          sx={{ borderRadius: 2 }}
        >
          Add New Table
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : tables.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: "center", py: 8 }}>
            <TableRestaurant sx={{ fontSize: 80, color: "rgba(255, 255, 255, 0.5)", mb: 2 }} />
            <Typography variant="h6" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", fontWeight: 300 }} gutterBottom>
              No tables found
            </Typography>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mb: 3, fontWeight: 300 }}>
              Add your first table to get started
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={handleAdd}>
              Add Table
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {tables.map((table) => {
            const tableId = table.tableId || table.TableId;
            const tableNumber = table.tableNumber || table.TableNumber;
            const capacity = table.capacity || table.Capacity;
            const status = table.status || table.Status;
            
            return (
              <Grid item xs={12} sm={6} md={4} key={tableId || tableNumber}>
                <Card sx={{ height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <TableRestaurant color="primary" />
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          Table {tableNumber}
                        </Typography>
                      </Box>
                      <Chip
                        label={status}
                        color={getStatusColor(status)}
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mb: 2, fontWeight: 300 }}>
                      Capacity: {capacity} {capacity === 1 ? "person" : "people"}
                    </Typography>

                    <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<QrCode />}
                        onClick={() => handleShowQR(table)}
                        fullWidth
                        sx={{ mb: 1 }}
                      >
                        View QR Code
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() => handleEdit(tableNumber)}
                        fullWidth
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<Delete />}
                        onClick={() => handleDelete(tableNumber)}
                        fullWidth
                      >
                        Delete
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Dialog open={showForm} onClose={handleCancel} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingTable ? "Edit Table" : "Add New Table"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              fullWidth
              label="Table Number"
              name="tableNumber"
              value={form.tableNumber}
              onChange={handleChange}
              required
              error={!!formErrors.tableNumber}
              helperText={formErrors.tableNumber}
              sx={{ mb: 2 }}
              autoFocus
            />
            <TextField
              fullWidth
              label="Capacity"
              name="capacity"
              type="number"
              value={form.capacity}
              onChange={handleChange}
              min="1"
              max="50"
              required
              error={!!formErrors.capacity}
              helperText={formErrors.capacity || "Number of people (1-50)"}
              sx={{ mb: 2 }}
            />
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                name="status"
                value={form.status}
                onChange={handleChange}
                label="Status"
              >
                <MenuItem value="Available">Available</MenuItem>
                <MenuItem value="Occupied">Occupied</MenuItem>
                <MenuItem value="Reserved">Reserved</MenuItem>
                <MenuItem value="Maintenance">Maintenance</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingTable ? "Update" : "Add"} Table
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialog.open} onClose={handleCloseQR} maxWidth="sm" fullWidth>
        <DialogTitle>
          QR Code - Table {qrDialog.table?.tableNumber}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 2 }}>
            <Typography variant="body2" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mb: 3, textAlign: "center", fontWeight: 300 }}>
              Scan this QR code to view the menu for Table {qrDialog.table?.tableNumber}
            </Typography>
            <Box
              sx={{
                p: 2,
                bgcolor: "rgba(255, 255, 255, 0.9)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderRadius: 2,
                border: "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
                mb: 2,
              }}
            >
              <QRCodeSVG
                value={qrDialog.qrUrl}
                size={256}
                level="H"
                includeMargin={true}
              />
            </Box>
            <Typography variant="caption" sx={{ color: mode === 'dark' ? "rgba(255, 255, 255, 0.7)" : "rgba(0, 0, 0, 0.7)", mb: 1, wordBreak: "break-all", textAlign: "center", fontWeight: 300 }}>
              {qrDialog.qrUrl}
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={handleDownloadQR}
              sx={{ mt: 2 }}
            >
              Copy URL
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseQR}>Close</Button>
        </DialogActions>
      </Dialog>

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
    </Layout>
  );
};

export default RestaurantTables;
