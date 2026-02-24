import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from "@mui/material";
import { ShoppingCart, CheckCircle, Cancel } from "@mui/icons-material";
import { useThemeMode } from "../../context/ThemeContext";

const ContinueOrderDialog = ({ open, onYes, onNo, orderId, totalAmount }) => {
  const { mode } = useThemeMode();

  return (
    <Dialog
      open={open}
      onClose={onNo}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "16px",
          background: mode === 'dark' 
            ? 'linear-gradient(135deg, #1e1e1e 0%, #2d2d2d 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 100%)',
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <ShoppingCart sx={{ fontSize: 32, color: "primary.main" }} />
          <Typography variant="h5" fontWeight={700}>
            Order Confirmed!
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="body1" sx={{ mb: 2, color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)" }}>
            Your order #{orderId} has been placed successfully!
          </Typography>
          <Typography variant="h6" color="primary" fontWeight={600} sx={{ mb: 3 }}>
            Total: ₹{totalAmount?.toFixed(2) || "0.00"}
          </Typography>
          <Typography 
            variant="body1" 
            sx={{ 
              fontWeight: 600,
              color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.9)",
              mb: 2 
            }}
          >
            Would you like to order more items?
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)",
              mb: 1 
            }}
          >
            • <strong>Yes:</strong> Continue shopping and add more items to this order. Payment will be processed at the end.
          </Typography>
          <Typography 
            variant="body2" 
            sx={{ 
              color: mode === 'dark' ? "rgba(255, 255, 255, 0.9)" : "rgba(0, 0, 0, 0.87)",
            }}
          >
            • <strong>No:</strong> Proceed to payment for this order now.
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 2 }}>
        <Button
          onClick={onNo}
          variant="outlined"
          startIcon={<Cancel />}
          sx={{
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1,
            borderColor: "error.main",
            color: "error.main",
            "&:hover": {
              borderColor: "error.dark",
              backgroundColor: "error.light",
              color: "error.dark",
            },
          }}
        >
          No, Pay Now
        </Button>
        <Button
          onClick={onYes}
          variant="contained"
          startIcon={<CheckCircle />}
          sx={{
            borderRadius: "8px",
            textTransform: "none",
            fontWeight: 600,
            px: 3,
            py: 1,
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)",
              boxShadow: "0 6px 16px rgba(102, 126, 234, 0.4)",
            },
          }}
        >
          Yes, Order More
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ContinueOrderDialog;

