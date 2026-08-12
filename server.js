require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
const cors = require("cors");
const Url = require("./models/Url");
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json());
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("./models/User");
const auth = require("./middleware/auth");
const rateLimit = require("express-rate-limit");

const shortenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { message: "Too many URLs created from this IP, try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many attempts, try again later." },
});

app.get("/", (req, res) => {
  res.send("URL Shortener API Running");
});

app.post("/auth/register", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hashed });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.status(201).json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/shorten", auth, shortenLimiter, async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    const { originalUrl, customCode, expiresInDays } = req.body;

    if (!originalUrl) {
      return res.status(400).json({ message: "URL is required" });
    }
    try {
      new URL(originalUrl);
    } catch {
      return res.status(400).json({ message: "Invalid URL" });
    }

    let shortCode;

    if (customCode) {
      const cleaned = customCode.trim();
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleaned)) {
        return res.status(400).json({
          message: "Custom code must be 3-20 characters (letters, numbers, - or _ only)",
        });
      }
      const existing = await Url.findOne({ id: cleaned });
      if (existing) {
        return res.status(400).json({ message: "This code is already taken" });
      }
      shortCode = cleaned;
    } else {
      shortCode = nanoid(6);
    }

    let expiresAt = null;
    if (expiresInDays) {
      const days = Number(expiresInDays);
      if (!isNaN(days) && days > 0) {
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }
    }

    const newUrl = await Url.create({
      id: shortCode,
      originalUrl,
      shortUrl: `${process.env.BASE_URL || `http://localhost:${PORT}`}/${shortCode}`,
      userId: req.userId,
      expiresAt,
    });

    console.log("Saved:", newUrl);

    res.status(201).json({
      message: "Short URL created",
      data: newUrl,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/analytics/all", auth, async (req, res) => {
  try {
    const urls = await Url.find({ userId: req.userId });
    res.json(urls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/analytics/top", auth, async (req, res) => {
  try {
    const topUrls = await Url.find({ userId: req.userId })
      .sort({ clicks: -1 })
      .limit(5);

    res.json(topUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/analytics/:code", auth, async (req, res) => {
  try {
    const url = await Url.findOne({
      id: req.params.code,
      userId: req.userId,
    });

    if (!url) {
      return res.status(404).json({
        message: "URL not found",
      });
    }

    res.json(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/:code", async (req, res) => {
  const url = await Url.findOne({ id: req.params.code });

  if (!url) {
    return res.status(404).json({ message: "URL not found" });
  }

  if (url.expiresAt && new Date() > url.expiresAt) {
    return res.status(410).json({ message: "This link has expired" });
  }

  url.clicks++;
  url.lastAccessed = new Date();
  await url.save();

  res.redirect(url.originalUrl);
});

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(" MongoDB Connected");
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err);
  });
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});