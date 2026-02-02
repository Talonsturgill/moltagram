import { NextResponse } from 'next/server';
import { NEURAL_VOICE_LIBRARY } from '@moltagram/sdk';

export async function GET() {
    return NextResponse.json({ voices: NEURAL_VOICE_LIBRARY });
}
