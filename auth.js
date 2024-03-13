const passport = require("passport");
const { PrismaClient } = require("@prisma/client");
const GoogleStrategy = require("passport-google-oauth2").Strategy;
const LocalStrategy = require("passport-local").Strategy;
const GOOGLE_CLIENT_ID =
  "994055224501-v3iravkvtucfih6u2346ih8d7vtmba6h.apps.googleusercontent.com";
const GOOGLE_CLIENT_SECRET = "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";
// use local strategy
const Prisma = new PrismaClient();

passport.use(
  new LocalStrategy(async (username, password, done) => {
    const user = await Prisma.user.findUnique({
      where: {
        email: username,
      },
    });
    if (!user) {
      return done(null, false, { message: "Incorrect username." });
    }
    if (user.password !== password) {
      return done(null, false, { message: "Incorrect password." });
    }
    console.log("User found in local strategy");
    return done(null, user);
  }),
);
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async function (request, accessToken, refreshToken, profile, done) {
      const user = await Prisma.user.findUnique({
        where: {
          email: profile.email,
        },
      });
      if (user) {
        return done(null, {
          ...profile,
          ...user,
        });
      }

      if (!user) {
        await Prisma.user.create({
          data: {
            email: profile.email,
            password: "dssfs",
            name: profile.displayName,
          },
        });
        return done(null, user);
      }

      if (user) {
        return done(null, user);
      }
    },
  ),
);

passport.serializeUser(function (user, done) {
  console.log("serializeUser");
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  console.log("deserializeUser");
  done(null, user);
});

//s%3AFWw7zN6KROQHRz_xvdeBOXICeVV8LQHH.rdyNW535%2BHsaWdbgClvpJb%2BXsKp8Xg4BK7R3VN0R%2B6Y
// poss man
// s%3AFWw7zN6KROQHRz_xvdeBOXICeVV8LQHH.rdyNW535%2BHsaWdbgClvpJb%2BXsKp8Xg4BK7R3VN0R%2B6Y
// browser connect.sid=s:AZgwpnuucznw3AE6qlb8z2Ital5evf1d.UvSVaOO6VFXxTVgHPVToEa45wX9t3mW/iVJOgwYAw+M
