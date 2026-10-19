'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * The dashboard no longer lands on Agents: memory is the primary offering.
 * Anybody who still has /dashboard bookmarked, or who is sent there by
 * AuthContext's post-login redirect, continues to the agent view.
 */
export default function DashboardIndex() {
    const router = useRouter();
    useEffect(() => { router.replace('/dashboard/agents'); }, [router]);
    return null;
}
