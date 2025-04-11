import express, { Application } from "express";
import cors from "cors";
import { sessionMiddleware } from "./middleware/session";
import passport from "passport";

export default class ServerConfig {
  constructor(app: Application) {
    this.config(app);
  }

  private config(app: Application): void {
    const corsOptions = {
      origin: this.getCorsOrigin(process.env.ENVIRONMENT),
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      credentials: true,
    };

    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());
  }

  private getCorsOrigin(env: string | undefined): string[] | string | boolean {
    switch (env) {
      case "development":
        if (!process.env.CORS_ORIGIN_DEV) {
          console.warn(`No CORS origin set for ${env}`);
          return false;
        }
        return [process.env.CORS_ORIGIN_DEV];
      case "production":
        if (!process.env.CORS_ORIGIN_PROD) {
          console.warn(`No CORS origin set for ${env}`);
          return false;
        }
        return [process.env.CORS_ORIGIN_PROD];
      default:
        console.warn("No CORS origin set, blocking all");
        return false;
    }
  }
}
