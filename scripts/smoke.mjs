/**
 * Route smoke test — the automated half of the design iteration loop.
 *
 * With no headless browser available in CI/web sessions, this is the cheapest
 * signal that every design route still renders server-side without throwing:
 * it fetches each page and asserts a 200 plus a design-specific marker in the
 * HTML. Pair it with the Preview pane for visual review.
 *
 *   npm run dev        # in one shell (or rely on the Preview pane)
 *   npm run smoke      # in another  (BASE_URL overrides the target)
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

const ROUTES = [
  { path: "/", marker: "three design directions" },
  { path: "/designs/aurora", marker: "Aurora" },
  { path: "/designs/hextech", marker: "Choose your champion" },
  { path: "/designs/console", marker: "stat-console" },
];

let failures = 0;

for (const { path, marker } of ROUTES) {
  const url = `${BASE}${path}`;
  try {
    const res = await fetch(url);
    const body = await res.text();
    const ok = res.status === 200 && body.includes(marker);
    if (ok) {
      console.log(`  ✓ ${path} — 200, "${marker}" present`);
    } else {
      failures++;
      console.error(
        `  ✗ ${path} — status ${res.status}${
          body.includes(marker) ? "" : `, marker "${marker}" missing`
        }`,
      );
    }
  } catch (err) {
    failures++;
    console.error(`  ✗ ${path} — fetch failed: ${err.message}`);
  }
}

if (failures > 0) {
  console.error(`\n${failures} route(s) failed. Is the dev server up at ${BASE}?`);
  process.exit(1);
}
console.log(`\nAll ${ROUTES.length} routes rendered OK at ${BASE}.`);
