import { UAParser } from "ua-parser-js";

// rough categorization. ua strings are unreliable, but good enough for analytics buckets.
const BOT_RE = /bot|crawler|spider|crawling|preview|monitor|facebookexternalhit|slackbot|discordbot/i;

export function parseUa(ua: string | null) {
  if (!ua) return { device: null, browser: null, os: null };
  if (BOT_RE.test(ua)) return { device: "bot", browser: null, os: null };

  const r = new UAParser(ua).getResult();
  const t = r.device.type; // "mobile" | "tablet" | undefined
  return {
    device: t ?? "desktop",
    browser: r.browser.name ?? null,
    os: r.os.name ?? null,
  };
}
