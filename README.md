# 💊 MediMap — Smart Pharmacy & Availability Tracker

A responsive full-stack web app that helps users find nearby pharmacies, compare medicine availability, and read medication information.

**Stack:** React.js (Vite) · Node.js · Express.js · MongoDB (Mongoose) · OpenFDA REST API · HTML5 Geolocation · OpenStreetMap (Leaflet) · Mapbox

## Features

- **Location-based pharmacy discovery** — HTML5 Geolocation + MongoDB `2dsphere` geospatial queries (`$near`) return pharmacies within a chosen radius, nearest first.
- **Medicine availability comparison** — search a medicine and see only pharmacies that have it in stock, with quantity and price.
- **Medicine information** — drug label data (purpose, indications, dosage, warnings, adverse reactions) from the **OpenFDA** API.
- **Generic-alternative recommendations** — other brands sharing the same active ingredient (OpenFDA) plus same-generic medicines in the local database.
- **Interactive map** — OpenStreetMap tiles via Leaflet, with an optional Mapbox tile layer; user location, search radius, and pharmacy markers with popups.
- **Real pharmacies from OpenStreetMap** — optional toggle that pulls actual pharmacies around you through the Overpass API (availability unknown).
- **REST API** for medicines, pharmacies, and inventory (full CRUD).

## Project structure

```
medimap/
├── server/                # Express + MongoDB API
│   ├── config/db.js
│   ├── models/            # Medicine, Pharmacy (GeoJSON + inventory)
│   ├── routes/            # medicines, pharmacies, openfda
│   ├── services/openfda.js
│   ├── middleware/error.js
│   ├── utils/geo.js
│   ├── seed/seed.js       # demo data
│   └── server.js
├── client/                # React (Vite) frontend
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/    # MedicineSearch, MedicineInfo, PharmacyList, PharmacyMap
└── package.json           # root scripts
```

## Getting started

**Prerequisites:** Node.js 18+ and MongoDB (local, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

```bash
# 1. Install dependencies
npm install                # root (concurrently)
npm run install:all        # server + client

# 2. Configure environment
cp server/.env.example server/.env     # set MONGO_URI, and SEED_LAT / SEED_LNG for your city
cp client/.env.example client/.env     # optional: VITE_MAPBOX_TOKEN

# 3. Seed demo medicines + pharmacies (around SEED_LAT / SEED_LNG)
npm run seed

# 4. Run API (http://localhost:5000) and client (http://localhost:5173) together
npm run dev
```

Open http://localhost:5173, allow location access, then search e.g. `ibuprofen`.

> The seed script places 6 demo pharmacies near `SEED_LAT`/`SEED_LNG`. Set these to your own city's coordinates, otherwise you'll see no pharmacies near you.

## Environment variables

| File | Variable | Purpose |
|------|----------|---------|
| `server/.env` | `MONGO_URI` | MongoDB connection string |
| | `PORT` | API port (default 5000) |
| | `CLIENT_URL` | Allowed CORS origin |
| | `OPENFDA_API_KEY` | Optional, raises OpenFDA rate limit |
| | `SEED_LAT`, `SEED_LNG` | Centre point for demo pharmacies |
| `client/.env` | `VITE_MAPBOX_TOKEN` | Optional, enables Mapbox tiles |
| | `VITE_API_URL` | API base URL in production (default `/api`) |

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/medicines?search=` | Search medicines (name, generic, brand) |
| GET | `/api/medicines/:id` | Medicine details |
| GET | `/api/medicines/:id/alternatives` | Local medicines with the same generic name |
| POST / PUT / DELETE | `/api/medicines[/:id]` | Create / update / delete medicine |
| GET | `/api/pharmacies/nearby?lat&lng&radius&medicine` | Nearby pharmacies, optionally only those with the medicine in stock |
| GET | `/api/pharmacies/osm?lat&lng&radius` | Pharmacies from OpenStreetMap (Overpass) |
| GET | `/api/pharmacies`, `/api/pharmacies/:id` | List / get pharmacies |
| POST | `/api/pharmacies` | Create pharmacy `{ name, address, phone, openingHours, lat, lng }` |
| PUT | `/api/pharmacies/:id/inventory` | Add/update stock `{ medicine, quantity, price }` |
| DELETE | `/api/pharmacies/:id` | Delete pharmacy |
| GET | `/api/openfda/:name` | OpenFDA label info + generic alternatives |

Example:

```bash
curl "http://localhost:5000/api/pharmacies/nearby?lat=28.6139&lng=77.2090&radius=5"
curl "http://localhost:5000/api/openfda/ibuprofen"
```

## Deployment

- **Database:** MongoDB Atlas
- **API:** Render / Railway — set `MONGO_URI`, `CLIENT_URL`
- **Client:** Vercel / Netlify — build command `npm run build` in `client/`, set `VITE_API_URL` to the deployed API (`https://<api-host>/api`)

## Notes

- OpenFDA data is US drug-label data; brand names may differ from those sold locally.
- Demo inventory is randomly generated seed data.
- For information only — not medical advice.

## License

MIT
