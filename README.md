# fire-dashboard
Personal FIRE progress dashboard

## Retirement calculations

Serve this directory over HTTP(S); Web Workers do not run from `file://` URLs.
`retirement-worker.js` loads the existing engine and performs full-count Monte Carlo,
sustainable-spending searches, decision comparisons and validation off the UI thread.
The full `simulations` and `sustainable_search_iterations` settings in
`retirement-data.json` are used; legacy `interactive_*` values remain preserved but
are not used by the retirement UI. Identical requests are cached for the session,
and a newer Lifestyle selection supersedes older results.

Run `npm ci`, `npm test`, `npx playwright install chromium`, then
`npm run test:browser`. CI also installs browser system dependencies.
The browser checks cover tab responsiveness, full sample counts, stale-result
protection, cache reuse, worker recovery and mobile navigation.
