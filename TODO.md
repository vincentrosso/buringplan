# TODO

- [x] Build unit/regression tests (frontend — no separate backend exists) to 80% coverage. Done via Vitest + React Testing Library (`npm test`, `npm run test:coverage`): 97% statements / 88.6% branches / 95.8% functions / 98% lines, gated at 80% on all four in `vitest.config.ts`. Found and fixed two real bugs along the way (idb-keyval two-stores-one-database silently dropping GPS pings; a suggested-stops off-by-one).
