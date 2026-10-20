'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  getMemoryDecayCurves,
  getMemoryRecords,
  MemoryDecayCurve,
  MemoryDecayProjection,
  MemoryRecord,
  MemoryScopeParams,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Toggle from '@/components/ui/Toggle';
import MemorySearchPanel from '@/components/memory/MemorySearchPanel';
import MemoryRecordTable, { MemorySort } from '@/components/memory/MemoryRecordTable';
import MemoryRecordDetail from '@/components/memory/MemoryRecordDetail';
import MemoryForgetDialog from '@/components/memory/MemoryForgetDialog';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import { memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';

const DETAIL_HORIZON = 50;

interface FactsTabProps {
  /** Sub-scope to browse; absent means the tenant's default store. The page
   *  remounts this tab on a scope change, so no cross-scope state survives. */
  scope?: MemoryScopeParams;
}

/**
 * Every stored fact, browsable. The service returns records newest creation
 * turn first and takes no filter beyond the page window, so the search box
 * and the sort controls both operate on what has been fetched — the search
 * one server-side, the sort client-side.
 *
 * The drawer becomes the justification for the tab next door: the selected
 * fact carries its own decay projection, so "what happens to this fact if
 * nothing reinforces it" is answered where the fact is, without guessing
 * which curve on the Decay tab is the one in hand.
 */
export default function FactsTab({ scope }: FactsTabProps) {
  const [records, setRecords] = useState<MemoryRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [sort, setSort] = useState<MemorySort>({ key: 'turn', dir: 'desc' });
  const [showSuperseded, setShowSuperseded] = useState(true);

  const [selected, setSelected] = useState<MemoryRecord | null>(null);
  const [forgetting, setForgetting] = useState<MemoryRecord | null>(null);

  /* Decay for the drawer, fetched once on first use and then reused — the
     projection is a snapshot, not a live stream. A failure is silent on
     purpose: the drawer simply renders without the curve, and the Decay tab
     is where endpoint errors surface loudly. */
  const [projection, setProjection] = useState<MemoryDecayProjection | null>(null);
  const projectionRequested = useRef(false);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const page = await getMemoryRecords({ limit, offset, ...scope });
      setRecords(page.results);
      setRecordsError(null);
      if (typeof page.total === 'number') setTotalRecords(page.total);
    } catch (err) {
      setRecords([]);
      setRecordsError(memoryErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [limit, offset, scope]);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  const handleLimitChange = useCallback((next: number) => {
    setLimit(next);
    setOffset(0);
  }, []);

  const handleOffsetChange = useCallback((next: number) => {
    setOffset(next);
  }, []);

  const handleSelect = useCallback(
    (record: MemoryRecord) => {
      setSelected(record);
      if (projectionRequested.current) return;
      projectionRequested.current = true;
      getMemoryDecayCurves(DETAIL_HORIZON, scope)
        .then(setProjection)
        .catch(() => {
          projectionRequested.current = false;
        });
    },
    [scope],
  );

  const handleCloseDetail = useCallback(() => setSelected(null), []);
  const handleForget = useCallback((record: MemoryRecord) => setForgetting(record), []);
  const handleCloseForget = useCallback(() => setForgetting(null), []);

  const handleForgotten = useCallback(() => {
    setSelected(null);
    setForgetting(null);
    setProjection(null);
    projectionRequested.current = false;
    loadRecords();
  }, [loadRecords]);

  /* A superseded fact is kept so the invalidation is auditable; hiding them
     is a view of this page, because the service takes no filter parameter. */
  const visibleRecords = useMemo(
    () => (showSuperseded ? records : records.filter((record) => record.is_active)),
    [records, showSuperseded],
  );

  /* The toggle filters after the page window is fetched, so hiding superseded
     facts can strand the reader on a window that is entirely superseded —
     which previously rendered as an empty table and read as "no data".
     Step back one page when that happens; stepping further is unknowable
     client-side, and the table's note says so. */
  useEffect(() => {
    if (loading || showSuperseded) return;
    if (records.length > 0 && visibleRecords.length === 0 && offset > 0) {
      setOffset(Math.max(0, offset - limit));
    }
  }, [loading, showSuperseded, records, visibleRecords, offset, limit]);

  const allSupersededNote =
    !loading && !showSuperseded && records.length > 0 && visibleRecords.length === 0
      ? `All ${records.length} records in this window are superseded. "Show superseded" restores them; the pages before this one are not loaded, so ask for a lower page with the button instead of trusting the page count.`
      : null;

  const selectedDecay = selected
    ? decayFor(selected, projection, DETAIL_HORIZON)
    : null;

  return (
    <>
      <MemorySearchPanel onSelect={handleSelect} scope={scope} />

      <Card>
        <div className={styles.recordsHead}>
          <h2 className={styles.sectionTitle}>Stored facts</h2>
          <div className={styles.toolbarGroup}>
            <Toggle
              checked={showSuperseded}
              onChange={setShowSuperseded}
              label="Show superseded facts"
              ariaLabel="Show superseded facts"
            />
            <Button
              variant="secondary"
              icon={<RefreshCw size={14} aria-hidden="true" />}
              onClick={loadRecords}
            >
              Refresh
            </Button>
          </div>
        </div>
        <p className={styles.recordsHint}>
          Superseded facts stay in the list because a temporal invalidation has to stay auditable.
          Hiding them filters this page — the service returns every record and takes no filter
          parameter. Open a fact to see where it came from and where its weight decays to.
        </p>

        {recordsError ? (
          <MemoryStatePanel tone="error" title="Records unavailable" body={recordsError}>
            <p className={styles.recordsHint}>
              Every fact the agent has retained is stored server-side; the console is only unable to
              reach it right now.
            </p>
          </MemoryStatePanel>
        ) : (
          <MemoryRecordTable
            records={visibleRecords}
            total={totalRecords ?? 0}
            limit={limit}
            offset={offset}
            loading={loading}
            sort={sort}
            onSortChange={setSort}
            onLimitChange={handleLimitChange}
            onOffsetChange={handleOffsetChange}
            onSelect={handleSelect}
            windowNote={allSupersededNote}
          />
        )}
      </Card>

      <MemoryRecordDetail
        record={selected}
        open={selected !== null}
        onClose={handleCloseDetail}
        onForget={handleForget}
        decay={selectedDecay}
        scope={scope}
      />

      <MemoryForgetDialog
        record={forgetting}
        open={forgetting !== null}
        onClose={handleCloseForget}
        onForgotten={handleForgotten}
        scope={scope}
      />
    </>
  );
}

/** The selected record's curve, or null when the projection has not (yet)
 *  answered — the drawer never blocks on a second endpoint. */
function decayFor(
  record: MemoryRecord,
  projection: MemoryDecayProjection | null,
  horizon: number,
): { curve: MemoryDecayCurve; threshold: number; turnsAhead: number } | null {
  const curve = projection?.curves.find((candidate) => candidate.record_id === record.id);
  if (!curve || !projection) return null;
  return { curve, threshold: projection.prune_threshold, turnsAhead: horizon };
}
