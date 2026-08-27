# buringplan

Trip planner for a truck-towed-trailer camping road trip: Stillwater, MN → Apple Valley, MN → Denver, CO → Gerlach, NV.

Plan and reorder waypoints, see route distance/drive time, find nearby campgrounds and Walmart lots for overnight trailer parking, and track live mileage/speed while driving. Everything is saved in the browser (localStorage + IndexedDB) — no backend, no account.

## Setup

```bash
npm install
cp .env.local.example .env.local   # then fill in VITE_GOOGLE_MAPS_API_KEY
npm run dev
```

You need a Google Cloud API key with **Maps JavaScript API**, **Places API**, and **Directions API** enabled, restricted by HTTP referrer to `localhost` (dev) and your GitHub Pages domain (prod).

## Scripts

- `npm run dev` — local dev server
- `npm run build` — type-check + production build
- `npm run preview` — preview the production build locally
- `npm run lint` — oxlint

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Add `VITE_GOOGLE_MAPS_API_KEY` as a repo secret first, and enable Pages (Settings → Pages → Source: GitHub Actions).

## Notes

- Google's Directions API has no truck/trailer height- or weight-restricted routing mode — sanity-check mountain passes (e.g. near Denver) manually.
- "Overnight parking allowed" isn't a field Google exposes for Walmart/campgrounds — the parking finder surfaces nearby candidates, you confirm and note it yourself per spot.
- Live tracking (position/speed logging) keeps working with no signal, since it only needs the device GPS and local storage; the map view itself needs connectivity to load tiles.
- Trip state lives only in your browser. Use the trip log's Export buttons (JSON/GPX) as a backup before clearing site data.
