# CT Enhanced — Decoupled Frontend–Backend Architecture

This project has been refactored from a monolithic Express/EJS SSR app into a
Decoupled Frontend–Backend Architecture.

```
CT_Enhanced_Decoupled/
├── backend/            ← Pure REST API (Node.js / Express)
│   ├── server.js       ← API server with CORS, rate limiting
│   ├── routes/api.js   ← All REST endpoints (/api/*)
│   └── package.json
│
└── frontend/           ← Static files (HTML / CSS / JS)
    ├── index.html      ← Home page
    ├── 404.html
    ├── pages/          ← All other pages as static HTML
    │   ├── facilities.html, wait-time.html, transport.html
    │   ├── safety.html, lost-found.html, contact.html, navigate.html
    ├── css/style.css
    ├── js/
    │   ├── layout.js   ← Shared header/footer injector
    │   ├── api.js      ← Centralised API client (ES module)
    │   └── main.js     ← UI utilities
    ├── images/
    ├── serve.js        ← Dev static server
    └── package.json
```

## Architecture Overview

```
FRONTEND (static)               REST/JSON              BACKEND (Express)
localhost:3000           ──────────────────────►   localhost:3001
HTML + CSS + JS                                    /api/wait-times
js/api.js (ES module)                              /api/trains
                                                   /api/lockers
                                                   /api/parking
                                                   /api/pods
                                                   POST /api/lost-found
                                                   POST /api/contact
```

## Key Changes

| Concern         | Before (Monolith)          | After (Decoupled)                   |
|-----------------|----------------------------|--------------------------------------|
| Page rendering  | EJS server-side templates  | Static HTML + client-side fetch      |
| Backend role    | Serves HTML + API          | Pure REST API only                   |
| Frontend host   | Coupled to Express         | Any CDN / Netlify / Vercel           |
| CORS            | Not needed (same origin)   | Enabled on backend                   |
| Shared layout   | EJS partials               | layout.js injects header/footer      |
| API calls       | Relative `/api/*`          | Absolute via `window.CT_API_BASE`    |

## Running Locally

```bash
# Terminal 1 – Backend
cd backend && npm install && npm run dev   # http://localhost:3001

# Terminal 2 – Frontend
cd frontend && node serve.js              # http://localhost:3000
```

## Production

- **Frontend** → Netlify / Vercel / Nginx (static files)
- **Backend**  → Railway / Render / Fly.io (Node.js)
- Set `window.CT_API_BASE` in each HTML `<head>` to your deployed API URL.
- Set `FRONTEND_ORIGIN` env var on backend to restrict CORS.
