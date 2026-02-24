import { Box, AppBar, Toolbar, Typography, Button, IconButton, Container, Drawer, List, ListItem, ListItemButton, ListItemText, useMediaQuery, useTheme } from "@mui/material";
import { Logout, ArrowBack, Menu } from "@mui/icons-material";
import { useNavigate, Link } from "react-router-dom";
import { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";
import { useThemeMode } from "../../context/ThemeContext";
import RestaurantFooter from "../../admin/components/RestaurantFooter";
import CustomerFooter from "../../customer/components/CustomerFooter";
import ThemeToggle from "./ThemeToggle";

const Layout = ({ title, children, backPath, navLinks = [] }) => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { logout, user } = useContext(AuthContext);
  const isRestaurantAdmin = user?.role === "RestaurantAdmin" || user?.userType === "RestaurantAdmin";
  const isCustomer = user?.role === "Customer" || user?.userType === "Customer";

  const handleLogout = () => {
    // Store user role before logout (since user will be null after logout)
    const userRole = user?.role || user?.userType;
    const wasCustomer = userRole === "Customer";
    
    logout();
    
    // Always redirect customers to home page on logout
    // Use window.location for a hard redirect to ensure it works
    if (wasCustomer) {
      window.location.href = "/";
    } else {
      window.location.href = backPath || "/";
    }
  };

  const toggleDrawer = (open) => (event) => {
    if (event?.type === 'keydown' && (event.key === 'Tab' || event.key === 'Shift')) {
      return;
    }
    // Defer close so it doesn't run in same tick as Link navigation (avoids concurrent render error)
    if (!open) {
      setTimeout(() => setDrawerOpen(false), 0);
    } else {
      setDrawerOpen(open);
    }
  };

  const drawerContent = (
    <Box 
      sx={{ 
        width: 280, 
        pt: 3,
        background: mode === 'dark' ? '#1a1a1a' : '#ffffff',
        height: '100%',
        color: mode === 'dark' ? 'white' : '#1a1a1a',
      }} 
      role="presentation"
    >
      <Typography 
        variant="h6" 
        sx={{ 
          px: 3, 
          mb: 3, 
          fontWeight: 300,
          fontSize: '1.25rem',
          color: mode === 'dark' ? 'white' : '#1a1a1a',
          letterSpacing: '0.05em',
        }}
      >
        {title}
      </Typography>
      <List sx={{ px: 1 }}>
        {navLinks.map((link, index) => (
          <ListItem key={index} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton 
              component={Link} 
              to={link.path} 
              onClick={toggleDrawer(false)}
              sx={{
                borderRadius: 2,
                mx: 1,
                transition: 'all 0.3s',
                color: mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(4px)',
                  color: mode === 'dark' ? 'white' : '#1a1a1a',
                },
              }}
            >
              <ListItemText 
                primary={link.label}
                primaryTypographyProps={{
                  fontWeight: 300,
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
        <ListItem disablePadding sx={{ mt: 1 }}>
          <ListItemButton 
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              mx: 1,
              transition: 'all 0.3s',
              color: mode === 'dark' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.87)',
              '&:hover': {
                backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                transform: 'translateX(4px)',
                color: mode === 'dark' ? 'white' : '#1a1a1a',
              },
            }}
          >
            <ListItemText 
              primary="Logout"
              primaryTypographyProps={{
                fontWeight: 600,
              }}
            />
            <Logout sx={{ ml: 1 }} />
          </ListItemButton>
        </ListItem>
      </List>
    </Box>
  );

  // Restaurant-themed background image (elegant dining/ambiance); overlay keeps content readable and font visible
  const bgImageUrl = "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920";
  const overlayLight = "rgba(252, 251, 249, 0.88)";
  const overlayDark = "rgba(12, 12, 12, 0.92)";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundImage: `linear-gradient(${mode === 'dark' ? overlayDark : overlayLight}, ${mode === 'dark' ? overlayDark : overlayLight}), url("${bgImageUrl}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backgroundRepeat: "no-repeat",
      }}
    >
      <AppBar 
        position="static" 
        elevation={0} 
        sx={{ 
          background: mode === 'dark' ? '#1a1a1a' : '#ffffff',
          boxShadow: 'none',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderBottom: mode === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, sm: 3 }, py: 1.5 }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              aria-label="menu"
              onClick={toggleDrawer(true)}
              sx={{ 
                mr: 2,
                transition: 'all 0.3s',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'scale(1.1)',
                },
              }}
            >
              <Menu />
            </IconButton>
          )}
          {backPath && !isMobile && (
            <IconButton
              component={Link}
              to={backPath}
              sx={{ 
                color: mode === 'dark' ? "white" : "#1a1a1a", 
                mr: 2,
                transition: 'all 0.3s',
                '&:hover': {
                  backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(-4px)',
                },
              }}
            >
              <ArrowBack />
            </IconButton>
          )}
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1, 
              fontWeight: 300,
              fontSize: { xs: '1.125rem', sm: '1.375rem' },
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              letterSpacing: '0.05em',
              color: mode === 'dark' ? 'white' : '#1a1a1a',
            }}
          >
            {title}
          </Typography>
          <ThemeToggle />
          {!isMobile && (
            <>
              {navLinks.map((link, index) => (
                <Button
                  key={index}
                  component={Link}
                  to={link.path}
                  sx={{ 
                    color: mode === 'dark' ? "white" : "#1a1a1a", 
                    mr: 1, 
                    display: { xs: 'none', md: 'inline-flex' },
                    fontWeight: 300,
                    transition: 'all 0.3s',
                    borderRadius: 2,
                    px: 2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    '&:hover': {
                      backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.04)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  {link.label}
                </Button>
              ))}
              <Button
                onClick={handleLogout}
                startIcon={<Logout />}
                sx={{ 
                  color: mode === 'dark' ? "white" : "#1a1a1a", 
                  display: { xs: 'none', md: 'inline-flex' },
                  fontWeight: 300,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  transition: 'all 0.3s',
                  borderRadius: 2,
                  px: 2,
                  '&:hover': {
                    backgroundColor: mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                    transform: 'translateY(-2px)',
                  },
                }}
              >
                Logout
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>
      
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
      >
        {drawerContent}
      </Drawer>

      <Container 
        maxWidth="lg" 
        sx={{ 
          py: { xs: 2, sm: 4 }, 
          px: { xs: 1, sm: 2 },
          flex: 1,
          width: '100%',
          color: mode === 'dark' ? '#ffffff' : '#1a1a1a',
        }}
      >
        {children}
      </Container>
      {isRestaurantAdmin && <RestaurantFooter />}
      {isCustomer && <CustomerFooter />}
    </Box>
  );
};

export default Layout;