"use strict";

// netlify/functions/get-favicon.js
var fetch = require("node-fetch");
var { parse } = require("url");
var { JSDOM } = require("jsdom");
var FALLBACK_FAVICON = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">\u{1F310}</text></svg>';
var FAVICON_CACHE = /* @__PURE__ */ new Map();
var CACHE_DURATION = 24 * 60 * 60 * 1e3;
var corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};
exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ""
    };
  }
  try {
    const { url } = JSON.parse(event.body);
    if (!url) {
      throw new Error("URL is required");
    }
    const cachedFavicon = FAVICON_CACHE.get(url);
    if (cachedFavicon && Date.now() - cachedFavicon.timestamp < CACHE_DURATION) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({ favicon: cachedFavicon.data })
      };
    }
    const parsedUrl = parse(url);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
    const faviconLocations = [
      `${baseUrl}/favicon.ico`,
      `${baseUrl}/favicon.png`,
      `${baseUrl}/apple-touch-icon.png`,
      `${baseUrl}/apple-touch-icon-precomposed.png`
    ];
    try {
      const response = await fetch(url);
      const html = await response.text();
      const dom = new JSDOM(html);
      const { document } = dom.window;
      const linkTags = document.querySelectorAll('link[rel*="icon"]');
      for (const link of linkTags) {
        const href = link.getAttribute("href");
        if (href) {
          const faviconUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;
          faviconLocations.unshift(faviconUrl);
        }
      }
    } catch (error) {
      console.warn("Failed to parse page for favicon:", error);
    }
    for (const faviconUrl of faviconLocations) {
      try {
        const response = await fetch(faviconUrl);
        if (response.ok) {
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("image")) {
            const buffer = await response.buffer();
            const base64 = buffer.toString("base64");
            const favicon = `data:${contentType};base64,${base64}`;
            FAVICON_CACHE.set(url, {
              data: favicon,
              timestamp: Date.now()
            });
            return {
              statusCode: 200,
              headers: corsHeaders,
              body: JSON.stringify({ favicon })
            };
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch favicon from ${faviconUrl}:`, error);
      }
    }
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ favicon: FALLBACK_FAVICON })
    };
  } catch (error) {
    console.error("Error in get-favicon:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Failed to fetch favicon",
        favicon: FALLBACK_FAVICON
      })
    };
  }
};
//# sourceMappingURL=get-favicon.js.map
