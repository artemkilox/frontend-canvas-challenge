import type { GraphDoc, GraphEdge, GraphNode, NodeType, Viewport } from '@/api/types';

export const MAX_NODES = 20;
export const MAX_EDGES = 20;
export const SAVE_DEBOUNCE_MS = 500;

export function isNodeType(value: string | undefined): value is NodeType {
  return value === 'prompt' || value === 'generator' || value === 'result';
}

export function isAllowedPair(source: NodeType, target: NodeType): boolean {
  return (
    (source === 'prompt' && target === 'generator') ||
    (source === 'generator' && target === 'result')
  );
}

export function typeById(nodes: { id: string; type?: string }[]): Map<string, NodeType> {
  const map = new Map<string, NodeType>();
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node && isNodeType(node.type)) {
      map.set(node.id, node.type);
    }
  }
  return map;
}

export function canConnect(input: {
  sourceId: string;
  targetId: string;
  nodes: { id: string; type?: string }[];
  edges: { source: string; target: string }[];
}): boolean {
  if (input.sourceId === input.targetId) {
    return false;
  }
  if (input.edges.length >= MAX_EDGES) {
    return false;
  }
  const types = typeById(input.nodes);
  const sourceType = types.get(input.sourceId);
  const targetType = types.get(input.targetId);
  if (!sourceType || !targetType || !isAllowedPair(sourceType, targetType)) {
    return false;
  }
  let targetHasIn = false;
  let generatorHasOut = false;
  for (let i = 0; i < input.edges.length; i++) {
    const edge = input.edges[i];
    if (edge.target === input.targetId) {
      targetHasIn = true;
    }
    if (sourceType === 'generator' && edge.source === input.sourceId) {
      generatorHasOut = true;
    }
  }
  if (targetHasIn) {
    return false;
  }
  if (sourceType === 'generator' && generatorHasOut) {
    return false;
  }
  return true;
}

export function dropEdgesForNodes<T extends { source: string; target: string }>(
  edges: T[],
  nodeIds: Set<string>,
): T[] {
  const kept: T[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
      kept.push(edge);
    }
  }
  return kept;
}

export function resultIdForGenerator(
  generatorId: string,
  edges: { source: string; target: string }[],
): string | null {
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    if (edge.source === generatorId) {
      return edge.target;
    }
  }
  return null;
}

export function clampViewport(viewport: Viewport): Viewport {
  const zoom = Math.min(4, Math.max(0.1, viewport.zoom));
  return { x: viewport.x, y: viewport.y, zoom };
}

export function graphsEqual(a: GraphDoc, b: GraphDoc): boolean {
  if (a.nodes.length !== b.nodes.length || a.edges.length !== b.edges.length) {
    return false;
  }
  if (
    a.viewport.x !== b.viewport.x ||
    a.viewport.y !== b.viewport.y ||
    a.viewport.zoom !== b.viewport.zoom
  ) {
    return false;
  }
  const nodesB = new Map<string, GraphNode>();
  for (let i = 0; i < b.nodes.length; i++) {
    nodesB.set(b.nodes[i].id, b.nodes[i]);
  }
  for (let i = 0; i < a.nodes.length; i++) {
    const left = a.nodes[i];
    const right = nodesB.get(left.id);
    if (!right || !nodesEqual(left, right)) {
      return false;
    }
  }
  const edgesB = new Map<string, GraphEdge>();
  for (let i = 0; i < b.edges.length; i++) {
    edgesB.set(b.edges[i].id, b.edges[i]);
  }
  for (let i = 0; i < a.edges.length; i++) {
    const left = a.edges[i];
    const right = edgesB.get(left.id);
    if (!right || left.source !== right.source || left.target !== right.target) {
      return false;
    }
  }
  return true;
}

function nodesEqual(a: GraphNode, b: GraphNode): boolean {
  if (a.type !== b.type || a.position.x !== b.position.x || a.position.y !== b.position.y) {
    return false;
  }
  if (a.type === 'prompt' && b.type === 'prompt') {
    return a.data.text === b.data.text;
  }
  if (a.type === 'generator' && b.type === 'generator') {
    return a.data.label === b.data.label;
  }
  if (a.type === 'result' && b.type === 'result') {
    return a.data.label === b.data.label;
  }
  return false;
}
