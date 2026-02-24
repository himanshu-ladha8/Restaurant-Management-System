import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import AdminLogin from "./admin/Login";
import AdminRegister from "./admin/Register";
import CustomerLogin from "./customer/CustomerLogin";
import CustomerRegister from "./customer/CustomerRegister";
import AdminDashboard from "./admin/AdminDashboard";
import AdminRestaurants from "./admin/AdminRestaurants";
import AdminRestaurantDetails from "./admin/AdminRestaurantDetails";
import AdminUsers from "./admin/AdminUsers";
import Home from "./shared/Home";
import CustomerDashboard from "./customer/CustomerDashboard";
import CustomerRestaurants from "./customer/CustomerRestaurants";
import CustomerRestaurantView from "./customer/CustomerRestaurantView";
import CustomerOrders from "./customer/CustomerOrders";
import PaymentHistory from "./customer/PaymentHistory";
import RestaurantDashboard from "./admin/RestaurantDashboard";
import RestaurantTables from "./admin/RestaurantTables";
import RestaurantMeals from "./admin/RestaurantMeals";
import RestaurantOrders from "./admin/RestaurantOrders";
import CompleteRestaurantDetails from "./admin/CompleteRestaurantDetails";
import ForgotPassword from "./shared/ForgotPassword";
import ResetPassword from "./shared/ResetPassword";
import TableMenu from "./customer/TableMenu";
import RestaurantReviews from "./admin/RestaurantReviews";
import Cart from "./customer/Cart";
import Payment from "./customer/Payment";
import CustomerReservationBooking from "./customer/CustomerReservationBooking";
import CustomerReservations from "./customer/CustomerReservations";
import RestaurantReservations from "./admin/RestaurantReservations";
import CategoryItems from "./customer/CategoryItems";
import { AuthProvider } from "./context/AuthContext";
import { ThemeProvider, useThemeMode } from "./context/ThemeContext";
import ProtectedRoute from "./shared/components/ProtectedRoute";
import ErrorBoundary from "./shared/components/ErrorBoundary";
import { getTheme } from "./theme";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  "pk_test_51SmtpxEEBiB23dFEC0Xqvl44OTeWS6ogeI0BijDloJBYDWXN1cSYqyANVsrndVX2uofjADdUs1ue77lOJe2XShbT00zib74kTv"
).catch((error) => {
  console.error("Failed to load Stripe.js:", error);
  // Return null to indicate Stripe failed to load
  return null;
});

function AppContent() {
  const { mode } = useThemeMode();
  const theme = getTheme(mode);

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
    <AuthProvider>
      <BrowserRouter>
        <Elements stripe={stripePromise}> 
        <Routes>
          <Route path="/" element={<Home/>}/>
          <Route path="/admin-login" element={<AdminLogin />} />
          <Route path="/admin-register" element={<AdminRegister />} />
          <Route path="/customer-login" element={<CustomerLogin />} />
          <Route path="/customer-register" element={<CustomerRegister />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/complete-restaurant-details" element={<CompleteRestaurantDetails />} />
          <Route path="/admin-dashboard" element={<ProtectedRoute requiredRole="Admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin-restaurants" element={<ProtectedRoute requiredRole="Admin"><AdminRestaurants /></ProtectedRoute>} />
          <Route path="/admin-restaurant-details/:restaurantId" element={<ProtectedRoute requiredRole="Admin"><AdminRestaurantDetails /></ProtectedRoute>} />
          <Route path="/admin-users" element={<ProtectedRoute requiredRole="Admin"><AdminUsers /></ProtectedRoute>} />
          <Route path="/customer-dashboard" element={<ProtectedRoute requiredRole="Customer"><CustomerDashboard /></ProtectedRoute>} />
          <Route path="/customer-restaurants" element={<CustomerRestaurants />} />
          <Route path="/customer-restaurant/:restaurantId" element={<CustomerRestaurantView />} />
          <Route path="/category-items/:category" element={<CategoryItems />} />
          <Route path="/customer-orders" element={<ProtectedRoute requiredRole="Customer"><CustomerOrders /></ProtectedRoute>} />
          <Route path="/payment-history" element={<ProtectedRoute requiredRole="Customer"><PaymentHistory /></ProtectedRoute>} />
          <Route path="/restaurant-dashboard" element={<ProtectedRoute requiredRole="RestaurantAdmin"><RestaurantDashboard /></ProtectedRoute>} />
          <Route path="/restaurant-tables" element={<ProtectedRoute requiredRole="RestaurantAdmin"><RestaurantTables /></ProtectedRoute>} />
          <Route path="/restaurant-meals" element={<ProtectedRoute requiredRole="RestaurantAdmin"><RestaurantMeals /></ProtectedRoute>} />
          <Route path="/restaurant-orders" element={<ProtectedRoute requiredRole="RestaurantAdmin"><RestaurantOrders /></ProtectedRoute>} />
          <Route path="/restaurant-reviews" element={<ProtectedRoute requiredRole="RestaurantAdmin"><RestaurantReviews /></ProtectedRoute>} />
          <Route path="/table-menu/:tableId" element={<TableMenu />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/payment" element={<ProtectedRoute requiredRole="Customer"><Payment /></ProtectedRoute>} />
          <Route path="/customer-reservation-booking/:restaurantId" element={<ProtectedRoute requiredRole="Customer"><CustomerReservationBooking /></ProtectedRoute>} />
          <Route path="/customer-reservations" element={<ProtectedRoute requiredRole="Customer"><CustomerReservations /></ProtectedRoute>} />
          <Route path="/restaurant-reservations" element={<ProtectedRoute requiredRole="RestaurantAdmin"><RestaurantReservations /></ProtectedRoute>} />
        </Routes>
        </Elements>
      </BrowserRouter>
    </AuthProvider>
    </MuiThemeProvider>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
    </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
