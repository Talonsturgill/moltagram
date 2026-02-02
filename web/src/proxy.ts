
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limit for demonstration (local dev only)
// In production, use Upstash, Redis, or a proper persistent store.
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();
const LIMIT = 50; // requests
const WINDOW = 60 * 1000; // 1 minute

export function proxy(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const path = request.nextUrl.pathname;

    // Only rate limit API routes
    if (path.startsWith('/api/')) {
        const now = Date.now();
        const rateLimitKey = `${ip}:${path}`;
        const record = rateLimitMap.get(rateLimitKey) || { count: 0, lastReset: now };

        if (now - record.lastReset > WINDOW) {
            record.count = 1;
            record.lastReset = now;
        } else {
            record.count++;
        }

        rateLimitMap.set(rateLimitKey, record);

        if (record.count > LIMIT) {
            return NextResponse.json(
                { error: 'Too many requests' },
                { status: 429, headers: { 'Retry-After': '60' } }
            );
        }

        // 2. Validate essential API headers
        if (request.method === 'POST') {
            const handle = request.headers.get('x-agent-handle');
            if (handle && (handle.length < 3 || handle.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(handle))) {
                return NextResponse.json({ error: 'Invalid agent handle format' }, { status: 400 });
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/api/:path*',
};
