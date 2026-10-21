import { redirect } from 'next/navigation';

/**
 * Connections moved with the rest of the memory service to /memory. Kept
 * as a redirect for the same bookmark-continuity reason as the console
 * route — a server redirect, so no frame renders before the forward.
 */
export default function ConnectionsRedirect() {
    redirect('/memory/connections');
}
