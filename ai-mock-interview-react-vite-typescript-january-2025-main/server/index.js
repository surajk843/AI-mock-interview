require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { clerkMiddleware, getAuth } = require("@clerk/express");

const geminiRoutes = require("./routes/gemini");
const interviewRoutes = require("./routes/interviews");
const userAnswersRoutes = require("./routes/userAnswers");
const userRoutes = require("./routes/users");

const app = express();

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Validate required environment variables.
const requiredEnvVariables = [
  "CLERK_SECRET_KEY",
  "GEMINI_API_KEY",
  "FIREBASE_PROJECT_ID",
];

const missingVariables = requiredEnvVariables.filter(
  (variable) => !process.env[variable]
);

if (missingVariables.length > 0) {
  console.error(
    `Missing required environment variables: ${missingVariables.join(", ")}`
  );

  process.exit(1);
}

// Configure CORS.
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parse JSON requests.
app.use(express.json({ limit: "1mb" }));

// Enable Clerk authentication.
app.use(clerkMiddleware());

// Health check.
app.get("/", (req, res) => {
  res.status(200).json({
    message: "AI Mock Interview API is running.",
  });
});

// Protected diagnostic endpoint.
app.get("/api/protected", (req, res) => {
  const { isAuthenticated, userId } = getAuth(req);

  if (!isAuthenticated || !userId) {
    return res.status(401).json({
      error: "Unauthorized. Please sign in.",
    });
  }

  return res.status(200).json({
    message: "Authentication successful.",
    userId,
  });
});

// Register API routes.
app.use("/api/users", userRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/user-answers", userAnswersRoutes);
app.use("/api/gemini", geminiRoutes);

// Handle unknown routes.
app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
  });
});

// Handle unexpected errors.
app.use((err, req, res, next) => {
  console.error("Server error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(500).json({
    error: "An unexpected server error occurred.",
  });
});

// Start server.
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});