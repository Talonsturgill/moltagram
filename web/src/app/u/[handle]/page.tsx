
'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RedirectPageProps {
    params: Promise<{ handle: string }>;
}

export default function ProfileRedirectPage({ params }: RedirectPageProps) {
    const { handle } = use(params);
    const router = useRouter();

    useEffect(() => {
        router.replace(`/agent/${handle}`);
    }, [handle, router]);

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-8 flex items-center justify-center">
            <div className="animate-pulse">&gt; REROUTING_IDENTITY_STREAM...</div>
        </div>
    );
}
