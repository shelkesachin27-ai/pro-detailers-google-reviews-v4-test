PRO DETAILERS — Google Reviews Worker TEST

This is a TEST deployment package. It is not the production site.

1. Put this folder in a separate TEST GitHub repository.
2. Connect that repository to a NEW Cloudflare Worker.
3. Configure the Worker secret:
   GOOGLE_PLACES_API_KEY = your existing Google Places API key
4. Deploy.
5. Open the Worker URL and test the Google Customer Reviews section.

Important:
- The API key is intentionally NOT included in this package.
- The old google-reviews.js and google-reviews-config.js files were removed.
- The old bike/ambient MP3 was removed.
- The supplied Vastness — Andrew Ev MP3 is used as the homepage audio at 40% volume.
- Do not connect this test repository to the production worker until the test is confirmed.

V4 update: added /service-pricing/ and /booking/; standardized site navigation across HTML pages; added product/warranty disclaimer.
