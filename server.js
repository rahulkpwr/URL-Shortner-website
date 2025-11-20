const express = require('express');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const cors = require('cors');

const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'links.json');
const VERSION = "1.0";

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ links: [] }, null, 2));

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

const app = express();
app.use(helmet());
app.use(morgan('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Utilities
const CODE_REGEX = /^[A-Za-z0-9]{6,8}$/;
function isValidCode(code) {
  return CODE_REGEX.test(code);
}
function isValidURL(u) {
  try {
    const url = new URL(u);
    // require protocol http(s)
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (e) {
    return false;
  }
}
function generateCode(length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let s = '';
  for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// API: Create link
app.post('/api/links', (req, res) => {
  const { target, code: customCode } = req.body || {};
  if (!target) return res.status(400).json({ ok: false, error: 'Missing target URL' });
  if (!isValidURL(target)) return res.status(400).json({ ok: false, error: 'Invalid URL (must include http/https)' });

  const db = readDB();
  // If custom provided -> validate
  if (customCode) {
    if (!isValidCode(customCode)) {
      return res.status(400).json({ ok: false, error: 'Custom code invalid. Must match [A-Za-z0-9]{6,8}' });
    }
    const exists = db.links.find(l => l.code.toLowerCase() === customCode.toLowerCase());
    if (exists) return res.status(409).json({ ok: false, error: 'Code already exists' });
    const item = {
      code: customCode,
      target,
      created_at: new Date().toISOString(),
      clicks: 0,
      last_clicked: null
    };
    db.links.push(item);
    writeDB(db);
    return res.status(201).json({ ok: true, link: item });
  }

  // Auto-generate code (6-8 chars): try multiple times
  let tries = 0;
  let newCode;
  do {
    newCode = generateCode(6 + Math.floor(Math.random() * 3)); // 6-8
    tries++;
    if (tries > 10) break;
  } while (db.links.some(l => l.code.toLowerCase() === newCode.toLowerCase()));

  // If we somehow collided too many times, keep incrementing length
  while (db.links.some(l => l.code.toLowerCase() === newCode.toLowerCase())) {
    newCode = generateCode(6 + Math.floor(Math.random() * 3));
  }

  const item = {
    code: newCode,
    target,
    created_at: new Date().toISOString(),
    clicks: 0,
    last_clicked: null
  };
  db.links.push(item);
  writeDB(db);
  return res.status(201).json({ ok: true, link: item });
});

// GET all links
app.get('/api/links', (req, res) => {
  const db = readDB();
  // simple filter support via query: q
  const q = (req.query.q || '').toLowerCase().trim();
  let out = db.links.slice();
  if (q) {
    out = out.filter(l => l.code.toLowerCase().includes(q) || l.target.toLowerCase().includes(q));
  }
  // optional sort parameter: sort=clicks|created desc/prefix
  const sort = req.query.sort || 'created_desc';
  if (sort === 'clicks_desc') out.sort((a,b)=>b.clicks - a.clicks);
  else if (sort === 'clicks_asc') out.sort((a,b)=>a.clicks - b.clicks);
  else if (sort === 'created_asc') out.sort((a,b)=>new Date(a.created_at) - new Date(b.created_at));
  else out.sort((a,b)=>new Date(b.created_at) - new Date(a.created_at));
  res.json({ ok: true, links: out });
});

// GET single link stats
app.get('/api/links/:code', (req, res) => {
  const code = req.params.code;
  const db = readDB();
  const link = db.links.find(l => l.code.toLowerCase() === code.toLowerCase());
  if (!link) return res.status(404).json({ ok: false, error: 'Not found' });
  return res.json({ ok: true, link });
});

// DELETE link
app.delete('/api/links/:code', (req, res) => {
  const code = req.params.code;
  const db = readDB();
  const idx = db.links.findIndex(l => l.code.toLowerCase() === code.toLowerCase());
  if (idx === -1) return res.status(404).json({ ok: false, error: 'Not found' });
  db.links.splice(idx, 1);
  writeDB(db);
  return res.json({ ok: true });
});

// Redirect route
app.get('/:code', (req, res) => {
  const code = req.params.code;
  // exclude known app routes
  if (code === '' || code === 'api' || code === 'healthz' || code === 'code') {
    return res.status(404).send('Not found');
  }
  const db = readDB();
  const link = db.links.find(l => l.code.toLowerCase() === code.toLowerCase());
  if (!link) return res.status(404).send('Not found');

  // Update counts and last_clicked
  link.clicks = (link.clicks || 0) + 1;
  link.last_clicked = new Date().toISOString();
  writeDB(db);

  // 302 redirect
  return res.redirect(302, link.target);
});

// Stats page server-side routing (serves stats.html)
app.get('/code/:code', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'stats.html'));
});

// Health
app.get('/healthz', (req, res) => {
  res.json({
    ok: true,
    version: VERSION,
    uptime_seconds: Math.floor(process.uptime()),
    time: new Date().toISOString()
  });
});

// Fallback for other static assets handled by express.static
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
