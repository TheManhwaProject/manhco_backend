import "module-alias/register";

import express, { Application } from "express";
import ServerConfig from "./app";
import errorMiddleware from "./middleware/error";
import waitlistRoutes from "@routes/v1/waitlist/waitlistRoutes";
import authRoutes from "@routes/v1/auth/authRoutes";
import userRoutes from "@routes/v1/user/userRoutes";

// Initialize passport configuration
import "./passport/google";

const app: Application = express();
const server: ServerConfig = new ServerConfig(app);
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// API routes
app.use("/api/v1/waitlist", waitlistRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/user", userRoutes);

app
  .listen(PORT, "localhost", function () {
    console.log(`Server running on port ${PORT}.`);
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log("Port already in use");
    } else {
      console.log(err);
    }
  });
