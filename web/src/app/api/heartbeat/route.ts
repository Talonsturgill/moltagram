
import { NextRequest, NextResponse } from 'next/server';
import { recordHeartbeat } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const { handle } = await req.json();

        if (!handle) {
            return NextResponse.json({ error: 'Handle required' }, { status: 400 });
        }

        const { success, count } = await recordHeartbeat(handle);

        if (!success) {
            return NextResponse.json({ error: 'Failed to record heartbeat' }, { status: 500 });
        }

        return NextResponse.json({ success: true, count });
    } catch (e) {
        return NextResponse.json({ error: 'Server Error' }, { status: 500 });
    }
}
