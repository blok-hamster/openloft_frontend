'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { MemoryGraph, MemoryGraphNode } from '@/lib/api';
import views from '@/app/memory/MemoryViews.module.css';

/**
 * The entity graph, drawn.
 *
 * Every other observability surface in this dashboard is tables because the
 * server returns tables; the graph was rendered as tables too, which put a
 * relation in two columns and asked the reader to assemble it in their head.
 * So: a small force-directed layout — repulsion between nodes, springs on
 * edges, a weak pull to the middle — run in the browser until it settles and
 * rendered in SVG. Dot area encodes stored facts, dot colour encodes the
 * dominant memory tier, and dragging is supported because every auto-layout
 * untangles differently than the reader expects. No dependency: the layout
 * is about a page of arithmetic and stays inspectable.
 */

/* Layout and viewport constants. The viewBox is fixed and the SVG scales,
   so the label text stays crisp and dragging is one scale factor. */
const VIEW = { width: 860, height: 480 };
export const GRAPH_MAX_NODES = 140;
export const GRAPH_MAX_EDGES = 420;
const CENTER_PULL = 0.012;
const REPULSION = 2200;
const SPRING_LENGTH = 110;
const SPRING_PULL = 0.03;
const DAMPING = 0.85;
const MAX_TICKS = 340;

/* Canvas transform. k=1 is the fitted view; pan moves the drawing so the
   zoomed content stays under the box (corner-anchored). At k=1 the
   transform is always the origin, which is what makes "fit" a reset. */
const ZOOM_MIN = 1;
const ZOOM_MAX = 3.5;

type CanvasTransform = { x: number; y: number; k: number };

const panBounds = (k: number) => ({
  x: VIEW.width * (1 - k),
  y: VIEW.height * (1 - k),
});

const clampPan = (t: CanvasTransform): CanvasTransform => {
  const bounds = panBounds(t.k);
  return {
    k: t.k,
    x: Math.max(bounds.x, Math.min(0, t.x)),
    y: Math.max(bounds.y, Math.min(0, t.y)),
  };
};

type Dominant = 'core' | 'active' | 'ephemeral' | 'unknown';

const DOMINANT_LABEL: Record<Dominant, string> = {
  core: 'Core Anchor',
  active: 'Active Context',
  ephemeral: 'Ephemeral',
  unknown: 'Other',
};

const DOMINANT_CLASS: Record<Dominant, string> = {
  core: views.graphNodeCore,
  active: views.graphNodeActive,
  ephemeral: views.graphNodeEphemeral,
  unknown: views.graphNodeUnknown,
};

/** The tier that dominates a node's facts decides its colour. */
function dominantOf(node: MemoryGraphNode): Dominant {
  let best: Dominant = 'unknown';
  let bestCount = -1;
  for (const [type, count] of Object.entries(node.types)) {
    if (count <= bestCount) continue;
    bestCount = count;
    if (type === 'CoreAnchor') best = 'core';
    else if (type === 'ActiveContext') best = 'active';
    else if (type === 'EphemeralState') best = 'ephemeral';
    else best = 'unknown';
  }
  return best;
}

/** Area, not radius, encodes the count — otherwise one dense entity
    flattens the rest of the graph into pebbles. */
function radiusOf(recordCount: number): number {
  return Math.min(30, 8 + Math.sqrt(Math.max(0, recordCount)) * 5);
}

interface Placement {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  recordCount: number;
  dominant: Dominant;
  fixed: boolean;
}

interface MemoryGraphCanvasProps {
  graph: MemoryGraph;
  /** A deep-linked entity: draw just it and its neighbourhood, arranged
      radially around it — a mind map, not a simulation. */
  focus?: string | null;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
}

export default function MemoryGraphCanvas({
  graph,
  focus = null,
  selectedId = null,
  onSelect,
}: MemoryGraphCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const positionsRef = useRef<Placement[]>([]);
  const dragRef = useRef<number | null>(null);
  /* A pointer that moved between down and up was a drag, not a click — the
     select that follows pointer-up must not fire for it. */
  const dragMovedRef = useRef(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [, setRenderTick] = useState(0);
  const rerender = () => setRenderTick((t) => t + 1);

  /* --- Canvas zoom & pan ---
     The drawing lives inside one transform group, so zoom keeps labels
     crisp: the shapes scale in viewBox units instead of rasterising.
     Gesture math (node drag, pinch, pan, wheel) all goes through
     `toView()` — screen → viewBox scale first, then the canvas transform
     inverted — which is what made the first pass's drag wrong at zoom. */
  const transformRef = useRef<CanvasTransform>({ x: 0, y: 0, k: 1 });
  const gestureRef = useRef<
    | null
    | { mode: 'pinch'; lastDist: number; lastMidX: number; lastMidY: number; ids: number[] }
    | { mode: 'pan'; lastX: number; lastY: number }
  >(null);
  /* Every pointer currently on the canvas, in viewBox coordinates — the
     pinch needs both, and it needs them through the same conversion the
     drag uses. */
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());

  /** screen px → viewBox px (the SVG scale), NOT graph space. */
  const toView = (clientX: number, clientY: number): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (VIEW.width / rect.width),
      y: (clientY - rect.top) * (VIEW.height / rect.height),
    };
  };

  const syncTouchAction = (k: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    // Fitted view: vertical page scroll over the canvas must stay possible
    // (that decision survived the first pass). Once zoomed, panning the
    // canvas owns the touch — the page is reachable from the chrome.
    svg.style.touchAction = k > 1 ? 'none' : '';
  };

  /** Scale the transform around a viewBox point and clamp the pan. */
  const zoomAt = (px: number, py: number, factor: number) => {
    const t = transformRef.current;
    const k = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, t.k * factor));
    if (k === t.k) return;
    let x = px - (px - t.x) * (k / t.k);
    let y = py - (py - t.y) * (k / t.k);
    if (k === ZOOM_MIN) {
      x = 0;
      y = 0;
    }
    transformRef.current = clampPan({ x, y, k });
    syncTouchAction(k);
    rerender();
  };

  const resetZoom = () => {
    if (transformRef.current.k === ZOOM_MIN) return;
    transformRef.current = { x: 0, y: 0, k: ZOOM_MIN };
    gestureRef.current = null;
    syncTouchAction(ZOOM_MIN);
    rerender();
  };

  /* Trackpad and touchpad pinch produce wheel events with the ctrl flag set;
     that is the only wheel gesture the canvas zooms on, so plain scrolling
     over the graph stays page scrolling. Non-passive: the browser's own
     ctrl-pinch page zoom must not fire instead. */
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const point = toView(event.clientX, event.clientY);
      event.preventDefault();
      zoomAt(point.x, point.y, Math.exp(-event.deltaY * 0.002));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
    // toView/zoomAt are stable-per-render closures over refs; bind once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- The drawable slice. The service returns the whole graph; past a few
        hundred nodes the simulation is mush more than a chart, so force mode
        keeps the most-connected slice and the page says what was cut. */
  const drawable = useMemo(() => {
    if (focus) {
      const center = graph.nodes.find((node) => node.id === focus);
      if (!center) return null;
      const kept = new Map<string, MemoryGraphNode>([[center.id, center]]);
      for (const related of center.related_entities) {
        const node = graph.nodes.find((candidate) => candidate.id === related);
        if (node) kept.set(node.id, node);
      }
      const edges = graph.edges.filter((edge) => kept.has(edge.source) && kept.has(edge.target));
      return {
        nodes: [...kept.values()],
        edges,
        focus,
        droppedNodes: 0,
        droppedEdges: 0,
      };
    }

    const ranked = [...graph.nodes].sort((a, b) => b.record_count - a.record_count);
    const keptNodes = ranked.slice(0, GRAPH_MAX_NODES);
    const keptIds = new Set(keptNodes.map((node) => node.id));
    const allEdges = graph.edges.filter(
      (edge) => keptIds.has(edge.source) && keptIds.has(edge.target),
    );
    const edges = allEdges.slice(0, GRAPH_MAX_EDGES);
    return {
      nodes: keptNodes,
      edges,
      focus: null as string | null,
      droppedNodes: Math.max(0, graph.nodes.length - keptNodes.length),
      droppedEdges: Math.max(0, allEdges.length - edges.length),
    };
  }, [graph, focus]);

  /* --- Initial placement. Force mode: a ring with deterministic jitter from
        the id hash, so the same graph does not land on the same tangle twice
        and no run needs a random seed. Focus mode: the entity in the centre
        and its neighbours on up to three rings — a mind map. */
  useEffect(() => {
    if (!drawable) {
      positionsRef.current = [];
      rerender();
      return;
    }
    const items: Placement[] = drawable.nodes.map((node) => ({
      id: node.id,
      x: VIEW.width / 2,
      y: VIEW.height / 2,
      vx: 0,
      vy: 0,
      recordCount: node.record_count,
      dominant: dominantOf(node),
      fixed: false,
    }));

    if (drawable.focus) {
      const neighbours = items.filter((place) => place.id !== drawable.focus);
      const rings = 3;
      const perRing = Math.max(4, Math.ceil(neighbours.length / rings));
      neighbours.forEach((place, index) => {
        const ring = Math.floor(index / perRing);
        const onRing = Math.min(perRing, neighbours.length - ring * perRing);
        const positionOnRing = index % perRing;
        const angle =
          ((positionOnRing + (ring % 2) * 0.5) / Math.max(1, onRing)) * Math.PI * 2;
        const radius = (ring + 1) * Math.min(VIEW.width, VIEW.height) * 0.17;
        place.x = VIEW.width / 2 + Math.cos(angle) * radius;
        place.y = VIEW.height / 2 + Math.sin(angle) * radius * 0.62;
        place.fixed = true;
      });
    } else {
      const ringRadius = Math.min(VIEW.width, VIEW.height) * 0.36;
      items.forEach((place, index) => {
        const angle = (index / Math.max(1, items.length)) * Math.PI * 2;
        let jitter = 0;
        for (let i = 0; i < place.id.length; i++) {
          jitter = (jitter * 31 + place.id.charCodeAt(i)) % 97;
        }
        const radius = ringRadius * (0.55 + (jitter % 45) / 100);
        place.x = VIEW.width / 2 + Math.cos(angle) * radius;
        place.y = VIEW.height / 2 + Math.sin(angle) * radius;
      });
    }
    positionsRef.current = items;
    rerender();
  }, [drawable]);

  /* --- The simulation. Two relaxation passes per frame; stops when the
        layout settles or the tick budget runs out. */
  useEffect(() => {
    if (!drawable || drawable.focus) return;
    let ticks = 0;
    let frame = 0;
    const step = () => {
      const items = positionsRef.current;
      const indexById = new Map(items.map((place, index) => [place.id, index]));
      const springs = drawable.edges
        .map((edge) => [indexById.get(edge.source), indexById.get(edge.target)] as const)
        .filter(
          (pair): pair is [number, number] =>
            pair[0] !== undefined && pair[1] !== undefined,
        );

      for (let pass = 0; pass < 2; pass++) {
        for (let a = 0; a < items.length; a++) {
          for (let b = a + 1; b < items.length; b++) {
            const pa = items[a];
            const pb = items[b];
            let dx = pa.x - pb.x;
            let dy = pa.y - pb.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 1) {
              dx = (a % 7) - 3;
              dy = (b % 5) - 2;
              dist = Math.sqrt(dx * dx + dy * dy) || 1;
            }
            const force = REPULSION / (dist * dist);
            if (!pa.fixed) {
              pa.vx += (dx / dist) * force;
              pa.vy += (dy / dist) * force;
            }
            if (!pb.fixed) {
              pb.vx -= (dx / dist) * force;
              pb.vy -= (dy / dist) * force;
            }
          }
        }
        for (const [a, b] of springs) {
          const pa = items[a];
          const pb = items[b];
          const dx = pb.x - pa.x;
          const dy = pb.y - pa.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (dist - SPRING_LENGTH) * SPRING_PULL;
          if (!pa.fixed) {
            pa.vx += (dx / dist) * force;
            pa.vy += (dy / dist) * force;
          }
          if (!pb.fixed) {
            pb.vx -= (dx / dist) * force;
            pb.vy -= (dy / dist) * force;
          }
        }
        let maxMove = 0;
        for (const place of items) {
          place.vx = (place.vx + (VIEW.width / 2 - place.x) * CENTER_PULL) * DAMPING;
          place.vy = (place.vy + (VIEW.height / 2 - place.y) * CENTER_PULL) * DAMPING;
          if (place.fixed) {
            place.vx = 0;
            place.vy = 0;
            continue;
          }
          const px = place.x + Math.max(-12, Math.min(12, place.vx));
          const py = place.y + Math.max(-11, Math.min(11, place.vy));
          const r = radiusOf(place.recordCount);
          place.x = Math.max(r + 4, Math.min(VIEW.width - r - 4, px));
          place.y = Math.max(r + 18, Math.min(VIEW.height - r - 22, py));
          maxMove = Math.max(maxMove, Math.abs(place.vx), Math.abs(place.vy));
        }
        if (maxMove < 0.05) {
          ticks = MAX_TICKS;
          break;
        }
      }
      rerender();
      ticks++;
      if (ticks < MAX_TICKS) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [drawable]);

  /* --- Gesture plumbing: node drag, two-finger pinch, and pan — all
        converting screen points through `toView` and then inverting the
        canvas transform so geometry is graph-space again. */
  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;

      /* Keep the registry current for every pointer, gesture or not. */
      if (pointersRef.current.has(event.pointerId)) {
        const point = toView(event.clientX, event.clientY);
        pointersRef.current.set(event.pointerId, point);
      }

      /* Two pointers: pinch-zoom around their midpoint. The midpoint also
         pans — so grabbing the zoomed content and pulling it still moves
         what the fingers see. */
      const active = [...pointersRef.current.values()];
      if (active.length >= 2 && gestureRef.current?.mode === 'pinch') {
        const [a, b] = active;
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || gestureRef.current.lastDist;
        const midX = (a.x + b.x) / 2;
        const midY = (a.y + b.y) / 2;
        const gesture = gestureRef.current;
        zoomAt(midX, midY, dist / gesture.lastDist);
        const t = transformRef.current;
        transformRef.current = clampPan({
          x: t.x + (midX - gesture.lastMidX),
          y: t.y + (midY - gesture.lastMidY),
          k: t.k,
        });
        gesture.lastDist = dist;
        gesture.lastMidX = midX;
        gesture.lastMidY = midY;
        event.preventDefault();
        rerender();
        return;
      }

      /* Panning: one pointer moving an already-zoomed canvas. */
      if (gestureRef.current?.mode === 'pan') {
        const gesture = gestureRef.current;
        const past = {
          x: gesture.lastX,
          y: gesture.lastY,
        };
        const point = toView(event.clientX, event.clientY);
        const t = transformRef.current;
        transformRef.current = clampPan({
          x: t.x + (point.x - past.x),
          y: t.y + (point.y - past.y),
          k: t.k,
        });
        gesture.lastX = point.x;
        gesture.lastY = point.y;
        event.preventDefault();
        rerender();
        return;
      }

      /* Node drag — pinned to the pointer in GRAPH coordinates, i.e.
         viewBox coordinates with the zoom transform divided out. */
      const dragIndex = dragRef.current;
      if (dragIndex === null) return;
      const place = positionsRef.current[dragIndex];
      if (!place) return;
      const view = toView(event.clientX, event.clientY);
      const t = transformRef.current;
      const nextX = Math.max(24, Math.min(VIEW.width - 24, (view.x - t.x) / t.k));
      const nextY = Math.max(26, Math.min(VIEW.height - 26, (view.y - t.y) / t.k));
      if (Math.abs(nextX - place.x) > 2 || Math.abs(nextY - place.y) > 2) {
        dragMovedRef.current = true;
      }
      place.x = nextX;
      place.y = nextY;
      place.vx = 0;
      place.vy = 0;
      event.preventDefault();
      rerender();
    };

    const onUpOrCancel = (event: PointerEvent) => {
      pointersRef.current.delete(event.pointerId);

      /* Pinch ends when either finger leaves; the zoom stays where it is. */
      const gesture = gestureRef.current;
      if (gesture?.mode === 'pinch') {
        if (gesture.ids?.includes(event.pointerId) || pointersRef.current.size < 2) {
          gestureRef.current = null;
        }
      } else if (gesture?.mode === 'pan') {
        gestureRef.current = null;
      }

      /* Node release. */
      const dragIndex = dragRef.current;
      if (dragIndex === null) return;
      const place = positionsRef.current[dragIndex];
      // Focus layouts start fixed on purpose; a dragged node keeps its spot.
      if (place && !(drawable?.focus)) place.fixed = false;
      dragRef.current = null;
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUpOrCancel);
    window.addEventListener('pointercancel', onUpOrCancel);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUpOrCancel);
      window.removeEventListener('pointercancel', onUpOrCancel);
    };
  }, [drawable]);

  /* Adjacency, for hover highlighting: a node highlights its neighbourhood
     and dims the rest. */
  const neighboursOf = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const edge of drawable?.edges ?? []) {
      if (!map.has(edge.source)) map.set(edge.source, new Set());
      if (!map.has(edge.target)) map.set(edge.target, new Set());
      map.get(edge.source)!.add(edge.target);
      map.get(edge.target)!.add(edge.source);
    }
    return map;
  }, [drawable]);

  if (!drawable) return null;

  const positions = positionsRef.current;
  const placeById = new Map(positions.map((place) => [place.id, place]));
  const highlightCenter = hoverId ?? selectedId ?? null;
  const highlightSet = highlightCenter ? neighboursOf.get(highlightCenter) : undefined;
  const isHighlighting = highlightCenter !== null && (highlightSet?.size ?? 0) > 0;

  /* One pointer-down contract for the whole canvas, bubbles off nodes too.
     Background: plain deselect, or pan if zoomed. Second finger: pinch, and
     any in-flight node pin releases — force mode (unlike the focus map)
     only pins while dragging. */
  const handleCanvasPointerDown = (event: React.PointerEvent) => {
    const point = toView(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current = {
        mode: 'pinch',
        lastDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        lastMidX: (a.x + b.x) / 2,
        lastMidY: (a.y + b.y) / 2,
        ids: [...pointersRef.current.keys()],
      };
      dragRef.current = null;
      if (!drawable?.focus) {
        for (const place of positionsRef.current) place.fixed = false;
      }
      // The browser classified this gesture with the touch-action the
      // canvas had at its start, so an in-flight page scroll it may win is
      // a documented graft; from here on the canvas is zoomed and
      // `syncTouchAction` keeps touch-action none.
      if (svgRef.current) svgRef.current.style.touchAction = 'none';
      event.preventDefault();
      return;
    }

    if (event.target === event.currentTarget) {
      if (onSelect) onSelect(null);
      if (transformRef.current.k > 1) {
        gestureRef.current = { mode: 'pan', lastX: point.x, lastY: point.y };
        event.preventDefault();
      }
    }
  };

  const startDrag = (event: React.PointerEvent, index: number) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (pointersRef.current.size >= 2) return;
    dragRef.current = index;
    dragMovedRef.current = false;
    positions[index].fixed = true;
    const point = toView(event.clientX, event.clientY);
    pointersRef.current.set(event.pointerId, point);
    event.preventDefault();
  };

  const t = transformRef.current;

  return (
    <>
      <svg
        ref={svgRef}
        className={views.graphSvg}
        viewBox={`0 0 ${VIEW.width} ${VIEW.height}`}
        /* Not role="img": an image flattens its descendants, and the nodes
           inside are individually focusable controls. A labelled group keeps
           the summary while letting the buttons through. */
        role="group"
        aria-label={`Entity graph${drawable.focus ? `, focused on ${drawable.focus}` : ''}: ${
          drawable.nodes.length
        } entities, ${drawable.edges.length} links. Select a node for detail; drag to untangle; pinch, ctrl-scroll or the buttons to zoom.`}
        onPointerDown={handleCanvasPointerDown}
      >
        {/* One transform for everything drawn: zoom scales the drawing in
            viewBox units and stays crisp, pan slides it inside the box. */}
        <g transform={`translate(${t.x.toFixed(1)},${t.y.toFixed(1)}) scale(${t.k.toFixed(3)})`}>
        {drawable.edges.map((edge, index) => {
        const a = placeById.get(edge.source);
        const b = placeById.get(edge.target);
        if (!a || !b) return null;
        const touchesHighlight =
          highlightCenter !== null &&
          (edge.source === highlightCenter || edge.target === highlightCenter);
        const focusEdge = drawable.focus !== null;
        return (
          <line
            key={`${edge.source}-${edge.target}-${index}`}
            className={
              touchesHighlight
                ? views.graphEdgeHot
                : focusEdge
                  ? views.graphEdgeFocus
                  : isHighlighting
                    ? views.graphEdgeDim
                    : views.graphEdge
            }
            x1={a.x.toFixed(1)}
            y1={a.y.toFixed(1)}
            x2={b.x.toFixed(1)}
            y2={b.y.toFixed(1)}
          />
        );
      })}
      {positions.map((place, index) => {
        const recordCount = place.recordCount;
        const r = radiusOf(recordCount);
        const isSelected = selectedId === place.id;
        const nodeCenter = highlightCenter === place.id;
        const isNeighbour = highlightSet?.has(place.id) ?? false;
        const dimmed = isHighlighting && highlightCenter !== place.id && !isNeighbour;
        const node = drawable.nodes.find((candidate) => candidate.id === place.id);
        return (
          <g
            key={place.id}
            className={`${views.graphNodeInteractive} ${DOMINANT_CLASS[place.dominant]} ${
              dimmed ? views.graphNodeDim : ''
            }`}
            transform={`translate(${place.x.toFixed(1)},${place.y.toFixed(1)})`}
            style={{ cursor: node ? 'pointer' : undefined }}
            /* The pointer gesture was the only way into the detail panel.
               Nodes are controls: reachable with Tab, activated like a
               button, and named with what opening them tells you. */
            tabIndex={node && onSelect ? 0 : undefined}
            role={node && onSelect ? 'button' : undefined}
            aria-label={
              node && onSelect
                ? `Select ${place.id}${recordCount > 0 ? `, ${recordCount} records` : ''}`
                : undefined
            }
            onKeyDown={(event) => {
              if (!node || !onSelect) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(place.id);
              }
            }}
            onPointerEnter={() => setHoverId(place.id)}
            onPointerLeave={() =>
              setHoverId((current) => (current === place.id ? null : current))
            }
            onPointerDown={(event) => startDrag(event, index)}
            onClick={() => {
              if (dragMovedRef.current) {
                dragMovedRef.current = false;
                return;
              }
              if (dragRef.current === null && node && onSelect) onSelect(place.id);
            }}
          >
            {/* Tap target first, so it sits under the visible shapes: the
                drawn dot is 8–30 viewBox units and becomes a few pixels of
                glass once the SVG scales into a phone column. */}
            <circle
              className={views.graphNodeHit}
              r={Math.max(r + 16, 26)}
            />
            <circle
              className={isSelected ? views.graphNodeHaloSelected : views.graphNodeHalo}
              r={r + 5}
            />
            <circle r={r} />
            {nodeCenter && recordCount > 0 && (
              <text className={views.graphNodeValue} y={r * 0.32} textAnchor="middle">
                {recordCount}
              </text>
            )}
            <text
              className={`${
                isSelected || highlightCenter === place.id
                  ? views.graphNodeLabelHot
                  : views.graphNodeLabel
              }`}
              y={r + 13}
              textAnchor="middle"
            >
              {place.id.length > 22 ? `${place.id.slice(0, 21)}…` : place.id}
            </text>
          </g>
        );
      })}
        </g>
      </svg>

      {/* Zoom controls: pinch and ctrl-wheel for gestures, and one 44px
          button row for everyone else — touch floors are law, and a
          keyboard-only path to zoom belongs here as much as drag does. */}
      <div className={views.graphZoomBar}>
        <button
          type="button"
          className={views.graphZoomBtn}
          aria-label="Zoom in"
          onClick={() => zoomAt(VIEW.width / 2, VIEW.height / 2, 1.25)}
        >
          +
        </button>
        <button
          type="button"
          className={views.graphZoomBtn}
          aria-label="Zoom out"
          onClick={() => zoomAt(VIEW.width / 2, VIEW.height / 2, 0.8)}
        >
          −
        </button>
        <button
          type="button"
          className={views.graphZoomBtn}
          aria-label="Reset zoom"
          onClick={resetZoom}
          disabled={t.k === ZOOM_MIN}
        >
          ⤾
        </button>
      </div>
    </>
  );
}

/** Domain legend + the how-to-read line, shared by both graph views. */
export function GraphLegend() {
  return (
    <div className={views.graphLegend}>
      {(Object.keys(DOMINANT_LABEL) as Dominant[]).map((key) => (
        <span key={key} className={views.graphLegendItem}>
          <span className={DOMINANT_CLASS[key]} aria-hidden="true" />
          {DOMINANT_LABEL[key]}
        </span>
      ))}
      <span className={views.graphLegendNote}>dot area = facts stored · drag to untangle · pinch or ctrl-scroll to zoom</span>
    </div>
  );
}
