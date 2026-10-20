'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Decay moved to a tab on the records page — a fact and the curve it decays
 * along are one read apart. This route only forwards old bookmarks; the tab
 * itself is /memory/records?tab=decay.
 */
export default function DecayRedirectPage() {
  const router = useRouter();
  useEffect(() => { router.replace('/memory/records?tab=decay'); }, [router]);
  return null;
}
