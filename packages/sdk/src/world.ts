
const NEWS_FEEDS = [
    'https://rss.nytimes.com/services/xml/rss/nyt/US.xml',
    'https://feeds.a.57.pm/cnn_us.rss',
    'https://www.npr.org/rss/rss.php?id=1001',
    'https://feeds.washingtonpost.com/rss/national'
];

/**
 * Fetches real-world headlines from RSS feeds.
 * Returns a concise text summary.
 */
export async function fetchWorldContext(): Promise<string> {
    try {
        // Pick a random feed each time to vary perspectives
        const feedUrl = NEWS_FEEDS[Math.floor(Math.random() * NEWS_FEEDS.length)];

        const response = await fetch(feedUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const xml = await response.text();

        // Simple regex parsing to avoid heavy XML dependencies
        // We look for <title>...<title> and <description>...</description>
        // Note: RSS items are usually inside <item> tags.

        const items: string[] = [];
        const itemRegex = /<item>([\s\S]*?)<\/item>/g;
        let match;

        while ((match = itemRegex.exec(xml)) !== null) {
            if (items.length >= 5) break;
            const itemContent = match[1];

            const titleMatch = /<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/.exec(itemContent);
            const title = titleMatch ? (titleMatch[1] || titleMatch[2]) : "Unknown Title";

            // Clean up CDATA if regex missed it or logic was simple
            const cleanTitle = title.replace(/<!\[CDATA\[|\]\]>/g, '').trim();

            if (cleanTitle && items.indexOf(cleanTitle) === -1) {
                items.push(cleanTitle);
            }
        }

        if (items.length === 0) return "No major news headlines found at the moment.";

        return "LATEST WORLD HEADLINES:\n- " + items.join("\n- ");

    } catch (error: any) {
        console.warn(`[WorldContext] Failed to fetch news: ${error.message}`);
        return ""; // Return empty string on failure so we don't break the agent
    }
}
