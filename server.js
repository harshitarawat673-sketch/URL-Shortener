require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const { nanoid } = require("nanoid");
const Url = require("./models/Url");
const app = express();
const PORT = 3000;

app.use(express.json());

// HOME
app.get("/", (req, res) => {
  res.send("URL Shortener API Running");
});

// CREATE SHORT URL
app.post("/shorten", async (req, res) => {
  try {
    console.log("Request Body:", req.body);

    const { originalUrl } = req.body;

    if (!originalUrl) {
      return res.status(400).json({
        message: "URL is required",
      });
    }
     try {
            new URL(originalUrl);
        } catch {
            return res.status(400).json({
                message: "Invalid URL"
            });
        }
    const shortCode = nanoid(6);

    const newUrl = await Url.create({
      id: shortCode,
      originalUrl,
      shortUrl: `http://localhost:${PORT}/${shortCode}`,
    });

    console.log("Saved:", newUrl);

    res.status(201).json({
      message: "Short URL created",
      data: newUrl,
    });
  } catch (err) {
    console.error(err);   
    res.status(500).json({
      message: err.message,
    });
  }
});

// GET ALL URL ANALYTICS
app.get("/analytics/all", async (req, res) => {
  try {
    const urls = await Url.find();
    res.json(urls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// TOP 5 MOST CLICKED URLS
app.get("/analytics/top", async (req, res) => {
  try {
    const topUrls = await Url.find()
        .sort({ clicks: -1 })
        .limit(5);

    res.json(topUrls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// SINGLE URL ANALYTICS
app.get("/analytics/:code", async (req, res) => {
  try {
    const url = await Url.findOne({
        id: req.params.code
    });

    if (!url) {
        return res.status(404).json({
            message: "URL not found"
        });
    }

    res.json(url);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// REDIRECT TO ORIGINAL URL
app.get("/:code", async (req, res) => {

    const url = await Url.findOne({
        id: req.params.code
    });

    if (!url) {
        return res.status(404).json({
            message: "URL not found"
        });
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

