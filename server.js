
const express = require("express");
const fs = require("fs");
const { nanoid } = require("nanoid");

const app = express();
const PORT = 3000;

app.use(express.json());

const DATA_FILE = "./data.json";

// Read data from JSON
function readData() {
  const data = fs.readFileSync(DATA_FILE);
  return JSON.parse(data);
}

// Write data to JSON
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// HOME
app.get("/", (req, res) => {
  res.send("URL Shortener API Running");
});

// CREATE SHORT URL
app.post("/shorten", (req, res) => {
  const { originalUrl } = req.body;

  if (!originalUrl) {
    return res.status(400).json({
      message: "URL is required",
    });
  }

  const data = readData();

  const shortCode = nanoid(6);

  const newUrl = {
    id: shortCode,
    originalUrl,
    shortUrl: `http://localhost:${PORT}/${shortCode}`,
    clicks: 0,
    lastAccessed: null,
    createdAt: new Date(),
  };

  data.urls.push(newUrl);

  writeData(data);

  res.status(201).json({
    message: "Short URL created",
    data: newUrl,
  });
});

// GET ALL URL ANALYTICS
app.get("/analytics/all", (req, res) => {
  const data = readData();

  res.json(data.urls);
});

// TOP 5 MOST CLICKED URLS
app.get("/analytics/top", (req, res) => {
  const data = readData();

  const topUrls = [...data.urls]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  res.json(topUrls);
});

// SINGLE URL ANALYTICS
app.get("/analytics/:code", (req, res) => {
  const { code } = req.params;

  const data = readData();

  const url = data.urls.find((u) => u.id === code);

  if (!url) {
    return res.status(404).json({
      message: "URL not found",
    });
  }

  res.json({
    originalUrl: url.originalUrl,
    shortUrl: url.shortUrl,
    clicks: url.clicks,
    lastAccessed: url.lastAccessed,
    createdAt: url.createdAt,
  });
});

// REDIRECT TO ORIGINAL URL
app.get("/:code", (req, res) => {
  const { code } = req.params;

  const data = readData();

  const url = data.urls.find((u) => u.id === code);

  if (!url) {
    return res.status(404).json({
      message: "URL not found",
    });
  }

  // Analytics
  url.clicks += 1;
  url.lastAccessed = new Date();

  writeData(data);

  res.redirect(url.originalUrl);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

