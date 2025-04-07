import express, { Application } from "express";
import cors from "cors";
import waitlistRoutes from "@routes/v1/waitlist/waitlistRoutes";

export default class ServerConfig {
  constructor(app: Application) {
    this.config(app);
  }

  private config(app: Application): void {
    const corsOptions = {
      origin: ["http://localhost:5173"],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true
    };

    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));


  }
}
