'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Events moved to a tab on the records page — the log and the facts it
 * produced are one browse. This route only forwards old bookmarks; the tab
 * itself is /memory/records?tab=events.
 */
export default function EventsRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/memory/records?tab=events'); }, [router]);
  return null;
}
