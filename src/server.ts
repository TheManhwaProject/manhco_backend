import "module-alias/register";

import express, { Application } from "express";
import ServerConfig from "./app";

import waitlistRoutes from "@routes/v1/waitlist/waitlistRoutes";

const app: Application = express();
const server: ServerConfig = new ServerConfig(app);
const PORT: number = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;

app.use("/api/v1/waitlist", waitlistRoutes);

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
