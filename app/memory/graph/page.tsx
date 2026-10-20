'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import {
  getMemoryEntity,
  getMemoryGraph,
  MemoryGraph,
  MemoryGraphNode,
  MemoryRecord,
  MemoryScopeParams,
} from '@/lib/api';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import MemoryGraphCanvas, { GraphLegend, GRAPH_MAX_EDGES, GRAPH_MAX_NODES } from '@/components/memory/MemoryGraphCanvas';
import MemoryRecordDetail from '@/components/memory/MemoryRecordDetail';
import MemoryForgetDialog from '@/components/memory/MemoryForgetDialog';
import MemoryRecordTable, { MemorySort } from '@/components/memory/MemoryRecordTable';
import MemoryScopeBar from '@/components/memory/MemoryScopeBar';
import MemoryStatePanel from '@/components/memory/MemoryStatePanel';
import { formatWeight, memoryErrorMessage } from '@/components/memory/memoryFormat';
import styles from '@/components/memory/Memory.module.css';
import views from '../MemoryViews.module.css';

interface EntityDetail {
  entity_name: string;
  records: MemoryRecord[];
  clustering_coefficient: number;
  neighbors: string[];
  degree: number;
}

interface Loaded {
  entity: EntityDetail | null;
  entityError: string | null;
  graph: MemoryGraph | null;
  graphError: string | null;
}

type Settled<T> = { ok: true; value: T } | { ok: false; reason: unknown };

/** One settled outcome, so drawing the neighbourhood can survive while the
 *  entity endpoint is down and the other way round. */
async function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, value: await promise };
  } catch (reason) {
    return { ok: false, reason };
  }
}

const EMPTY: Loaded = {
  entity: null,
  entityError: null,
  graph: null,
  graphError: null,
};

/**
 * The entity graph, drawn. Recall walks this graph, so the useful rendering
 * is the one that shows relationships the way recall takes them: nodes with
 * links, sized by how much was remembered about them, highlighted by
 * neighbourhood. The entity view (?entity=) is the same drawing centred on
 * one node — a mind map of what that entity connects to — with its facts
 * under it.
 */
function GraphView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const entityParam = searchParams.get('entity');
  /* Scope rides the same URL params the records page uses, so a link between
     the two pages never changes what store is on screen. */
  const agentParam = searchParams.get('agent')?.trim() ?? '';
  const conversationParam = searchParams.get('conversation')?.trim() ?? '';

  const [loaded, setLoaded] = useState<Loaded>(EMPTY);
  const [loadFailed, setLoadFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const [sort, setSort] = useState<MemorySort>({ key: 'turn', dir: 'desc' });
  const [selectedRecord, setSelectedRecord] = useState<MemoryRecord | null>(null);
  const [forgetting, setForgetting] = useState<MemoryRecord | null>(null);
  /* The drawing caps itself and is pointer-first; the list is every entity
     in scope, readable on a phone and reachable by keyboard — the one
     rendering of the graph that does not assume a finger. */
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const scope: MemoryScopeParams = useMemo(
    () => ({
      agentId: agentParam || undefined,
      conversationId: conversationParam || undefined,
    }),
    [agentParam, conversationParam],
  );

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

  /* Entity links keep the scope on the way through. */
  const entityHref = useCallback(
    (entity: string) => {
      const params = new URLSearchParams({ entity });
      if (agentParam) params.set('agent', agentParam);
      if (conversationParam) params.set('conversation', conversationParam);
      return `/memory/graph?${params.toString()}`;
    },
    [agentParam, conversationParam],
  );
  const graphHref = useCallback(() => {
    const params = new URLSearchParams();
    if (agentParam) params.set('agent', agentParam);
    if (conversationParam) params.set('conversation', conversationParam);
    const qs = params.toString();
    return qs ? `/memory/graph?${qs}` : '/memory/graph';
  }, [agentParam, conversationParam]);

  const load = useCallback(async () => {
    setLoading(true);
    const [graph, entity] = await Promise.all([
      settle(getMemoryGraph(scope)),
      settle(entityParam ? getMemoryEntity(entityParam, scope) : Promise.resolve(null)),
    ]);
    setLoaded({
      entity: entity.ok ? entity.value : null,
      entityError: entity.ok || !entityParam ? null : memoryErrorMessage(entity.reason),
      graph: graph.ok ? graph.value : null,
      graphError: graph.ok ? null : memoryErrorMessage(graph.reason),
    });
    setLoadFailed(!graph.ok && (!entity.ok || !entityParam));
    setLoading(false);
  }, [entityParam, scope]);

  useEffect(() => {
    load();
  }, [load]);

  /* Re-focus without refetching: ?entity= only changes what is drawn. The
     selection is tied to the drawing, so a param change resets it — done
     during render against the previous param, the pattern React recommends
     over an effect for "state that belongs to its input". */
  const [prevEntityParam, setPrevEntityParam] = useState(entityParam);
  if (prevEntityParam !== entityParam) {
    setPrevEntityParam(entityParam);
    setSelectedUrl(null);
    setSelectedRecord(null);
  }

  /* A node picked on the canvas resolves through the graph data itself —
     no second request for a node the response already carries. */
  const selectedNode = useMemo<MemoryGraphNode | null>(() => {
    const id = selectedUrl;
    if (!id || !loaded.graph) return null;
    return loaded.graph.nodes.find((node) => node.id === id) ?? null;
  }, [selectedUrl, loaded.graph]);

  const noop = useCallback(() => {}, []);

  /* List view: every entity in scope, most stored facts first, ties broken
     alphabetically so the order is stable across reloads. */
  const listNodes = useMemo(() => {
    if (!loaded.graph) return [];
    return [...loaded.graph.nodes].sort(
      (a, b) => b.record_count - a.record_count || a.id.localeCompare(b.id),
    );
  }, [loaded.graph]);

  if (loading && !loaded.graph && !loaded.entity) {
    return (
      <div className={styles.page}>
        <SkeletonLoader variant="text" count={8} />
      </div>
    );
  }

  if (loadFailed) {
    return (
      <div className={styles.page}>
        <header className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>Graph</h1>
          </div>
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={load}
          >
            Refresh
          </Button>
        </header>
        <MemoryStatePanel
          tone="error"
          title="Graph unavailable"
          body={loaded.graphError ?? loaded.entityError ?? 'The memory service did not answer.'}
        />
      </div>
    );
  }

  /* --- One entity: its neighbourhood, drawn, then its facts --- */
  if (entityParam) {
    const entity = loaded.entity;
    return (
      <div className={styles.page}>
        <header className={styles.pageHead}>
          <div>
            <p className={styles.kicker}>
              <Link href={graphHref()}>Graph</Link> / {entity?.entity_name ?? entityParam}
            </p>
            <h1 className={styles.pageTitle}>{entity?.entity_name ?? entityParam}</h1>
          </div>
          <Button
            variant="secondary"
            icon={<RefreshCw size={14} aria-hidden="true" />}
            onClick={load}
          >
            Refresh
          </Button>
        </header>

        <MemoryScopeBar
          agentId={agentParam}
          conversationId={conversationParam}
          onChange={handleScopeChange}
        />

        {!entity ? (
          <MemoryStatePanel
            title={loaded.entityError ? 'Entity unavailable' : 'Entity not found'}
            body={loaded.entityError ?? 'No node under that name.'}
          />
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
            </Card>

            {loaded.graph && (
              <Card>
                <h2 className={styles.sectionTitle}>Neighbourhood</h2>
                <div className={views.graphCanvasWrap}>
                  <MemoryGraphCanvas graph={loaded.graph} focus={entity.entity_name} />
                </div>
                <GraphLegend />
              </Card>
            )}

            <Card>
              <h2 className={styles.sectionTitle}>Records</h2>
              <p className={styles.recordsHint}>The facts stored under this entity.</p>
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
                onSelect={setSelectedRecord}
              />
            </Card>
          </>
        )}

        <MemoryRecordDetail
          record={selectedRecord}
          open={selectedRecord !== null}
          onClose={() => setSelectedRecord(null)}
          onForget={setForgetting}
          scope={scope}
        />

        <MemoryForgetDialog
          record={forgetting}
          open={forgetting !== null}
          onClose={() => setForgetting(null)}
          onForgotten={() => {
            setSelectedRecord(null);
            setForgetting(null);
            load();
          }}
          scope={scope}
        />
      </div>
    );
  }

  /* --- The whole graph --- */
  const graph = loaded.graph;

  return (
    <div className={styles.page}>
      <header className={styles.pageHead}>
        <div>
          <h1 className={styles.pageTitle}>Graph</h1>
        </div>
        <Button
          variant="secondary"
          icon={<RefreshCw size={14} aria-hidden="true" />}
          onClick={load}
        >
          Refresh
        </Button>
      </header>

      <MemoryScopeBar
        agentId={agentParam}
        conversationId={conversationParam}
        onChange={handleScopeChange}
      />

      {!graph || graph.nodes.length === 0 || loaded.graphError ? (
        <MemoryStatePanel
          title={loaded.graphError ? 'Graph unavailable' : 'No graph yet'}
          body={
            loaded.graphError ?? 'Entities appear as facts are stored.'
          }
        />
      ) : (
        <>
          <Card>
            <div className={styles.recordsHead}>
              <h2 className={styles.sectionTitle}>The graph</h2>
              <div className={views.viewToggle} role="group" aria-label="How to show the graph">
                <Button
                  variant={viewMode === 'graph' ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={viewMode === 'graph'}
                  onClick={() => setViewMode('graph')}
                >
                  Graph
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  aria-pressed={viewMode === 'list'}
                  onClick={() => setViewMode('list')}
                >
                  List
                </Button>
              </div>
            </div>
            {viewMode === 'list' ? (
              <>
                <p className={styles.recordsHint}>
                  All {graph.nodes.length} entities in this scope, most stored facts first.
                </p>
                <div className={`${styles.tableScroll} ${styles.stickyFirst}`}>
                  <table className={styles.table}>
                    <caption className={styles.tableCaption}>
                      The same graph as rows. Names link to the entity view, which draws the full
                      neighbourhood and lists its facts.
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Entity</th>
                        <th scope="col">Records</th>
                        <th scope="col">Avg weight</th>
                        <th scope="col">Linked</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listNodes.map((node) => (
                        <tr key={node.id}>
                          <td>
                            <Link className={styles.entityButton} href={entityHref(node.id)}>
                              {node.id}
                            </Link>
                          </td>
                          <td>{node.record_count}</td>
                          <td>{formatWeight(node.avg_weight)}</td>
                          <td>{node.related_entities.length}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <>
                <p className={styles.recordsHint}>
                  {graph.nodes.length > GRAPH_MAX_NODES
                    ? `Drawing the ${GRAPH_MAX_NODES} most-connected of ${graph.nodes.length} entities`
                    : `${graph.nodes.length} entities`}
                  {graph.edges.length > GRAPH_MAX_EDGES
                    ? ` and the first ${GRAPH_MAX_EDGES} of ${graph.edges.length} links. Open an entity for its full neighbourhood.`
                    : ' and every link between them.'}
                </p>
                <div className={views.graphCanvasWrap}>
                  <MemoryGraphCanvas
                    graph={graph}
                    selectedId={selectedUrl}
                    onSelect={setSelectedUrl}
                  />
                </div>
                <GraphLegend />
              </>
            )}
          </Card>

          <Card>
            {selectedNode ? (
              <>
                <div className={styles.recordsHead}>
                  <h2 className={styles.sectionTitle}>{selectedNode.id}</h2>
                  <Link
                    className={styles.entityButton}
                    href={entityHref(selectedNode.id)}
                  >
                    Inspect entity →
                  </Link>
                </div>
                <p className={styles.recordsHint}>
                  Facts stored under this entity, the mean strength of them, and how closed the
                  neighbourhood is.
                </p>
                <div className={styles.statGrid}>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Records</div>
                    <div className={styles.statValue}>{selectedNode.record_count}</div>
                    <div className={styles.statHint}>facts under this entity</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Avg weight</div>
                    <div className={styles.statValue}>{formatWeight(selectedNode.avg_weight)}</div>
                    <div className={styles.statHint}>mean strength of its facts</div>
                  </div>
                  <div className={styles.stat}>
                    <div className={styles.statLabel}>Clustering</div>
                    <div className={styles.statValue}>
                      {selectedNode.clustering_coefficient.toFixed(3)}
                    </div>
                    <div className={styles.statHint}>how interlinked the neighbours are</div>
                  </div>
                </div>
                <div className={styles.badgeRow}>
                  <span className={styles.kicker}>Linked to</span>
                  {selectedNode.related_entities.slice(0, 12).map((related) => (
                    <Link
                      key={related}
                      className={styles.relatedTag}
                      href={entityHref(related)}
                    >
                      {related}
                    </Link>
                  ))}
                  {selectedNode.related_entities.length > 12 && (
                    <span className={styles.relatedTag}>
                      +{selectedNode.related_entities.length - 12}
                    </span>
                  )}
                </div>
              </>
            ) : (
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
            )}
          </Card>
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
