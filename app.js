const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const SQLiteStore = require("connect-sqlite3")(session);

require("./auth");
const morgan = require("morgan");
const app = express();
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

let transporter = nodemailer.createTransport({
  host: "smtp.imitate.email",
  port: 587,
  secure: false,
  auth: {
    user: "4a33e00b-31c3-4f47-b2d9-018dbe4a127e",
    password: "06d63b0e-95da-44ae-bca8-2ec47ae5d172",
  },
});
const Prisma = new PrismaClient();
function isLoggedIn(req, res, next) {
  req.user ? next() : res.sendStatus(401);
}
app.use(express.json());
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms"),
);

app.use(
  session({
    store: new SQLiteStore({
      db: "sessions.db",
      concurrentDB: true,
    }),
    secret: "stackoverflow",
    resave: false,
    saveUninitialized: false,
  }),
);

app.use((req, res, next) => {
  req.session.agent = req.headers["user-agent"];
  req.session.ip = req.socket.remoteAddress;
  next();
});
app.use(
  cors({
    origin: "http://localhost:3000", // allow to server to accept request from different origin
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    credentials: true, // allow session cookie from browser to pass through
  }),
);
app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
app.get("/", (req, res) => {
  res.render("login");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["email", "profile"] }),
);

app.get(
  "/login/password/",
  passport.authenticate("local", {
    successRedirect: "/protected",
    failureRedirect: "/auth/google/failure",
  }),
);

app.get("/auth/users/", async (req, res) => {
  const users = await Prisma.user.findMany();
  res.json(users);
});

app.post("/auth/register/", async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  const user = await Prisma.user.findUnique({
    where: {
      email: email,
    },
  });

  console.log(user);
  if (user) {
    res.status(400).json({ message: "User already exists" });
  }
  await Prisma.user.create({
    data: {
      email: email,
      password: password,
      name: "",
    },
  });

  res.status(201).json({ message: "User created successfully" });
});

app.post("/auth/login/", passport.authenticate("local"), (req, res) => {
  res.json({ message: "User logged in successfully" });
});
app.get("/auth/profile/", (req, res) => {
  console.log("req.user", req.user);
  res.json(req.user);
});

app.get("validate", (req, res) => {
  if (req.user) {
    res.send("You are authenticated");
  } else {
    res.send("You are not authenticated");
  }
});

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    successRedirect: "/protected",
    failureRedirect: "/auth/google/failure",
  }),
);

app.get("/get-user/", (req, res) => {
  res.json({
    message: "You made it to the secure route so you must be authenticated",
    user: req.user,
  });
});

app.get("/protected", isLoggedIn, (req, res) => {
  res.redirect("http://localhost:3000/success");
});

app.post("/post/create/", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;

  const post = await Prisma.post.create({
    data: {
      title: title,
      content: content,
      authorId: req.user.id,
    },
  });
  res.json(post);
});
app.get("/posts/", isLoggedIn, async (req, res) => {
  const posts = await Prisma.post.findMany();
  res.json(posts);
});

app.get("/user-data", isLoggedIn, (req, res) => {
  res.json({ user: req.user });
});

// Assuming app is your Express application instance
app.get("/logout", function (req, res, next) {
  console.log(req.user);

  // Delete session from database
  req.session.destroy(function (err) {
    if (err) {
      return next(err);
    }
    res.json({ message: "Logged out" });
  });
});

app.get("/sessions", (req, res) => {
  res.json(req.sessionStore);
});

app.get("/auth/google/failure", (req, res) => {
  res.send("Failed to authenticate..");
});

app.listen(5000, () => console.log("listening on port: 5000"));
