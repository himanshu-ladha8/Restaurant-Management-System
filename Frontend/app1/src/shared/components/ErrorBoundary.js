import React from "react";
import { Box, Container, Typography, Button, Card, CardContent } from "@mui/material";
import { ErrorOutline, Refresh } from "@mui/icons-material";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console or error reporting service
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    // You can also log the error to an error reporting service here
    // Example: logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      return (
        <Box
          sx={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            p: 3,
          }}
        >
          <Container maxWidth="sm">
            <Card>
              <CardContent sx={{ textAlign: "center", p: 4 }}>
                <ErrorOutline sx={{ fontSize: 80, color: "error.main", mb: 2 }} />
                <Typography variant="h4" sx={{ fontWeight: 600, mb: 2 }}>
                  Something went wrong
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                  We're sorry, but something unexpected happened. Please try refreshing the page.
                </Typography>
                
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      bgcolor: "grey.100",
                      borderRadius: 1,
                      textAlign: "left",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    <Typography variant="caption" component="pre" sx={{ fontFamily: "monospace" }}>
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </Typography>
                  </Box>
                )}

                <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
                  <Button
                    variant="contained"
                    startIcon={<Refresh />}
                    onClick={this.handleReset}
                  >
                    Go to Home
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => window.location.reload()}
                  >
                    Refresh Page
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Container>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

