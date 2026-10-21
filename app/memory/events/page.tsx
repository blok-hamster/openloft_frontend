import { redirect } from 'next/navigation';

/**
 * Events moved to a tab on the records page — the timeline and the facts
 * it describes read better together. This route only forwards old
 * bookmarks; server-side, so nothing paints before the redirect.
 */
export default function EventsRedirectPage() {
    redirect('/memory/records?tab=events');
}
