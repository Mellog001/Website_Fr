import express, { json } from "express";
import connectDB from "./config/db";

const app = express();

// Middleware
app.use(json());

// Connect DB
connectDB();

// Test Route
app.get("/", (_req, res) => {
  res.send("🚀 API is running...");
});

// Start Server
app.listen(5000, () => {
  console.log("🔥 Server running on port 5000");
});