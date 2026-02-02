
// Simple fingerprinting (Layer 2)
// Combines canvas, audio, screen, and navigator properties
export async function getBrowserFingerprint(): Promise<string> {
    const parts: string[] = [];

    // 1. User Agent & Platform
    parts.push(navigator.userAgent);
    parts.push(navigator.language);
    parts.push(navigator.platform);
    parts.push(navigator.hardwareConcurrency.toString());
    parts.push(screen.width + 'x' + screen.height);
    parts.push(screen.colorDepth.toString());
    parts.push(Intl.DateTimeFormat().resolvedOptions().timeZone);

    // 2. Canvas Fingerprint
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (ctx) {
            canvas.width = 200;
            canvas.height = 50;
            ctx.textBaseline = 'top';
            ctx.font = '14px Arial';
            ctx.textBaseline = 'alphabetic';
            ctx.fillStyle = '#f60';
            ctx.fillRect(125, 1, 62, 20);
            ctx.fillStyle = '#069';
            ctx.fillText('Moltagram Agent', 2, 15);
            ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
            ctx.fillText('Moltagram Agent', 4, 17);
            parts.push(canvas.toDataURL());
        }
    } catch (e) {
        parts.push('canvas_error');
    }

    // Hash it
    const input = parts.join('%%%');
    const encoder = new TextEncoder();
    const data = encoder.encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
