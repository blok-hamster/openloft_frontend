'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import {
  getMemoryEntity,
  getMemoryGraph,
  MemoryGraph,
  MemoryRecord,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryRecordDetail from '@/components/memory/MemoryRecordDetail';
import MemoryForgetDialog from '@/components/memory/MemoryForgetDialog';
import MemoryRecordTable, { MemorySort } from '@/components/memory/MemoryRecordTable';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import { formatWeight, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';

/** Past this the edges table is a scroll, not a page. */
const MAX_EDGE_ROWS = 200;

interface EntityDetail {
  entity_name: string;
  records: MemoryRecord[];
  clustering_coefficient: number;
  neighbors: string[];
  degree: number;
}

function GraphView() {
  const searchParams = useSearchParams();
  const entityParam = searchParams.get('entity');

  const [graph, setGraph] = useState<MemoryGraph | null>(null);
  const [entity, setEntity] = useState<EntityDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [sort, setSort] = useState<MemorySort>({ key: 'turn', dir: 'desc' });
  const [selected, setSelected] = useState<MemoryRecord | null>(null);
  const [forgetting, setForgetting] = useState<MemoryRecord | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (entityParam) {
        setEntity(await getMemoryEntity(entityParam));
        setError(null);
      } else {
        setGraph(await getMemoryGraph());
        setError(null);
      }
    } catch (err) {
      setEntity(null);
      setGraph(null);
      setError(memoryErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [entityParam]);

  useEffect(() => {
    load();
  }, [load]);

  const edges = useMemo(() => graph?.edges ?? [], [graph]);
  const visibleEdges = edges.slice(0, MAX_EDGE_ROWS);

  const noop = useCallback(() => {}, []);

  if (loading && !graph && !entity) {
    return (
      <div className={styles.page}>
        <SkeletonLoader variant="text" count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <MemoryStatePanel tone="error" title="Graph unavailable" body={error} />
      </div>
    );
  }

  /* --- Entity detail: one node, its neighbours, and its records --- */
  if (entityParam) {
    return (
      <div className={styles.page}>
        <header className={styles.pageHead}>
          <div>
            <p className={styles.kicker}>
              <Link href="/memory/graph">All entities</Link> / {entity?.entity_name ?? entityParam}
            </p>
            <h1 className={styles.pageTitle}>{entity?.entity_name ?? entityParam}</h1>
            <p className={styles.pageSub}>
              One node of the entity graph: the facts stored under it, and the entities it is
              linked to. Related entities is how a recall reaches records that share no words with
              the query.
            </p>
          </div>
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={load}
          >
            Refresh
          </Button>
        </header>

        {!entity ? (
          <MemoryStatePanel title="Entity not found" body="No node under that name." />
        ) : (
          <>
            <Card>
              <div className={styles.statGrid}>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Records</div>
                  <div className={styles.statValue}>{entity.records.length}</div>
                  <div className={styles.statHint}>facts under this entity</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Degree</div>
                  <div className={styles.statValue}>{entity.degree}</div>
                  <div className={styles.statHint}>linked entities</div>
                </div>
                <div className={styles.stat}>
                  <div className={styles.statLabel}>Clustering</div>
                  <div className={styles.statValue}>
                    {entity.clustering_coefficient.toFixed(3)}
                  </div>
                  <div className={styles.statHint}>how closed the neighbourhood is</div>
                </div>
              </div>
              <div className={styles.badgeRow}>
                <span className={styles.kicker}>Related</span>
                {entity.neighbors.length === 0 && (
                  <span className={styles.caption}>No links to other entities.</span>
                )}
                {entity.neighbors.map((neighbor) => (
                  <Link
                    key={neighbor}
                    className={styles.relatedTag}
                    href={`/memory/graph?entity=${encodeURIComponent(neighbor)}`}
                  >
                    {neighbor}
                  </Link>
                ))}
              </div>
            </Card>

            <Card>
              <h2 className={styles.sectionTitle}>Records</h2>
              <MemoryRecordTable
                records={entity.records}
                total={entity.records.length}
                limit={Math.max(1, entity.records.length)}
                offset={0}
                loading={loading}
                sort={sort}
                onSortChange={setSort}
                onLimitChange={noop}
                onOffsetChange={noop}
                onSelect={setSelected}
              />
            </Card>
          </>
        )}

        <MemoryRecordDetail
          record={selected}
          open={selected !== null}
          onClose={() => setSelected(null)}
          onForget={setForgetting}
        />

        <MemoryForgetDialog
          record={forgetting}
          open={forgetting !== null}
          onClose={() => setForgetting(null)}
          onForgotten={() => {
            setSelected(null);
            setForgetting(null);
            load();
          }}
        />
      </div>
    );
  }

  /* --- Whole graph: nodes with edges listed beside them --- */
  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Graph</h1>
          <p className={styles.pageSub}>
            The entity graph the engine builds as it remembers: every entity it has stored facts
            about, and the links between them. Recall walks these edges, so a fact can be surfaced
            by association rather than by wording alone.
          </p>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={load}
        >
          Refresh
        </Button>
      </header>

      {!graph ? (
        <MemoryStatePanel title="No graph yet" body="Entities appear as facts are stored." />
      ) : (
        <>
          <Card>
            <div className={styles.statGrid}>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Entities</div>
                <div className={styles.statValue}>{graph.nodes.length}</div>
                <div className={styles.statHint}>nodes in the graph</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Edges</div>
                <div className={styles.statValue}>{graph.edges.length}</div>
                <div className={styles.statHint}>links between them</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statLabel}>Densest node</div>
                <div className={styles.statValue}>
                  {graph.nodes.reduce(
                    (best, node) => (node.record_count > (best?.record_count ?? -1) ? node : best),
                    graph.nodes[0],
                  )?.id ?? '—'}
                </div>
                <div className={styles.statHint}>most facts stored under it</div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className={styles.sectionTitle}>Entities</h2>
            <p className={styles.recordsHint}>
              Select an entity to see its facts and neighbours. Average weight is the mean strength
              of its records; clustering is how interlinked its neighbourhood is.
            </p>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <caption className={styles.tableCaption}>
                  {graph.nodes.length} entities, most facts first.
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Entity</th>
                    <th scope="col">Records</th>
                    <th scope="col">Avg weight</th>
                    <th scope="col">Clustering</th>
                    <th scope="col">Linked to</th>
                  </tr>
                </thead>
                <tbody>
                  {graph.nodes.map((node) => (
                    <tr key={node.id}>
                      <td>
                        <Link
                          className={styles.entityButton}
                          href={`/memory/graph?entity=${encodeURIComponent(node.id)}`}
                        >
                          {node.id}
                        </Link>
                      </td>
                      <td className={styles.cellMono}>{node.record_count}</td>
                      <td className={styles.cellMono}>{formatWeight(node.avg_weight)}</td>
                      <td className={styles.cellMono}>
                        {node.clustering_coefficient.toFixed(3)}
                      </td>
                      <td>
                        <span className={styles.relatedList}>
                          {node.related_entities.slice(0, 6).map((related) => (
                            <Link
                              key={related}
                              className={styles.relatedTag}
                              href={`/memory/graph?entity=${encodeURIComponent(related)}`}
                            >
                              {related}
                            </Link>
                          ))}
                          {node.related_entities.length > 6 && (
                            <span className={styles.relatedTag}>
                              +{node.related_entities.length - 6}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {graph.nodes.length === 0 && (
                    <tr>
                      <td colSpan={5} className={styles.emptyCell}>
                        No entities stored yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {edges.length > 0 && (
            <Card>
              <h2 className={styles.sectionTitle}>Edges</h2>
              <p className={styles.recordsHint}>
                {edges.length > MAX_EDGE_ROWS
                  ? `Showing the first ${MAX_EDGE_ROWS} of ${edges.length} edges.`
                  : 'Every link in the graph, as pairs.'}
              </p>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <caption className={styles.tableCaption}>
                    {visibleEdges.length} edges, source → target.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">From</th>
                      <th scope="col">To</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleEdges.map((edge, index) => (
                      <tr key={`${edge.source}-${edge.target}-${index}`}>
                        <td>
                          <Link
                            className={styles.entityButton}
                            href={`/memory/graph?entity=${encodeURIComponent(edge.source)}`}
                          >
                            {edge.source}
                          </Link>
                        </td>
                        <td>
                          <Link
                            className={styles.entityButton}
                            href={`/memory/graph?entity=${encodeURIComponent(edge.target)}`}
                          >
                            {edge.target}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <p className={styles.footNote}>
        Built by the engine as facts are stored — this page is a read of its current state, and
        nothing here changes it.
      </p>
    </div>
  );
}

export default function GraphPage() {
  return (
    <Suspense
      fallback={
        <div className={styles.page}>
          <SkeletonLoader variant="text" count={8} />
        </div>
      }
    >
      <GraphView />
    </Suspense>
  );
}
