# Trimly — URL Shortener Frontend

A React + Vite frontend for a URL shortener, styled as a claim-ticket: paste a
long link, get back a torn stub with a short code you can copy and share.

## Features

- **Shorten** — paste a long URL, get a short code back as a ticket
- **All tickets** — table of every shortened link, with clicks and timestamps
- **Top 5** — the five most-clicked links
- **Look up** — find a single link's stats by its short code

## Setup

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`.

## Backend requirement

This frontend expects the API at `http://localhost:3000` (set in `src/api.js`
— change `BASE_URL` there if your server runs elsewhere).

The backend must have CORS enabled, or requests from `localhost:5173` will be
blocked by the browser:

```bash
npm install cors
```

```js
// server.js
const cors = require("cors");
app.use(cors());
```

## Project structure