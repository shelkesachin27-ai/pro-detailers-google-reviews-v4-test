PRO DETAILERS V4.30 TEST — QUICK DEPLOY

This is a TEST ZIP only. Do not replace the live Main Worker until the test is approved.

Cloudflare project:
  pro-detailers-google-reviews-v4-test

Deploy command:
  npx wrangler deploy

Runtime secret:
  GOOGLE_PLACES_API_KEY = existing Google Places API key (Cloudflare Secret)

Quick checks:
  1) Homepage loads normally.
  2) Google Reviews shows live rating/reviews.
  3) Review cards are compact and premium.
  4) Right-side social rail stays fixed while scrolling.
  5) Supported mobile devices show subtle hero tilt/parallax after motion permission.
  6) /api/google-reviews returns 200 JSON.
  7) Repeat /api/google-reviews and inspect X-Pro-Detailers-Review-Cache for HIT.
  8) Main website/domain remains untouched during testing.


V4.30 note: Google Location section uses Maps URLs only; no Maps Embed API or new billing setup.
