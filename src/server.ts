import dotenv from 'dotenv';
dotenv.config(); // Load environment variables FIRST
console.log('[server.ts] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);

import "module-alias/register";

import express, { Application } from "express";
import ServerConfig from "./app";
import router from "@routes/v1";

// Initialize passport configuration
import "./passport/google";

// --- Environment Variable Validation ---
const requiredAuthEnvVars: string[] = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "SESSION_SECRET",
  "DATABASE_URL", // Crucial for token/user storage
  "MANGADX_API_URL",
  "MANGADX_USERNAME",
  "MANGADX_PASSWORD",
];

const missingAuthEnvVars: string[] = requiredAuthEnvVars.filter(
  (varName) => !process.env[varName]
);

if (missingAuthEnvVars.length > 0) {
  console.error(
    "FATAL ERROR: Missing required authentication environment variables:"
  );
  missingAuthEnvVars.forEach((varName) => console.error(`  - ${varName}`));
  console.error(
    "Server cannot start without these variables. Check your .env file or environment configuration."
  );
  process.exit(1); // Exit the application with an error code
} else {
  console.log("Authentication environment variables validated.");
}
// --- End Environment Variable Validation ---

const app: Application = express();
const server: ServerConfig = new ServerConfig(app);
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

// API routes
app.use("/api/v1", router);

app
  .listen(PORT, "localhost", function () {
    console.log(`Server running on port ${PORT}.`);
    
    // Initialize background jobs
    import('./jobs/manhwaSyncJob').then(() => {
      console.log('[Server] Background jobs initialized');
    }).catch(err => {
      console.error('[Server] Failed to initialize background jobs:', err);
    });
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.log("Port already in use");
    } else {
      console.log(err);
    }
  });
