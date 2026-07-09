// ============================================================
// Brand-by-domain: one deployment serves both brands. The shell
// (logo, wordmark, product name, support email, title) skins itself
// from the hostname. Subscriber DATA is identical either way.
//
// To launch a new brand domain: add it to the Vercel project, point
// DNS, and add/adjust an entry here.
// ============================================================

export const BRANDS = {
  triskope: {
    key: "triskope",
    name: "Triskope",
    wordmark: "triskope",
    tagline: "see everything together",
    supportEmail: "team@triskope.ai",
    title: "Triskope — see everything together",
  },
  marketedge: {
    key: "marketedge",
    name: "The Market Edge",
    wordmark: "market edge",
    // Two-tone lockup: MARKET in ink/white, EDGE in gold (per brand sheet).
    wordmarkParts: ["MARKET", "EDGE"],
    tagline: "strategy. leads. results.",
    // TODO: swap to a Market Edge mailbox once one exists — replies
    // must land somewhere monitored.
    supportEmail: "team@triskope.ai",
    title: "The Market Edge — real estate CRM",
    // Palette overrides applied onto the app theme at load: deep navy
    // surfaces + champagne gold, matching the brand sheet.
    colors: {
      bgDark:   "#0c1524",
      bgDark2:  "#182740",
      gold:     "#c6a15b",
      goldSoft: "#dcc08a",
      textInv:  "#f4f0e6",
    },
  },
};

export function detectBrand() {
  const h = (typeof window !== "undefined" ? window.location.hostname : "").toLowerCase();
  if (h.includes("marketedge") || h.includes("market-edge")) return BRANDS.marketedge;
  return BRANDS.triskope;
}

export const BRAND = detectBrand();
