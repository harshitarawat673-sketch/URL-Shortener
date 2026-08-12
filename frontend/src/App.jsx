import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  shortenUrl,
  getAllUrls,
  getTopUrls,
  getUrlByCode,
  registerUser,
  loginUser,
  logoutUser,
  getToken,
  BASE_URL,
} from "./api";

function formatDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function Ticket({ url, onCopy, copied }) {
  return (
    <div className="ticket">
      <div className="ticket-main">
        <span className="eyebrow">Origin</span>
        <p className="origin-url" title={url.originalUrl}>
          {url.originalUrl}
        </p>
        <div className="ticket-stats">
          <div>
            <span className="stat-num">{url.clicks}</span>
            <span className="stat-label">clicks</span>
          </div>
          <div>
            <span className="stat-num-sm">{formatDate(url.createdAt)}</span>
            <span className="stat-label">issued</span>
          </div>
          {url.expiresAt && (
            <div>
              <span className="stat-num-sm">{formatDate(url.expiresAt)}</span>
              <span className="stat-label">expires</span>
            </div>
          )}
        </div>
      </div>
      <div className="ticket-stub">
        <span className="eyebrow">Code</span>
        <p className="short-code">{url.id}</p>
        <div className="qr-wrap">
          <QRCodeSVG value={url.shortUrl} size={88} bgColor="transparent" />
        </div>
        <button className="copy-btn" onClick={() => onCopy(url.shortUrl)}>
          {copied === url.shortUrl ? "Copied" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
function ShortenPane() {
  const [input, setInput] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch {
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!input.trim()) {
      setError("Paste a URL to get a code.");
      return;
    }
    setLoading(true);
    try {
      const res = await shortenUrl(
        input.trim(),
        customCode.trim() || undefined,
        expiresInDays || undefined
      );
      setResult(res.data);
      setInput("");
      setCustomCode("");
      setExpiresInDays("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pane">
      <form className="shorten-form" onSubmit={handleSubmit}>
        <label htmlFor="url-input" className="eyebrow">
          Paste a long URL
        </label>
        <div className="input-row">
          <input
            id="url-input"
            type="text"
            placeholder="https://example.com/a/very/long/path?with=params"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Cutting…" : "Issue ticket"}
          </button>
        </div>

        <div className="optional-row">
          <div>
            <label htmlFor="custom-code" className="eyebrow small">
              Custom code (optional)
            </label>
            <input
              id="custom-code"
              type="text"
              placeholder="my-portfolio"
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="expiry-days" className="eyebrow small">
              Expires in days (optional)
            </label>
            <input
              id="expiry-days"
              type="number"
              min="1"
              placeholder="e.g. 7"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}
      </form>

      {result && (
        <div className="ticket-wrap">
          <Ticket url={result} onCopy={handleCopy} copied={copied} />
        </div>
      )}

      {!result && (
        <div className="empty-state">
          <p>Your shortened link will appear here as a ticket, ready to tear off and share.</p>
        </div>
      )}
    </div>
  );
}
function ListPane({ mode }) {
  const [urls, setUrls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    const fetcher = mode === "top" ? getTopUrls : getAllUrls;
    fetcher()
      .then((data) => {
        if (!cancelled) setUrls(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode]);

  if (loading) return <div className="pane"><p className="hint-text">Pulling the ledger…</p></div>;
  if (error) return <div className="pane"><p className="error-text">{error}</p></div>;
  if (urls.length === 0)
    return (
      <div className="pane">
        <div className="empty-state">
          <p>No tickets issued yet. Shorten a URL to see it listed here.</p>
        </div>
      </div>
    );

  return (
    <div className="pane">
      <table className="ledger">
        <thead>
          <tr>
            <th>Code</th>
            <th>Destination</th>
            <th>Clicks</th>
            <th>Last accessed</th>
            <th>Issued</th>
          </tr>
        </thead>
        <tbody>
          {urls.map((u) => (
            <tr key={u.id}>
              <td className="mono-cell">{u.id}</td>
              <td className="url-cell" title={u.originalUrl}>
                {u.originalUrl}
              </td>
              <td className="mono-cell">{u.clicks}</td>
              <td>{formatDate(u.lastAccessed)}</td>
              <td>{formatDate(u.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LookupPane() {
  const [code, setCode] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");

  const handleCopy = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(""), 1500);
    } catch {
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);
    if (!code.trim()) {
      setError("Enter a code to look up.");
      return;
    }
    setLoading(true);
    try {
      const data = await getUrlByCode(code.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pane">
      <form className="shorten-form" onSubmit={handleSubmit}>
        <label htmlFor="code-input" className="eyebrow">
          Look up a code
        </label>
        <div className="input-row">
          <input
            id="code-input"
            type="text"
            placeholder="e.g. aZ3k9Q"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Searching…" : "Find"}
          </button>
        </div>
        {error && <p className="error-text">{error}</p>}
      </form>

      {result && (
        <div className="ticket-wrap">
          <Ticket url={result} onCopy={handleCopy} copied={copied} />
        </div>
      )}
    </div>
  );
}

function AuthPane({ onAuthed }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await loginUser(email.trim(), password);
      } else {
        await registerUser(email.trim(), password);
      }
      onAuthed();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pane auth-wrap">
      <form className="shorten-form" onSubmit={handleSubmit}>
        <label htmlFor="email-input" className="eyebrow">
          {mode === "login" ? "Log in" : "Create an account"}
        </label>
        <input
          id="email-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          id="password-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit" className="submit-btn" disabled={loading}>
          {loading
            ? mode === "login"
              ? "Logging in…"
              : "Creating account…"
            : mode === "login"
            ? "Log in"
            : "Register"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </form>

      <p className="auth-switch">
        {mode === "login" ? "Need an account?" : "Already have an account?"}{" "}
        <button
          type="button"
          className="auth-switch-btn"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
        >
          {mode === "login" ? "Register instead" : "Log in instead"}
        </button>
      </p>
    </div>
  );
}

const TABS = [
  { id: "shorten", label: "Shorten" },
  { id: "all", label: "All tickets" },
  { id: "top", label: "Top 5" },
  { id: "lookup", label: "Look up" },
];

export default function App() {
  const [tab, setTab] = useState("shorten");
  const [authed, setAuthed] = useState(!!getToken());
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem("theme") === "dark"
  );

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleLogout = () => {
    logoutUser();
    setAuthed(false);
  };

  if (!authed) {
    return (
      <div className={`app-shell ${darkMode ? "dark" : ""}`}>
        <header className="app-header auth-header">
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path
                  d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h1>Trimly</h1>
              <p className="tagline">Long links, cut down to a claim ticket.</p>
            </div>
          </div>
        </header>
        <main className="auth-page">
          <AuthPane onAuthed={() => setAuthed(true)} />
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell ${darkMode ? "dark" : ""}`}>
      <header className="app-header">
        <div className="brand">
         <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="28" height="28">
              <path
                d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1>Trimly</h1>
            <p className="tagline">Long links, cut down to a claim ticket.</p>
          </div>
        </div>
        <div className="header-actions">
          <button type="button" className="copy-btn" onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? "☀ Light" : "🌙 Dark"}
          </button>
          <button type="button" className="copy-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </header>

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`tab ${tab === t.id ? "active" : ""}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === "shorten" && <ShortenPane />}
        {tab === "all" && <ListPane mode="all" />}
        {tab === "top" && <ListPane mode="top" />}
        {tab === "lookup" && <LookupPane />}
      </main>

      <footer className="app-footer">
        <span>Every code is a torn stub — the origin stays on file until someone redeems it.</span>
      </footer>
    </div>
  );
}