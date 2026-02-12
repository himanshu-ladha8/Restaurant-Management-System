import { useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import {  Box,  Container,  Typography,  Grid,  Divider,  Link,} from "@mui/material";
import {  Person,  Email,  Copyright,  Restaurant,  ShoppingCart,  CalendarToday,} from "@mui/icons-material";

const CustomerFooter = () => {
  const { user } = useContext(AuthContext);

  if (!user) return null;

  const currentYear = new Date().getFullYear();

  return (
    <Box component="footer" sx={{ mt: "auto", bgcolor: "#1a1a1a", color: "white", py: 4, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Customer Info */}
          <Grid xs={12} md={4}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Person sx={{ fontSize: 32, mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 300, letterSpacing: "0.05em" }}>
                Customer Portal
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Your convenient way to browse restaurants, place orders, and track your dining experience.
            </Typography>
          </Grid>

          {/* Contact Info */}
          <Grid xs={12} md={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 300, mb: 2, letterSpacing: "0.05em" }}>
              Your Account
            </Typography>

            {/* Email */}
            {user?.email && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                <Email sx={{ fontSize: 20, mr: 1 }} />
                <Link
                  href={`mailto:${user.email}`}
                  sx={{
                    color: "white",
                    textDecoration: "none",
                    opacity: 0.9,
                    "&:hover": { opacity: 1, textDecoration: "underline" },
                  }}
                >
                  {user.email}
                </Link>
              </Box>
            )}

            <Typography variant="body2" sx={{ opacity: 0.9, mt: 2 }}>
              Manage your orders and preferences from your dashboard.
            </Typography>
          </Grid>

          {/* Quick Links */}
          <Grid xs={12} md={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 300, mb: 2, letterSpacing: "0.05em" }}>
              Quick Links
            </Typography>

            {[
              { label: "Dashboard", path: "/customer-dashboard", icon: <Person sx={{ fontSize: 16, mr: 0.5 }} /> },
              { label: "Browse Restaurants", path: "/customer-restaurants", icon: <Restaurant sx={{ fontSize: 16, mr: 0.5 }} /> },
              { label: "My Orders", path: "/customer-orders", icon: <ShoppingCart sx={{ fontSize: 16, mr: 0.5 }} /> },
              { label: "My Reservations", path: "/customer-reservations", icon: <CalendarToday sx={{ fontSize: 16, mr: 0.5 }} /> },
            ].map((link) => (
              <Link
                key={link.path}
                href={link.path}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: "white",
                  textDecoration: "none",
                  opacity: 0.9,
                  mb: 1,
                  "&:hover": { opacity: 1, textDecoration: "underline" },
                }}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />

        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Copyright sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {currentYear} Restaurant Management System. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default CustomerFooter;

