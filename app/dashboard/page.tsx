import { redirect } from 'next/navigation';

/**
 * The dashboard no longer lands on Agents: memory is the primary offering.
 * Anybody who still has /dashboard bookmarked, or who is sent there by
 * AuthContext's post-login redirect, continues to the agent view.
 *
 * A server redirect, not a client effect + router.replace: the old shape
 * painted one blank frame (and a flash) before forwarding.
 */
export default function DashboardIndex() {
    redirect('/dashboard/agents');
}
