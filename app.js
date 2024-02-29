const express = require("express");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");
const SQLiteStore = require("connect-sqlite3")(session);
const { MongoClient, ServerApiVersion } = require("mongodb");

require("./auth");
const morgan = require("morgan");
const app = express();
const nodemailer = require("nodemailer");
const { PrismaClient } = require("@prisma/client");

const transport = nodemailer.createTransport({
  host: "sandbox.smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "06f49a2c028e02",
    pass: "199cbeb237342c",
  },
});

const Prisma = new PrismaClient();
function isLoggedIn(req, res, next) {
  console.log("Request Headers:", req.headers);
  req.user ? next() : res.sendStatus(401);
}
app.use(express.json());
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms"),
);
const MongoDBStore = require("connect-mongodb-session")(session);

const uri =
  "mongodb+srv://boodycat09:S7lD6rKlIa19stFb@cluster0.jpx8x24.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoDBStore({
  uri: uri,
  databaseName: "session",
});

const readConcern = new MongoClient(uri);
client.on("error", function (error) {
  console.log(error);
});

app.set("trust proxy", 1);
app.use(
  session({
    store: client,
    secret:
      "MhJwU5b37Vx8snMG4AZidebftVB7JxNYP237klqFDsgt1P832X23qCOFbMYxqtO3Z6pwfwm8",
    resave: false,
    saveUninitialized: false, // Set to false to prevent saving uninitialized sessions
    rolling: true, // Enable rolling sessions
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "none",
      domain: "https://next-auth-app-six-delta.vercel.app/login",
    },
  }),
);
app.use((req, res, next) => {
  // Save user IP and user-agent in session
  req.session.ip = req.ip;
  req.session.userAgent = req.get("User-Agent");
  next();
});

app.use((req, res, next) => {
  req.session.agent = req.headers["user-agent"];
  req.session.ip = req.socket.remoteAddress;
  next();
});

const allowedOrigins = [
  "https://next-auth-app-six-delta.vercel.app",
  "http://localhost:3000",
  // Add more origins as needed
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  preflightContinue: false, // Disable preflight caching
  optionsSuccessStatus: 204, // Set the status code for successful OPTIONS requests
};

app.use(cors(corsOptions));

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

app.get("/auth/listAllSessions/", (req, res) => {
  const result = client.all(function (err, sessions) {
    res.json(sessions);
  });
});

app.post("/auth/login/", passport.authenticate("local"), (req, res) => {
  // Set a session variable
  req.session.myData = "hello world";
  const userData = JSON.stringify(req.user);
  // Set a custom cookie
  res.cookie("myCustomCookie", userData, {
    maxAge: 24 * 60 * 60 * 100,
    secure: true,
    httpOnly: true,
    sameSite: "none",
    domain: "https://next-auth-app-six-delta.vercel.app/login",
  });

  req.session.myData = "hello world";
  res.json({ message: "User logged in successfully", user: req.user });
});

app.post("/auth/register/", async (req, res) => {
  const { email, password } = req.body;
  const user = await Prisma.user.findUnique({
    where: {
      email: email,
    },
  });

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
  const userData = JSON.stringify(req.user);
  // Set a custom cookie

  res.user = req.user;
  res.redirect(`${process.env.CLIENT_URL}/posts`);
});

app.post("/post/create/", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  console.log("req.user.id", req.user);
  const post = await Prisma.post.create({
    data: {
      title: title,
      content: content,
      authorId: req.user.id,
    },
  });
  res.json(post);
});

app.get("/posts", isLoggedIn, async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 10; // Default page size is 10, you can change it as needed
  const skip = (page - 1) * pageSize;

  try {
    const totalPosts = await Prisma.post.count();
    const posts = await Prisma.post.findMany({
      skip: skip,
      take: pageSize,
      include: {
        author: true,
      },
    });

    const totalPages = Math.ceil(totalPosts / pageSize);

    console.log(posts);
    res.json({
      posts,
      currentPage: page,
      totalPages,
      pageSize,
      totalPosts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/get-auth-related-sessions/", (req, res) => {
  const allDataFromSessionStore = client.all();
  console.log("allDataFromSessionStore", allDataFromSessionStore);
  const sessions = Object.values(allDataFromSessionStore);
  console.log(sessions);
});

app.get("/user-data", isLoggedIn, (req, res) => {
  res.json({ user: req.user });
});

app.get("/say-something", (req, res) => {
  res.send("Hello, World!");
});

app.get("/auth/active-sessions", async (req, res) => {
  await readConcern.connect();
  const database = readConcern.db();
  const collections = await database.listCollections().toArray();

  const collectionNames = collections.map((collection) => collection.name);

  console.log(collectionNames);

  res.json({
    collections: collectionNames,
  });
});

app.get("/logout", function (req, res, next) {
  console.log("______________ start logout______________");
  console.log("______________ start req user______________");
  console.log(req.user);
  console.log("______________  end req user______________");
  console.log(req.logout);
  console.log("______________ end logout______________");
  req.logout(function (err) {
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

app.post("/send-email", async (req, res) => {
  const info = await transport.sendMail({
    from: "from@example.com", // sender address
    to: "aquaaurelia@yogirt.com", // list of receivers
    subject: "Hello ✔", // Subject line
    text: "Hello world?", // plain text body
    html: "<b>Hello world?</b>", // html body
  });

  res.json({ message: "Email sent successfully" });
});

app.listen(5000, () => console.log("listening on port: 5000"));
