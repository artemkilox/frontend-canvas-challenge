'use client';

import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type Viewport as RfViewport,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { canConnect, dropEdgesForNodes, MAX_EDGES, MAX_NODES, typeById } from '@/domain/graph';
import { createCanvasNode, type CanvasEdge, type CanvasNode } from '@/domain/project';
import type { NodeType, Viewport } from '@/api/types';
import { useMemo } from 'react';
import { GeneratorNode } from './nodes/GeneratorNode';
import { PromptNode } from './nodes/PromptNode';
import { ResultNode } from './nodes/ResultNode';
import styles from './canvas.module.css';

const nodeTypes = {
  prompt: PromptNode,
  generator: GeneratorNode,
  result: ResultNode,
};

type Props = {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  defaultViewport: Viewport;
  onNodes: (nodes: CanvasNode[], persist: boolean) => void;
  onEdges: (edges: CanvasEdge[], persist: boolean) => void;
  onViewport: (viewport: Viewport) => void;
};

export function CanvasFlow({ nodes, edges, defaultViewport, onNodes, onEdges, onViewport }: Props) {
  const types = useMemo(() => typeById(nodes), [nodes]);

  function handleNodesChange(changes: NodeChange<CanvasNode>[]) {
    const next = applyNodeChanges(changes, nodes);
    let removed = false;
    for (let i = 0; i < changes.length; i++) {
      if (changes[i].type === 'remove') {
        removed = true;
        break;
      }
    }
    onNodes(next, nodeChangesPersist(changes));
    if (removed) {
      const ids = new Set<string>();
      for (let i = 0; i < next.length; i++) {
        ids.add(next[i].id);
      }
      onEdges(dropEdgesForNodes(edges, ids), true);
    }
  }

  function handleEdgesChange(changes: EdgeChange<CanvasEdge>[]) {
    onEdges(applyEdgeChanges(changes, edges), edgeChangesPersist(changes));
  }

  function handleConnect(connection: Connection) {
    if (!connection.source || !connection.target) {
      return;
    }
    if (
      !canConnect({
        sourceId: connection.source,
        targetId: connection.target,
        types,
        edges,
      })
    ) {
      return;
    }
    onEdges(
      edges.concat({
        id: crypto.randomUUID(),
        source: connection.source,
        target: connection.target,
      }),
      true,
    );
  }

  function addNode(type: NodeType) {
    if (nodes.length >= MAX_NODES) {
      return;
    }
    const offset = nodes.length * 24;
    onNodes(nodes.concat(createCanvasNode(type, { x: 80 + offset, y: 80 + offset })), true);
  }

  return (
    <div className={styles.flow}>
      <div className={styles.flow__palette}>
        <button
          type="button"
          className={styles.flow__add}
          disabled={nodes.length >= MAX_NODES}
          onClick={() => addNode('prompt')}
        >
          Добавить текст
        </button>
        <button
          type="button"
          className={styles.flow__add}
          disabled={nodes.length >= MAX_NODES}
          onClick={() => addNode('generator')}
        >
          Добавить генератор
        </button>
        <button
          type="button"
          className={styles.flow__add}
          disabled={nodes.length >= MAX_NODES}
          onClick={() => addNode('result')}
        >
          Добавить результат
        </button>
        <p className={styles.flow__hint}>
          Связи: текст → генератор → результат. У входа одна связь. Максимум {MAX_NODES} нод и{' '}
          {MAX_EDGES} связей. Delete удаляет ноду вместе со связями.
        </p>
      </div>
      <div className={styles.flow__board}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          isValidConnection={(connection) =>
            Boolean(connection.source) &&
            Boolean(connection.target) &&
            canConnect({
              sourceId: connection.source as string,
              targetId: connection.target as string,
              types,
              edges,
            })
          }
          onMoveEnd={(_, viewport: RfViewport) =>
            onViewport({ x: viewport.x, y: viewport.y, zoom: viewport.zoom })
          }
          defaultViewport={defaultViewport}
          minZoom={0.1}
          maxZoom={4}
          connectionRadius={40}
          deleteKeyCode={['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
}

function nodeChangesPersist(changes: NodeChange<CanvasNode>[]): boolean {
  for (let i = 0; i < changes.length; i++) {
    const type = changes[i].type;
    if (type === 'position' || type === 'remove' || type === 'add' || type === 'replace') {
      return true;
    }
  }
  return false;
}

function edgeChangesPersist(changes: EdgeChange<CanvasEdge>[]): boolean {
  for (let i = 0; i < changes.length; i++) {
    const type = changes[i].type;
    if (type === 'remove' || type === 'add' || type === 'replace') {
      return true;
    }
  }
  return false;
}
