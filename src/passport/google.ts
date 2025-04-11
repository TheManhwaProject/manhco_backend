import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "@libs/prisma";
import { parsePrismaError, AppError } from "@utils/errorHandler";

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  const user = await prisma.users.findUnique({ where: { id } });
  if (!user) return done(new AppError("User not found", 404));
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "/api/auth/google/callback",
    },
    async (_, __, profile, done) => {
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;

      if (!email) return done(null, false);

      let user = await prisma.users.findUnique({ where: { googleId } });

      if (!user) {
        user = await prisma.users.upsert({
          where: { email },
          update: { googleId },
          create: {
            email,
            name: profile.displayName,
            googleId,
            image: profile.photos?.[0]?.value,
          },
        });
      }

      return done(null, user);
    }
  )
);
