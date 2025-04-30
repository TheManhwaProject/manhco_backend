import express, { Application } from "express";
import cors from "cors";
import { sessionMiddleware } from "./middleware/session";
import passport from "passport";
import cookieParser from "cookie-parser";
import { validateCsrfToken } from "./middleware/csrfMiddleware";
import errorMiddleware from "./middleware/error";
import helmet from "helmet";

export default class ServerConfig {
  constructor(app: Application) {
    this.config(app);
  }

  private config(app: Application): void {
    const corsOptions = {
      origin: this.getCorsOrigin(process.env.ENVIRONMENT),
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type", 
        "Authorization", 
        "X-Requested-With",
        "X-CSRF-Token"
      ],
      credentials: true,
    };
    
    if (process.env.ENVIRONMENT === "production") {
      app.use(
        helmet({
          xFrameOptions: { action: "deny" },
          xXssProtection: true,
          strictTransportSecurity: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          },
          contentSecurityPolicy: {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", "data:"],
              fontSrc: ["'self'"],
              connectSrc: ["'self'", "https://www.google-analytics.com"],
            },
          },
          referrerPolicy: {
            policy: "no-referrer-when-downgrade"
          },
        })
      );
    } else {
      app.use(
        helmet({
          contentSecurityPolicy: false,
          strictTransportSecurity: false,
        })
      )
    }

    app.use(cors(corsOptions));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    app.use(cookieParser(process.env.COOKIE_SECRET || 'dev_cookie_secret'));
    app.use(sessionMiddleware);
    app.use(passport.initialize());
    app.use(passport.session());
    
    app.use(validateCsrfToken);
    
    app.use(errorMiddleware);
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
