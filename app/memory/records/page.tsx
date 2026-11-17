'use client';

import { Suspense, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import styles from '@/components/memory/Memory.module.css';
import MemoryScopeBrowser from '@/components/memory/MemoryScopeBrowser';
import views from '../MemoryViews.module.css';
import FactsTab from './FactsTab';
import EventsTab from './EventsTab';
import DecayTab from './DecayTab';
import TurnsTab from './TurnsTab';

type RecordsTab = 'facts' | 'transcript' | 'events' | 'decay';

/** `?tab=` values, with Facts as the default. Transcript sits beside Facts:
 *  the facts are what the engine extracted, the transcript is the wording
 *  they were extracted from — the same conversation, two readings. */
const TABS: { id: RecordsTab; label: string }[] = [
  { id: 'facts', label: 'Facts' },
  { id: 'transcript', label: 'Transcript' },
  { id: 'events', label: 'Events' },
  { id: 'decay', label: 'Decay' },
];

/** What a scope chip anywhere on the page proposes. `shared` is absent
 *  (undefined) for agent-scoped and whole-tenant proposals; `true` names the
 *  pre-agent shared store, which no agent string can address. */
export type ScopeProposal = {
  agentId: string;
  conversationId: string;
  shared?: boolean;
};

/* URL carries the scope as `agent` / `conversation` / `shared`; the API wants
   `agentId` / `conversationId` / `shared`. An empty value is "unscoped", which
   at the service is the whole tenant — every agent, every conversation. */
function scopeFromParams(searchParams: URLSearchParams) {
  return {
    agentId: searchParams.get('agent')?.trim() ?? '',
    conversationId: searchParams.get('conversation')?.trim() ?? '',
    shared: searchParams.get('shared') === '1',
  };
}

function RecordsTabs() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const raw = searchParams.get('tab');
  const active: RecordsTab =
    raw === 'transcript' || raw === 'events' || raw === 'decay' ? raw : 'facts';
  const scope = scopeFromParams(searchParams);

  const handleScopeChange = useCallback(
    (next: ScopeProposal) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.agentId === '') params.delete('agent');
      else params.set('agent', next.agentId);
      if (next.conversationId === '') params.delete('conversation');
      else params.set('conversation', next.conversationId);
      if (next.shared) params.set('shared', '1');
      else params.delete('shared');
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
      if (scope.shared) params.set('shared', '1');
      const qs = params.toString();
      return qs ? `/memory/records?${qs}` : '/memory/records';
    },
    [scope.agentId, scope.conversationId, scope.shared],
  );

  /* Scope changes remount the active tab: fresh pagination, fresh decay
     snapshot, no stale window from the store that was on screen. */
  const scopeKey = `${scope.agentId}|${scope.conversationId}|${scope.shared ? 'shared' : 'all'}`;
  const scopeProp = useMemo(
    () => ({
      agentId: scope.agentId || undefined,
      conversationId: scope.conversationId || undefined,
      shared: scope.shared || undefined,
    }),
    [scope.agentId, scope.conversationId, scope.shared],
  );

  return (
    <div className={styles.page}>
      <MemoryScopeBrowser
        agentId={scope.agentId}
        conversationId={scope.conversationId}
        shared={scope.shared}
        onChange={handleScopeChange}
      />

      <nav className={views.tabBar} aria-label="Record views">
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={hrefFor(tab.id)}
            className={active === tab.id ? `${views.tabButton} ${views.tabButtonActive}` : views.tabButton}
            aria-current={active === tab.id ? 'page' : undefined}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {active === 'facts' && (
        <FactsTab key={`facts-${scopeKey}`} scope={scopeProp} onFilterScope={handleScopeChange} />
      )}
      {active === 'transcript' && (
        <TurnsTab key={`transcript-${scopeKey}`} scope={scopeProp} />
      )}
      {active === 'events' && (
        <EventsTab key={`events-${scopeKey}`} scope={scopeProp} onFilterScope={handleScopeChange} />
      )}
      {active === 'decay' && (
        <DecayTab key={`decay-${scopeKey}`} scope={scopeProp} onFilterScope={handleScopeChange} />
      )}
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
