# Wellntel Map Demo

React + Express demo of the Wellntel US sensor map (Leaflet + Esri basemaps). Dev setup matches Linka Portal: Vite on the front, `tsx watch` on the back, two terminals, hot reload.

## Dev setup

Terminal 1 — backend:

```bash
cd server
npm install
npm run dev
```

Terminal 2 — frontend:

```bash
cd client
npm install
npm run dev
```

- Frontend: http://localhost:4300
- API health: http://localhost:4301/api/health

Local client uses the Vite `/api` proxy (`VITE_API_URL` empty).
