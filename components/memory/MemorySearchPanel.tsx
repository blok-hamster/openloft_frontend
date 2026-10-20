import { useCallback, useState } from 'react';
import { Search } from 'lucide-react';
import type { MemoryRecord, MemoryScopeParams, MemorySearchHit } from '@/lib/api';
import { searchMemoryRecords } from '@/lib/api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import MemoryTypeBadge from './MemoryTypeBadge';
import { formatScore, hopsLabel, memoryErrorMessage } from './memoryFormat';
import styles from './Memory.module.css';

const TOP_K = [5, 10, 20];

interface MemorySearchPanelProps {
  onSelect: (record: MemoryRecord) => void;
  /** Sub-scope to search within; absent means the tenant's default store. */
  scope?: MemoryScopeParams;
}

/**
 * Semantic search over Hot RAM.
 *
 * Deliberately not the recall endpoint: retrieval buffers a long-term
 * potentiation reinforcement for every record it surfaces, so a search box
 * wired to it would change what the agent remembers just by being used. This
 * embeds the query and searches the store directly, which is a read.
 */
export default function MemorySearchPanel({ onSelect, scope }: MemorySearchPanelProps) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(10);
  const [hits, setHits] = useState<MemorySearchHit[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = query.trim();
      if (trimmed === '') return;

      setLoading(true);
      setError(null);
      try {
        const { results } = await searchMemoryRecords(trimmed, topK, scope);
        setHits(results);
      } catch (err) {
        setHits(null);
        setError(memoryErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [query, topK, scope],
  );

  return (
    <Card>
      <div className={styles.subPanelTitle}>Semantic search</div>
      <p className={styles.caption}>
        Vector search over stored facts. It is a read — the query is embedded and matched against
        Hot RAM directly, so searching never reinforces what it finds.
      </p>

      <form onSubmit={runSearch} className={styles.searchForm}>
        <Input
          label="Query"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What should the agent have remembered?"
          icon={<Search size={14} />}
          autoComplete="off"
        />
        <Select
          label="Results"
          options={TOP_K.map((n) => ({ value: String(n), label: String(n) }))}
          value={String(topK)}
          onChange={(e) => setTopK(Number(e.target.value))}
        />
        <Button
          type="submit"
          variant="primary"
          icon={<Search size={14} aria-hidden="true" />}
          loading={loading}
          disabled={query.trim() === ''}
        >
          Search
        </Button>
      </form>

      {error && (
        <div className={`${styles.statePanel} ${styles.stateError} ${styles.spacedBlock}`}>
          <div className={styles.stateTitle}>Search failed</div>
          <p className={styles.stateBody}>{error}</p>
        </div>
      )}

      {hits !== null && !error && (
        <>
          <p className={`${styles.caption} ${styles.spacedBlock}`}>
            {hits.length === 0
              ? 'No stored fact matched that query.'
              : `${hits.length} result${hits.length === 1 ? '' : 's'}.`}{' '}
            Score is the similarity of the match. Hop distance is how the record was reached: 0 is
            a direct vector hit, and each hop above that is one edge of the entity graph.
          </p>
          <div className={styles.searchResults}>
            {hits.map((hit) => (
              <button
                key={hit.record.id}
                type="button"
                className={styles.searchHit}
                onClick={() => onSelect(hit.record)}
              >
                <span className={styles.searchHitHead}>
                  <MemoryTypeBadge type={hit.record.memory_type} />
                  <span className={styles.searchHitEntity}>{hit.record.entity_name}</span>
                  <span className={styles.readout} title="Similarity score">
                    <span className={styles.readoutKey}>score</span>
                    {formatScore(hit.score)}
                  </span>
                  <span className={styles.readout} title={hopsLabel(hit.hops)}>
                    <span className={styles.readoutKey}>hops</span>
                    {hit.hops}
                  </span>
                </span>
                <span className={styles.searchHitFact}>{hit.record.fact_content}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
