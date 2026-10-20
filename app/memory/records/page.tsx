'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import styles from '@/components/memory/Memory.module.css';
import MemoryScopeBar from '@/components/memory/MemoryScopeBar';
import views from '../MemoryViews.module.css';
import FactsTab from './FactsTab';
import EventsTab from './EventsTab';
import DecayTab from './DecayTab';

type RecordsTab = 'facts' | 'events' | 'decay';

/** `?tab=` values, with Facts as the default. */
const TABS: { id: RecordsTab; label: string }[] = [
  { id: 'facts', label: 'Facts' },
  { id: 'events', label: 'Events' },
  { id: 'decay', label: 'Decay' },
];

/* URL carries the scope as `agent` / `conversation`; the API wants
   `agentId` / `conversationId`. An empty value is "unscoped", which at the
   service is the tenant's own default store. */
function scopeFromParams(searchParams: URLSearchParams) {
  return {
    agentId: searchParams.get('agent')?.trim() ?? '',
    conversationId: searchParams.get('conversation')?.trim() ?? '',
  };
}

function RecordsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get('tab');
  const active: RecordsTab = raw === 'events' || raw === 'decay' ? raw : 'facts';
  const scope = scopeFromParams(searchParams);

  const handleScopeChange = useCallback(
    (next: { agentId: string; conversationId: string }) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.agentId === '') params.delete('agent');
      else params.set('agent', next.agentId);
      if (next.conversationId === '') params.delete('conversation');
      else params.set('conversation', next.conversationId);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname],
  );

  /* Tab links carry the scope, so switching views does not drop it. */
  const hrefFor = useCallback(
    (tab: RecordsTab) => {
      const params = new URLSearchParams();
      if (tab !== 'facts') params.set('tab', tab);
      if (scope.agentId) params.set('agent', scope.agentId);
      if (scope.conversationId) params.set('conversation', scope.conversationId);
      const qs = params.toString();
      return qs ? `/memory/records?${qs}` : '/memory/records';
    },
    [scope.agentId, scope.conversationId],
  );

  /* Scope changes remount the active tab: fresh pagination, fresh decay
     snapshot, no stale window from the store that was on screen. */
  const scopeKey = `${scope.agentId}|${scope.conversationId}`;
  const scopeProp = useMemo(
    () => ({
      agentId: scope.agentId || undefined,
      conversationId: scope.conversationId || undefined,
    }),
    [scope.agentId, scope.conversationId],
  );

  return (
    <div className={styles.page}>
      <MemoryScopeBar
        agentId={scope.agentId}
        conversationId={scope.conversationId}
        onChange={handleScopeChange}
      />

      <nav className={views.tabBar} aria-label="Record views">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={active === tab.id ? `${views.tabButton} ${views.tabButtonActive}` : views.tabButton}
            aria-current={active === tab.id ? 'true' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {active === 'facts' && <FactsTab key={`facts-${scopeKey}`} scope={scopeProp} />}
      {active === 'events' && <EventsTab key={`events-${scopeKey}`} scope={scopeProp} />}
      {active === 'decay' && <DecayTab key={`decay-${scopeKey}`} scope={scopeProp} />}
    </div>
  );
}

/** useSearchParams needs a Suspense boundary under static prerender — the
    same shape the graph page uses for its entity param. */
export default function RecordsPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <SkeletonLoader variant="text" count={8} />
        </div>
      }
    >
      <RecordsTabs />
    </Suspense>
  );
}
