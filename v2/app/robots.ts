import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

/**
 * Every search engine and AI assistant may read the public pages (the
 * front door, the kinds of shop, the questions, the price, llms.txt); none
 * reads an owner's or a customer's pages, the console or the API.
 */
export default function robots(): MetadataRoute.Robots {
  const closed = ["/admin", "/api/", "/shop/", "/me", "/c/", "/s/", "/u/", "/scan", "/wallet"];
  const open = ["/", "/shop/new", "/faq", "/prix", "/llms.txt", "/llms-full.txt"];
  const bots = ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "ClaudeBot", "Claude-User", "Claude-SearchBot", "anthropic-ai", "PerplexityBot", "Perplexity-User", "Google-Extended", "Applebot-Extended", "Bingbot", "Googlebot", "meta-externalagent", "CCBot"];
  return {
    rules: [{ userAgent: "*", allow: open, disallow: closed }, ...bots.map((b) => ({ userAgent: b, allow: open, disallow: closed }))],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
