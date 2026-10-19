'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { getMemoryRecords, MemoryRecord } from '@/lib/api';
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

/**
 * Every stored fact, browsable. The service returns records newest creation
 * turn first and takes no filter beyond the page window, so the search box
 * and the sort controls both operate on what has been fetched — the search
 * one server-side, the sort client-side.
 */
export default function RecordsPage() {
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

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const page = await getMemoryRecords({ limit, offset });
      setRecords(page.results);
      setRecordsError(null);
      if (typeof page.total === 'number') setTotalRecords(page.total);
    } catch (err) {
      setRecords([]);
      setRecordsError(memoryErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [limit, offset]);

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

  const handleSelect = useCallback((record: MemoryRecord) => setSelected(record), []);
  const handleCloseDetail = useCallback(() => setSelected(null), []);
  const handleForget = useCallback((record: MemoryRecord) => setForgetting(record), []);
  const handleCloseForget = useCallback(() => setForgetting(null), []);

  const handleForgotten = useCallback(() => {
    setSelected(null);
    setForgetting(null);
    loadRecords();
  }, [loadRecords]);

  /* A superseded fact is kept so the invalidation is auditable; hiding them
     is a view of this page, because the service takes no filter parameter. */
  const visibleRecords = useMemo(
    () => (showSuperseded ? records : records.filter((record) => record.is_active)),
    [records, showSuperseded],
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Records</h1>
          <p className={styles.pageSub}>
            Every fact the memory holds, with its weight, the turn it was formed on, and the window
            it is valid in. Forgetting is temporal invalidation: the entry stays in the archive so
            the change stays auditable.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={loadRecords}
        >
          Refresh
        </Button>
      </header>

      <MemorySearchPanel onSelect={handleSelect} />

      <Card>
        <div className={styles.recordsHead}>
          <h2 className={styles.sectionTitle}>Stored facts</h2>
          <Toggle
            checked={showSuperseded}
            onChange={setShowSuperseded}
            label="Show superseded facts"
            ariaLabel="Show superseded facts"
          />
        </div>
        <p className={styles.recordsHint}>
          Superseded facts stay in the list because a temporal invalidation has to stay auditable.
          Hiding them filters this page — the service returns every record and takes no filter
          parameter.
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
          />
        )}
      </Card>

      <MemoryRecordDetail
        record={selected}
        open={selected !== null}
        onClose={handleCloseDetail}
        onForget={handleForget}
      />

      <MemoryForgetDialog
        record={forgetting}
        open={forgetting !== null}
        onClose={handleCloseForget}
        onForgotten={handleForgotten}
      />
    </div>
  );
}
