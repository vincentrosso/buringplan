# buringplan

Trip planner for a truck-towed-trailer camping road trip: Stillwater, MN → Apple Valley, MN → Denver, CO → Gerlach, NV.

Plan and reorder waypoints, see route distance/drive time, get suggested rest stops every N hours/N miles (adjustable), find nearby campgrounds and Walmart lots for overnight trailer parking, and track live mileage/speed while driving. The Tracker tab's trip log takes manual entries (with a label like "Apple Valley → Denver"; avg speed is derived from distance ÷ duration) and each row edits and deletes in place. The Plan tab's **Export trip data** / **Import trip data** dumps the whole trip — stops, parking spots, rest-stop intervals, and the trip log — as one plain-text JSON blob you copy out and paste back on another device or after clearing site data (raw GPS pings aren't included). Importing replaces the current trip. Click any numbered flag, parking pin, or suggested-stop marker on the map for details and quick actions (remove a stop, add a suggested stop to the route). The Plan tab's toolbar has **Recalc route** (bypasses the route cache for a fresh pull from Google) and **Clear trip** (wipes all waypoints/parking spots, with a confirm step). Everything is saved in the browser (localStorage + IndexedDB) — no backend, no account.

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
- `npm test` — run the test suite (Vitest)
- `npm run test:coverage` — run tests with a coverage report (gated at 80% lines/statements/functions/branches)

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and publishes to GitHub Pages. Add `VITE_GOOGLE_MAPS_API_KEY` as a repo secret first, and enable Pages (Settings → Pages → Source: GitHub Actions).

The workflow auto-bumps the patch version in `package.json` on every push to `main` and commits it back as `chore(release): vX.Y.Z [skip ci]` (the `[skip ci]` keeps the bump from retriggering the workflow); build and deploy then run against that bumped commit. The running version — plus the short commit SHA and build date on hover — shows next to the title in the app header, so you can tell at a glance whether the deploy you're looking at is the latest. Needs `main` to allow direct pushes from the `GITHUB_TOKEN` (no branch protection blocking it).

## Notes

- Google's Directions API has no truck/trailer height- or weight-restricted routing mode — sanity-check mountain passes (e.g. near Denver) manually.
- "Overnight parking allowed" isn't a field Google exposes for Walmart/campgrounds — the parking finder surfaces nearby candidates, you confirm and note it yourself per spot.
- Live tracking (position/speed logging) keeps working with no signal, since it only needs the device GPS and local storage; the map view itself needs connectivity to load tiles.
- Trip state lives only in your browser (localStorage + IndexedDB) — clearing site data loses it, so treat that as destructive. Use **Export trip data** on the Plan tab to keep a copy you can paste back.
