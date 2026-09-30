/* PRO DETAILERS V4.18 — Cloudflare Worker endpoint
 *
 * Store the Google Maps Platform API key as a Cloudflare Worker secret:
 *   wrangler secret put GOOGLE_PLACES_API_KEY
 *
 * Deploy this Worker and route /api/google-reviews to it, or use the
 * Worker URL directly in google-reviews-config.js.
 */
const PLACE_ID = "ChIJ4VgWWKqDzzsRugUdWzycYPE";
const ALLOWED_ORIGINS = new Set([
  "https://prodetailers.in",
  "https://www.prodetailers.in"
]);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/google-reviews") {
      return new Response("Not found", { status: 404 });
    }
    if (request.method !== "GET") {
      return new Response("Method not allowed", { status: 405 });
    }

    const origin = request.headers.get("Origin") || "";
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return new Response(JSON.stringify({ error: { message: "Origin not allowed" } }), {
        status: 403,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const requestedPlace = url.searchParams.get("placeId") || PLACE_ID;
    if (requestedPlace !== PLACE_ID) {
      return new Response(JSON.stringify({ error: { message: "Invalid placeId" } }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const key = env.GOOGLE_PLACES_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: { message: "Google Places API key is not configured on the Worker." } }), {
        status: 503,
        headers: { "content-type": "application/json; charset=utf-8" }
      });
    }

    const fields = "displayName,rating,userRatingCount,reviews,googleMapsUri";
    const googleUrl = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=${encodeURIComponent(fields)}`;
    const upstream = await fetch(googleUrl, {
      headers: {
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fields
      }
    });

    const body = await upstream.text();
    const headers = new Headers({
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=900",
      "access-control-allow-origin": ALLOWED_ORIGINS.has(origin) ? origin : "https://prodetailers.in",
      "vary": "Origin"
    });
    return new Response(body, { status: upstream.status, headers });
  }
};
