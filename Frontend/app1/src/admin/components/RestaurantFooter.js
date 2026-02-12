import { useState, useEffect, useContext } from "react";
import { AuthContext } from "../../context/AuthContext";
import {  Box,  Container,  Typography,  Grid,  Divider,  Link,  Tooltip,} from "@mui/material";
import {  Restaurant,  LocationOn,  Phone,  Email,  Copyright,} from "@mui/icons-material";
import { getMyRestaurant } from "../../services/RestaurantService";

const RestaurantFooter = () => {
  const { user } = useContext(AuthContext);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const isRestaurantAdmin =
      user?.role === "RestaurantAdmin" ||
      user?.userType === "RestaurantAdmin";

    if (isRestaurantAdmin && user?.restaurantId) {
      fetchRestaurant();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchRestaurant = async () => {
    try {
      const response = await getMyRestaurant();
      const data = response.data || {};

      setRestaurant({
        name: data.name || data.Name || "Restaurant",
        address: data.address || data.Address || "",
        phone: data.phone || data.Phone || "",
      });
    } catch (err) {
      console.error("Error fetching restaurant:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !restaurant) return null;

  const currentYear = new Date().getFullYear();

  /* 🌍 OS-based map navigation (address only) */
  const getDirectionsUrl = (address) => {
    const encoded = encodeURIComponent(address);
    const ua = navigator.userAgent || navigator.vendor || window.opera;

    if (/iPad|iPhone|iPod/.test(ua)) {
      return `https://maps.apple.com/?daddr=${encoded}`;
    }
    if (/Android/.test(ua)) {
      return `geo:0,0?q=${encoded}`;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
  };

  const mapsUrl = getDirectionsUrl(restaurant.address);

  return (
    <Box component="footer" sx={{ mt: "auto", bgcolor: "#1a1a1a", color: "white", py: 4, borderTop: "1px solid rgba(255, 255, 255, 0.1)" }}>
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Restaurant Info */}
          <Grid xs={12} md={4}>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
              <Restaurant sx={{ fontSize: 32, mr: 1 }} />
              <Typography variant="h6" sx={{ fontWeight: 300, letterSpacing: "0.05em" }}>
                {restaurant.name}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Your trusted restaurant management system for seamless operations.
            </Typography>
          </Grid>

          {/* Contact Info */}
          <Grid xs={12} md={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 300, mb: 2, letterSpacing: "0.05em" }}>
              Contact Information
            </Typography>

            {/* 📍 Location icon + Address (both clickable) */}
            {restaurant.address && (
              <Box sx={{ display: "flex", alignItems: "flex-start", mb: 1.5 }}>
                <Tooltip title="Open in Maps" arrow>
                  <Link
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "white",
                      mr: 1,
                      display: "flex",
                      alignItems: "center",
                      cursor: "pointer",
                      "&:hover": { opacity: 0.8 },
                    }}
                  >
                    <LocationOn sx={{ fontSize: 20, mt: 0.5 }} />
                  </Link>
                </Tooltip>

                <Tooltip title="Open in Maps" arrow>
                  <Link
                    href={mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: "white",
                      textDecoration: "none",
                      opacity: 0.9,
                      cursor: "pointer",
                      "&:hover": {
                        textDecoration: "underline",
                        opacity: 1,
                      },
                    }}
                  >
                    <Typography variant="body2">
                      {restaurant.address}
                    </Typography>
                  </Link>
                </Tooltip>
              </Box>
            )}

            {/* Phone */}
            {restaurant.phone && (
              <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
                <Phone sx={{ fontSize: 20, mr: 1 }} />
                <Link
                  href={`tel:${restaurant.phone}`}
                  sx={{
                    color: "white",
                    textDecoration: "none",
                    opacity: 0.9,
                    "&:hover": { opacity: 1, textDecoration: "underline" },
                  }}
                >
                  {restaurant.phone}
                </Link>
              </Box>
            )}

            {/* Email */}
            {user?.email && (
              <Box sx={{ display: "flex", alignItems: "center" }}>
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
          </Grid>

          {/* Quick Links */}
          <Grid xs={12} md={4}>
            <Typography variant="subtitle1" sx={{ fontWeight: 300, mb: 2, letterSpacing: "0.05em" }}>
              Quick Links
            </Typography>

            {[
              { label: "Dashboard", path: "/restaurant-dashboard" },
              { label: "Manage Tables", path: "/restaurant-tables" },
              { label: "Manage Meals", path: "/restaurant-meals" },
              { label: "View Orders", path: "/restaurant-orders" },
              { label: "Reservations", path: "/restaurant-reservations" },
            ].map((link) => (
              <Link
                key={link.path}
                href={link.path}
                sx={{
                  display: "block",
                  color: "white",
                  textDecoration: "none",
                  opacity: 0.9,
                  mb: 1,
                  "&:hover": { opacity: 1, textDecoration: "underline" },
                }}
              >
                {link.label}
              </Link>
            ))}
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: "rgba(255,255,255,0.2)" }} />

        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 1 }}>
          <Copyright sx={{ fontSize: 18 }} />
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {currentYear} {restaurant.name}. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default RestaurantFooter;
