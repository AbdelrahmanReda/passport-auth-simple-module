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
    console.log("username", username);
    console.log("password", password);

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
    return done(null, user);
  }),
);
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:5000/auth/google/callback",
    },
    function (request, accessToken, refreshToken, profile, done) {
      return done(null, profile);
    },
  ),
);

passport.serializeUser(function (user, done) {
  console.log("serializeUser user", user);
  console.log("Done", done);
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  console.log("deserializeUser user", user);
  done(null, user);
});
