import { useRef, useState } from "react";
import {
  Box, Card, CardContent, Typography, Divider,
  Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Grid
} from "@mui/material";
import { Receipt, Print, Download } from "@mui/icons-material";
import { formatDateTime } from "../../utils/dateUtils";
import html2pdf from "html2pdf.js";

const PaymentReceipt = ({ receipt, onClose }) => {
  const receiptRef = useRef(null);
  const [hideActions, setHideActions] = useState(false);

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    setHideActions(true);
    await new Promise(resolve => setTimeout(resolve, 100));

    const options = {
      margin: [10, 10, 10, 10],
      filename: `Receipt_${receipt.receiptNumber || receipt.paymentId || receipt.transactionId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(options).from(receiptRef.current).save();
    setTimeout(() => setHideActions(false), 500);
  };

  // Use the utility function for consistent date formatting
  const formatDate = formatDateTime;

  if (!receipt) return null;

  // Normalize receipt data to handle both camelCase and PascalCase from backend
  const normalizedReceipt = {
    receiptNumber: receipt.receiptNumber || receipt.ReceiptNumber,
    paymentId: receipt.paymentId || receipt.PaymentId,
    orderId: receipt.orderId || receipt.OrderId,
    restaurantName: receipt.restaurantName || receipt.RestaurantName || "Unknown Restaurant",
    restaurantAddress: receipt.restaurantAddress || receipt.RestaurantAddress,
    restaurantPhone: receipt.restaurantPhone || receipt.RestaurantPhone,
    customerName: receipt.customerName || receipt.CustomerName || "Guest",
    customerEmail: receipt.customerEmail || receipt.CustomerEmail,
    customerPhone: receipt.customerPhone || receipt.CustomerPhone,
    tableNumber: receipt.tableNumber || receipt.TableNumber || "N/A",
    orderDate: receipt.orderDate || receipt.OrderDate,
    paymentDate: receipt.paymentDate || receipt.PaymentDate || receipt.createdAt || receipt.CreatedAt,
    paymentMode: receipt.paymentMode || receipt.PaymentMode || "N/A",
    paymentStatus: receipt.paymentStatus || receipt.PaymentStatus || "N/A",
    transactionId: receipt.transactionId || receipt.TransactionId,
    orderItems: receipt.orderItems || receipt.OrderItems || [],
    subtotal: receipt.subtotal || receipt.Subtotal || receipt.orderTotal || receipt.OrderTotal || 0,
    tax: receipt.tax || receipt.Tax || 0,
    total: receipt.total || receipt.Total || receipt.amount || receipt.Amount || 0,
    orderTotal: receipt.orderTotal || receipt.OrderTotal || receipt.subtotal || receipt.Subtotal || 0,
    amount: receipt.amount || receipt.Amount || receipt.total || receipt.Total || 0,
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      <Card ref={receiptRef} sx={{ "@media print": { boxShadow: "none" } }}>
        <CardContent sx={{ "@media print": { p: 2 } }}>
          {/* Header */}
          <Box sx={{ textAlign: "center", mb: 3 }}>
            <Receipt sx={{ fontSize: 60, color: "primary.main", mb: 1 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              PAYMENT RECEIPT
            </Typography>
            <Typography variant="h6" color="primary.main" fontWeight={600}>
              {normalizedReceipt.receiptNumber || `INV-${normalizedReceipt.paymentId?.toString().padStart(6, "0") || "N/A"}`}
            </Typography>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Restaurant and Customer Information */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                RESTAURANT INFORMATION
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {normalizedReceipt.restaurantName}
              </Typography>
              {normalizedReceipt.restaurantAddress && (
                <Typography variant="body2" color="text.secondary">
                  {normalizedReceipt.restaurantAddress}
                </Typography>
              )}
              {normalizedReceipt.restaurantPhone && (
                <Typography variant="body2" color="text.secondary">
                  Phone: {normalizedReceipt.restaurantPhone}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                CUSTOMER INFORMATION
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {normalizedReceipt.customerName}
              </Typography>
              {normalizedReceipt.customerEmail && (
                <Typography variant="body2" color="text.secondary">
                  Email: {normalizedReceipt.customerEmail}
                </Typography>
              )}
              {normalizedReceipt.customerPhone && (
                <Typography variant="body2" color="text.secondary">
                  Phone: {normalizedReceipt.customerPhone}
                </Typography>
              )}
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Order and Payment Details */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Order ID
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                #{normalizedReceipt.orderId || "N/A"}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Table Number
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {normalizedReceipt.tableNumber}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Order Date
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatDate(normalizedReceipt.orderDate)}
              </Typography>
            </Grid>
            <Grid item xs={6} md={3}>
              <Typography variant="subtitle2" color="text.secondary">
                Payment Date
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {formatDate(normalizedReceipt.paymentDate)}
              </Typography>
            </Grid>
          </Grid>

          <Divider sx={{ my: 2 }} />

          {/* Payment Information */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              PAYMENT DETAILS
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={4}>
                <Typography variant="body2">
                  <strong>Payment Mode:</strong> {normalizedReceipt.paymentMode}
                </Typography>
              </Grid>
              <Grid item xs={6} md={4}>
                <Typography variant="body2">
                  <strong>Payment Status:</strong>{" "}
                  <span style={{ color: normalizedReceipt.paymentStatus === "Paid" ? "green" : "orange" }}>
                    {normalizedReceipt.paymentStatus}
                  </span>
                </Typography>
              </Grid>
              {normalizedReceipt.transactionId && (
                <Grid item xs={12} md={4}>
                  <Typography variant="body2">
                    <strong>Transaction ID:</strong> {normalizedReceipt.transactionId}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Order Items */}
          {normalizedReceipt.orderItems.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
                ORDER ITEMS
              </Typography>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: "grey.100" }}>
                      <TableCell><strong>Item Name</strong></TableCell>
                      <TableCell align="right"><strong>Quantity</strong></TableCell>
                      <TableCell align="right"><strong>Unit Price</strong></TableCell>
                      <TableCell align="right"><strong>Total</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {normalizedReceipt.orderItems.map((item, idx) => {
                      const normalizedItem = {
                        mealName: item.mealName || item.MealName || "Unknown",
                        quantity: item.quantity || item.Quantity || 0,
                        price: item.price || item.Price || 0,
                        totalPrice: item.totalPrice || item.TotalPrice || 0,
                      };
                      return (
                        <TableRow key={idx}>
                          <TableCell>{normalizedItem.mealName}</TableCell>
                          <TableCell align="right">{normalizedItem.quantity}</TableCell>
                          <TableCell align="right">₹{normalizedItem.price.toFixed(2)}</TableCell>
                          <TableCell align="right">₹{normalizedItem.totalPrice.toFixed(2)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Totals */}
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 1, mb: 3 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 300 }}>
              <Typography variant="body1">Subtotal:</Typography>
              <Typography variant="body1">₹{normalizedReceipt.subtotal.toFixed(2)}</Typography>
            </Box>
            {normalizedReceipt.tax > 0 && (
              <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 300 }}>
                <Typography variant="body1">Tax:</Typography>
                <Typography variant="body1">₹{normalizedReceipt.tax.toFixed(2)}</Typography>
              </Box>
            )}
            <Divider sx={{ width: "100%", maxWidth: 300, my: 1 }} />
            <Box sx={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: 300 }}>
              <Typography variant="h6" fontWeight={700}>
                Total Amount:
              </Typography>
              <Typography variant="h6" fontWeight={700} color="primary.main">
                ₹{normalizedReceipt.total.toFixed(2)}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Footer */}
          <Box sx={{ textAlign: "center", mt: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Thank you for your business!
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              This is a computer-generated receipt. No signature required.
            </Typography>
          </Box>

          {/* Action Buttons */}
          {!hideActions && (
            <Box sx={{ display: "flex", gap: 2, justifyContent: "center", mt: 3, "@media print": { display: "none" } }}>
              <Button variant="outlined" startIcon={<Print />} onClick={handlePrint}>
                Print
              </Button>
              <Button variant="outlined" startIcon={<Download />} onClick={handleDownload}>
                Download PDF
              </Button>
              {onClose && (
                <Button variant="contained" onClick={onClose}>
                  Close
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentReceipt;
