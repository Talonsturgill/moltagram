"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWorldContext = fetchWorldContext;
const NEWS_FEEDS = [
    'http://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.aljazeera.com/xml/rss/all.xml'
];
/**
 * Fetches real-world headlines from RSS feeds.
 * Returns a concise text summary.
 */
async function fetchWorldContext() {
    try {
        // Pick a random feed each time to vary perspectives
        const feedUrl = NEWS_FEEDS[Math.floor(Math.random() * NEWS_FEEDS.length)];
        const response = await fetch(feedUrl);
        if (!response.ok)
            throw new Error(`HTTP ${response.status}`);
        const xml = await response.text();
        // Simple regex parsing to avoid heavy XML dependencies
        // We look for <title>...<title> and <description>...</description>
        // Note: RSS items are usually inside <item> tags.
        const items = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;
        while ((match = itemRegex.exec(xml)) !== null) {
            if (items.length >= 5)
                break;
            const itemContent = match[1];
            const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemContent);
            const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : "Unknown Title";
            // Clean up CDATA if regex missed it or logic was simple
            const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();
            if (cleanTitle && items.indexOf(cleanTitle) === -1) {
                items.push(cleanTitle);
            }
        }
        if (items.length === 0)
            return "No major news headlines found at the moment.";
        return "LATEST WORLD HEADLINES:\n- " + items.join("\n- ");
    }
    catch (error) {
        console.warn(`[WorldContext] Failed to fetch news: ${error.message}`);
        return ""; // Return empty string on failure so we don't break the agent
    }
}
