import type { Edge, Node } from '@xyflow/react';
import type { GraphDoc, GraphEdge, GraphNode, NodeType, Viewport } from '@/api/types';
import { clampViewport, isNodeType } from './graph';

export type PromptNodeData = { text: string };
export type GeneratorNodeData = { label: string; simulateFailure: boolean };
export type ResultNodeData = { label: string };
export type CanvasNodeData = PromptNodeData | GeneratorNodeData | ResultNodeData;
export type CanvasNode = Node<CanvasNodeData, NodeType>;
export type CanvasEdge = Edge;

export function fromApiGraph(graph: GraphDoc): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
} {
  const nodes: CanvasNode[] = [];
  for (let i = 0; i < graph.nodes.length; i++) {
    const node = graph.nodes[i];
    nodes.push(toCanvasNode(node));
  }
  const edges: CanvasEdge[] = [];
  for (let i = 0; i < graph.edges.length; i++) {
    const edge = graph.edges[i];
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    });
  }
  return { nodes, edges, viewport: clampViewport(graph.viewport) };
}

export function toApiGraph(nodes: CanvasNode[], edges: CanvasEdge[], viewport: Viewport): GraphDoc {
  const apiNodes: GraphNode[] = [];
  for (let i = 0; i < nodes.length; i++) {
    const mapped = toApiNode(nodes[i]);
    if (mapped) {
      apiNodes.push(mapped);
    }
  }
  const apiEdges: GraphEdge[] = [];
  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    apiEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    });
  }
  return { nodes: apiNodes, edges: apiEdges, viewport: clampViewport(viewport) };
}

function toCanvasNode(node: GraphNode): CanvasNode {
  if (node.type === 'prompt') {
    return {
      id: node.id,
      type: 'prompt',
      position: node.position,
      data: { text: node.data.text },
    };
  }
  if (node.type === 'generator') {
    return {
      id: node.id,
      type: 'generator',
      position: node.position,
      data: { label: node.data.label, simulateFailure: false },
    };
  }
  return {
    id: node.id,
    type: 'result',
    position: node.position,
    data: { label: node.data.label },
  };
}

function toApiNode(node: CanvasNode): GraphNode | null {
  if (!isNodeType(node.type)) {
    return null;
  }
  const position = { x: node.position.x, y: node.position.y };
  if (node.type === 'prompt') {
    const data = node.data as PromptNodeData;
    return {
      id: node.id,
      type: 'prompt',
      position,
      data: { text: data.text },
    };
  }
  if (node.type === 'generator') {
    const data = node.data as GeneratorNodeData;
    const label = data.label.trim() || 'Генератор';
    return {
      id: node.id,
      type: 'generator',
      position,
      data: { label },
    };
  }
  const data = node.data as ResultNodeData;
  const label = data.label.trim() || 'Результат';
  return {
    id: node.id,
    type: 'result',
    position,
    data: { label },
  };
}

export function createCanvasNode(type: NodeType, position: { x: number; y: number }): CanvasNode {
  const id = crypto.randomUUID();
  if (type === 'prompt') {
    return { id, type, position, data: { text: '' } };
  }
  if (type === 'generator') {
    return {
      id,
      type,
      position,
      data: { label: 'Генератор', simulateFailure: false },
    };
  }
  return { id, type, position, data: { label: 'Результат' } };
}

export function patchNodeData<T extends CanvasNodeData>(
  nodes: CanvasNode[],
  id: string,
  patch: Partial<T>,
): CanvasNode[] {
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.id === id) {
      const next = nodes.slice();
      next[i] = { ...node, data: { ...node.data, ...patch } };
      return next;
    }
  }
  return nodes;
}
