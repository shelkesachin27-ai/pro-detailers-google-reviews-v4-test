/**
 * PRO DETAILERS — Cloudflare Worker
 * Serves the static website and securely proxies Google Places API reviews.
 * Google API key MUST be configured as the Worker secret GOOGLE_PLACES_API_KEY.
 */

const PLACE_ID = "ChIJ4VgWWKqDzzsRugUdWzycYPE";
const REVIEW_CACHE_TTL = 6 * 60 * 60; // 6 hours
const ALLOWED_ORIGINS = new Set([
  "https://prodetailers.in",
  "https://www.prodetailers.in"
]);

function securityHeaders(headers = {}) {
  const h = new Headers(headers);
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("X-Frame-Options", "SAMEORIGIN");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  return h;
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Vary": "Origin"
  };
  if (ALLOWED_ORIGINS.has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(data, status, origin, cacheState = "BYPASS") {
  return new Response(JSON.stringify(data), {
    status,
    headers: securityHeaders({
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": status === 200
        ? `public, max-age=300, s-maxage=${REVIEW_CACHE_TTL}, stale-if-error=86400`
        : "no-store",
      "X-Pro-Detailers-Review-Cache": cacheState,
      ...corsHeaders(origin)
    })
  });
}

function reviewCacheRequest(request, origin) {
  const cacheUrl = new URL(request.url);
  // Keep CORS responses separated when the same endpoint is used by multiple origins.
  cacheUrl.searchParams.set("__review_origin", origin || "none");
  return new Request(cacheUrl.toString(), { method: "GET" });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";

    if (url.pathname === "/api/google-reviews") {
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders(origin) });
      }
      if (request.method !== "GET") {
        return json({ error: { message: "Method not allowed" } }, 405, origin);
      }
      if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return json({ error: { message: "Origin not allowed" } }, 403, origin);
      }
      if (!env.GOOGLE_PLACES_API_KEY) {
        return json({ error: { message: "Google Places API secret is not configured." } }, 503, origin);
      }

      const fields = [
        "displayName",
        "rating",
        "userRatingCount",
        "reviews",
        "googleMapsUri"
      ].join(",");

      const googleUrl = `https://places.googleapis.com/v1/places/${PLACE_ID}?fields=${encodeURIComponent(fields)}`;
      const cache = caches.default;
      const cacheKey = reviewCacheRequest(request, origin);

      // Serve the last successful Google response for up to 6 hours.
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return new Response(cachedResponse.body, {
          status: cachedResponse.status,
          statusText: cachedResponse.statusText,
          headers: securityHeaders({
            ...Object.fromEntries(cachedResponse.headers),
            "X-Pro-Detailers-Review-Cache": "HIT"
          })
        });
      }

      try {
        const googleResponse = await fetch(googleUrl, {
          method: "GET",
          headers: {
            "X-Goog-Api-Key": env.GOOGLE_PLACES_API_KEY,
            "X-Goog-FieldMask": fields,
            "Accept": "application/json"
          }
        });

        const body = await googleResponse.text();
        let data;
        try {
          data = JSON.parse(body);
        } catch {
          data = { error: { message: "Invalid response from Google Places API." } };
        }

        if (!googleResponse.ok) {
          return json({ error: data.error || { message: "Google Places API request failed." } }, googleResponse.status, origin);
        }

        // Return only fields needed by the public website.
        const payload = {
          displayName: data.displayName || null,
          rating: data.rating || null,
          userRatingCount: data.userRatingCount || null,
          googleMapsUri: data.googleMapsUri || null,
          reviews: Array.isArray(data.reviews) ? data.reviews.slice(0, 5).map(review => ({
            rating: review.rating || null,
            relativePublishTimeDescription: review.relativePublishTimeDescription || "",
            text: review.text || null,
            originalText: review.originalText || null,
            authorAttribution: review.authorAttribution ? {
              displayName: review.authorAttribution.displayName || "Google user",
              uri: review.authorAttribution.uri || "",
              photoUri: review.authorAttribution.photoUri || ""
            } : null,
            googleMapsUri: review.googleMapsUri || null
          })) : []
        };

        const response = json(payload, 200, origin, "MISS");
        // Cache only successful Google responses. waitUntil keeps the user response fast.
        const cacheResponse = response.clone();
        const cacheStore = new Response(cacheResponse.body, {
          status: cacheResponse.status,
          statusText: cacheResponse.statusText,
          headers: new Headers(cacheResponse.headers)
        });
        cacheStore.headers.set("Cache-Control", `public, max-age=${REVIEW_CACHE_TTL}, s-maxage=${REVIEW_CACHE_TTL}, stale-if-error=86400`);
        cacheStore.headers.set("X-Pro-Detailers-Review-Cache", "STORED");
        if (typeof caches !== "undefined" && caches.default) {
          ctx.waitUntil(cache.put(cacheKey, cacheStore));
        }
        return response;
      } catch (error) {
        return json({ error: { message: "Unable to reach Google Places API." } }, 502, origin);
      }
    }

    // Do not expose deployment/configuration artifacts as public website content.
    const blocked = new Set([
      "/wrangler.jsonc", "/worker.js", "/cloudflare-google-reviews-worker.js",
      "/README-CLOUDFLARE.txt", "/GOOGLE_REVIEWS_SETUP.md"
    ]);
    if (blocked.has(url.pathname)) {
      return new Response("Not found", { status: 404, headers: securityHeaders() });
    }

    // Static website assets are served by Cloudflare Workers Static Assets.
    if (env.ASSETS) {
      const response = await env.ASSETS.fetch(request);
      const headers = securityHeaders(response.headers);
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    }

    return new Response("Not found", { status: 404, headers: securityHeaders() });
  }
};
