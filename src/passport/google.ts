import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { prisma } from "@libs/prisma";
import { parsePrismaError, AppError } from "@utils/errorHandler";

// Add log here
console.log('[passport/google.ts] GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { role: true }
  });
  if (!user) return done(new AppError("User not found", 404));
  done(null, user);
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: process.env.GOOGLE_CALLBACK_URL!,
    },
    async (_, __, profile, done) => {
      const email = profile.emails?.[0]?.value;
      const googleId = profile.id;

      if (!email) return done(null, false);

      let user = await prisma.user.findUnique({ 
        where: { googleId },
        include: { role: true }
      });

      if (!user) {
        const firstName = profile.name?.givenName || "User";
        const secondName = profile.name?.familyName;

        const defaultRoleId = 4;

        user = await prisma.user.upsert({
          where: { email },
          update: { googleId },
          create: {
            email,
            firstName,
            secondName,
            googleId,
            profilePic: profile.photos?.[0]?.value,
            roleId: defaultRoleId,
          },
          include: { role: true }
        });
      }

      return done(null, user);
    }
  )
);
