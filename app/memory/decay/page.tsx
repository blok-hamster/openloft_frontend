import { redirect } from 'next/navigation';

/**
 * Decay moved to a tab on the records page — a fact and the curve it decays
 * along are one read apart. This route only forwards old bookmarks;
 * server-side, so nothing paints before the redirect.
 */
export default function DecayRedirectPage() {
    redirect('/memory/records?tab=decay');
}
