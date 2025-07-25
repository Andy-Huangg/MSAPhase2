import { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  Link,
  Paper,
} from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { login, clearError } from "./authSlice";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, error } = useAppSelector(
    (state) => state.auth
  );

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/home");
    }
  }, [isAuthenticated, navigate]);

  // Clear any existing error when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await dispatch(login({ username, password }));
    if (login.fulfilled.match(result)) {
      navigate("/home");
    }
    // If login fails, error will be shown by existing error logic
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
      }}
    >
      <Paper
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 3,
          width: "100%",
          maxWidth: 420,
          boxShadow: 3,
        }}
      >
        <Box sx={{ textAlign: "center", mb: 3 }}>
          <Typography
            variant="h4"
            sx={{ fontWeight: "bold", color: "primary.main" }}
          >
            CourseConnect
          </Typography>
          <Typography variant="h5" sx={{ mt: 2, fontWeight: 600 }}>
            Welcome Back
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Sign in to connect with your course mates
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleLogin}>
          <TextField
            label="Username"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            variant="outlined"
            sx={{ mb: 2 }}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            variant="outlined"
            sx={{ mb: 3 }}
          />
          <Button
            type="submit"
            variant="contained"
            fullWidth
            disabled={isLoading}
            sx={{
              py: 1.5,
              fontSize: "1rem",
              fontWeight: "bold",
              borderRadius: 2,
              textTransform: "none",
              boxShadow: 2,
              "&:hover": { boxShadow: 4 },
            }}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign In"
            )}
          </Button>
          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          {isAuthenticated && (
            <Alert severity="success" sx={{ mt: 2, borderRadius: 2 }}>
              Login successful! Redirecting...
            </Alert>
          )}

          <Box sx={{ mt: 4, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Don't have an account?{" "}
              <Link
                component={RouterLink}
                to="/signup"
                sx={{
                  fontWeight: 600,
                  textDecoration: "none",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                Sign up here
              </Link>
            </Typography>
            <Link
              component={RouterLink}
              to="/"
              variant="body2"
              sx={{
                color: "text.secondary",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                "&:hover": {
                  color: "primary.main",
                  textDecoration: "underline",
                },
              }}
            >
              ← Back to Home
            </Link>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
