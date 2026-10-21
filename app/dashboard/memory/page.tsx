import { redirect } from 'next/navigation';

/**
 * The hosted memory service is its own dashboard at /memory. This route
 * only exists so anybody who still has /dashboard/memory bookmarked —
 * it was the account area's first nav item for a while — continues to the
 * console instead of a 404, the same way /dashboard forwards to agents.
 *
 * Server redirect: no blank frame between the request and the console.
 */
export default function MemoryRedirect() {
    redirect('/memory');
}
