'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Connections moved with the rest of the memory service to /memory. Kept
 * as a redirect for the same bookmark-continuity reason as the console
 * route above it.
 */
export default function ConnectionsRedirect() {
    const router = useRouter();
    useEffect(() => { router.replace('/memory/connections'); }, [router]);
    return null;
}
