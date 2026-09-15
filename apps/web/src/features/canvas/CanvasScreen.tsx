'use client';

import { assetUrl } from '@/api/assetUrl';
import { hasApiStatus, isApiError } from '@/api/error';
import { pollDelayMs, pollUntil } from '@/api/poll';
import { getConfig } from '@/api/resources/config';
import { createGeneration, getGeneration, listGenerations } from '@/api/resources/generations';
import { getGraph, putGraph } from '@/api/resources/graph';
import { getSpace } from '@/api/resources/spaces';
import type { Generation, Viewport } from '@/api/types';
import { isGraphConflict, messageForApiError } from '@/domain/apiMessages';
import {
  isGenerationFinal,
  latestOverlayByResult,
  overlayFromGeneration,
  processingGenerations,
  shouldApplyOverlay,
  type ResultOverlay,
} from '@/domain/generationView';
import { resultIdForGenerator, SAVE_DEBOUNCE_MS } from '@/domain/graph';
import {
  fromApiGraph,
  patchNodeData,
  toApiGraph,
  type CanvasEdge,
  type CanvasNode,
  type GeneratorNodeData,
} from '@/domain/project';
import { Button } from '@/ui/button/Button';
import { Notice } from '@/ui/notice/Notice';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CanvasFlow } from './CanvasFlow';
import { CanvasActionsProvider, OverlayProvider, type CanvasActions } from './canvasContext';
import styles from './canvas.module.css';
import { clearIdempotency, idempotencyKeyFor } from './idempotency';
import { createSaveQueue, type SaveStatus } from './saveQueue';
import { createSeededSpace } from './spaceBootstrap';

type Props = {
  spaceId: string;
};

export function CanvasScreen({ spaceId }: Props) {
  const router = useRouter();
  const [phase, setPhase] = useState<'loading' | 'ready' | 'missing' | 'boot-error'>('loading');
  const [bootError, setBootError] = useState<string | null>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [overlays, setOverlays] = useState<Map<string, ResultOverlay>>(new Map());
  const [busyGeneratorId, setBusyGeneratorId] = useState<string | null>(null);
  const [pollFallbackMs, setPollFallbackMs] = useState(1500);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const viewportRef = useRef(viewport);
  const etagRef = useRef('');
  const overlaysRef = useRef(overlays);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  viewportRef.current = viewport;
  overlaysRef.current = overlays;

  const queueRef = useRef<ReturnType<typeof createSaveQueue<ReturnType<typeof toApiGraph>>> | null>(
    null,
  );
  const pollsRef = useRef<Map<string, AbortController>>(new Map());
  const currentGenRef = useRef<Map<string, string>>(new Map());

  const stopPoll = useCallback((generationId?: string) => {
    if (generationId) {
      const controller = pollsRef.current.get(generationId);
      controller?.abort();
      pollsRef.current.delete(generationId);
      return;
    }
    pollsRef.current.forEach((controller) => controller.abort());
    pollsRef.current.clear();
  }, []);

  const applyOverlay = useCallback((resultNodeId: string, overlay: ResultOverlay) => {
    let exists = false;
    const currentNodes = nodesRef.current;
    for (let i = 0; i < currentNodes.length; i++) {
      if (currentNodes[i].id === resultNodeId) {
        exists = true;
        break;
      }
    }
    if (!exists) {
      return;
    }
    setOverlays((prev) => {
      const current = prev.get(resultNodeId);
      if (!shouldApplyOverlay(current, overlay)) {
        return prev;
      }
      const next = new Map(prev);
      next.set(resultNodeId, overlay);
      return next;
    });
  }, []);

  const watchGeneration = useCallback(
    (generation: Generation) => {
      currentGenRef.current.set(generation.nodeId, generation.id);
      stopPoll(generation.id);
      const controller = new AbortController();
      pollsRef.current.set(generation.id, controller);
      const image = assetUrl(generation.imageUrl);
      applyOverlay(generation.resultNodeId, overlayFromGeneration(generation, image));
      if (isGenerationFinal(generation)) {
        return;
      }
      void pollUntil({
        read: async (signal) => {
          const result = await getGeneration(spaceId, generation.id, signal);
          return { value: result.data, retryAfterMs: result.retryAfterMs };
        },
        isFinal: isGenerationFinal,
        delayMs: (_value, retryAfterMs) => pollDelayMs(retryAfterMs, pollFallbackMs),
        signal: controller.signal,
        isCurrent: () => currentGenRef.current.get(generation.nodeId) === generation.id,
      }).then((finalGeneration) => {
        if (!finalGeneration) {
          return;
        }
        applyOverlay(
          finalGeneration.resultNodeId,
          overlayFromGeneration(finalGeneration, assetUrl(finalGeneration.imageUrl)),
        );
        clearIdempotency(`${spaceId}:${finalGeneration.nodeId}`);
      });
    },
    [applyOverlay, pollFallbackMs, spaceId, stopPoll],
  );

  const watchRef = useRef(watchGeneration);
  watchRef.current = watchGeneration;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        try {
          const config = await getConfig();
          if (!cancelled && typeof config.data.pollIntervalMs === 'number') {
            setPollFallbackMs(config.data.pollIntervalMs);
          }
        } catch {
          setPollFallbackMs(1500);
        }
        await getSpace(spaceId);
        const graph = await getGraph(spaceId);
        const generations = await listGenerations(spaceId);
        if (cancelled) {
          return;
        }
        const projected = fromApiGraph(graph.data);
        etagRef.current = graph.etag;
        setNodes(projected.nodes);
        setEdges(projected.edges);
        setViewport(projected.viewport);
        const overlayMap = latestOverlayByResult(generations.data, assetUrl);
        setOverlays(overlayMap);
        setPhase('ready');
        const processing = processingGenerations(generations.data);
        for (let i = 0; i < processing.length; i++) {
          watchRef.current(processing[i]);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }
        if (hasApiStatus(error, 404) || (isApiError(error) && error.code === 'SPACE_NOT_FOUND')) {
          setPhase('missing');
          return;
        }
        setBootError(messageForApiError(error, 'Не удалось загрузить пространство.'));
        setPhase('boot-error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  useEffect(() => {
    const queue = createSaveQueue({
      debounceMs: SAVE_DEBOUNCE_MS,
      getSnapshot: () => toApiGraph(nodesRef.current, edgesRef.current, viewportRef.current),
      getEtag: () => etagRef.current,
      put: async (snapshot, etag) => {
        const result = await putGraph(spaceId, snapshot, etag);
        return result.etag;
      },
      onStatus: (status) => {
        setSaveStatus(status);
        if (status === 'saving' || status === 'saved' || status === 'dirty') {
          setSaveError(null);
        }
      },
      onEtag: (etag) => {
        etagRef.current = etag;
      },
      isConflict: isGraphConflict,
    });
    queueRef.current = queue;
    return () => {
      queue.stop();
      queueRef.current = null;
      stopPoll();
    };
  }, [spaceId, stopPoll]);

  const markDirty = useCallback(() => {
    queueRef.current?.schedule();
  }, []);

  const updateNodes = useCallback(
    (next: CanvasNode[], persist = true) => {
      setNodes(next);
      nodesRef.current = next;
      if (persist) {
        markDirty();
      }
    },
    [markDirty],
  );

  const updateEdges = useCallback(
    (next: CanvasEdge[], persist = true) => {
      setEdges(next);
      edgesRef.current = next;
      if (persist) {
        markDirty();
      }
    },
    [markDirty],
  );

  const updateViewport = useCallback(
    (next: Viewport) => {
      setViewport(next);
      viewportRef.current = next;
      markDirty();
    },
    [markDirty],
  );

  const reloadServerGraph = useCallback(async () => {
    try {
      const graph = await getGraph(spaceId);
      const generations = await listGenerations(spaceId);
      const projected = fromApiGraph(graph.data);
      etagRef.current = graph.etag;
      nodesRef.current = projected.nodes;
      edgesRef.current = projected.edges;
      viewportRef.current = projected.viewport;
      setNodes(projected.nodes);
      setEdges(projected.edges);
      setViewport(projected.viewport);
      setOverlays(latestOverlayByResult(generations.data, assetUrl));
      setSaveStatus('saved');
      setSaveError(null);
      queueRef.current?.clearConflict();
      stopPoll();
      const processing = processingGenerations(generations.data);
      for (let i = 0; i < processing.length; i++) {
        watchGeneration(processing[i]);
      }
    } catch (error) {
      setSaveError(messageForApiError(error, 'Не удалось перечитать граф.'));
    }
  }, [spaceId, stopPoll, watchGeneration]);

  const runGeneration = useCallback(
    async (generatorId: string) => {
      if (busyGeneratorId) {
        return;
      }
      setGenError(null);
      setBusyGeneratorId(generatorId);
      try {
        const saved = await queueRef.current?.flush();
        if (!saved) {
          setGenError(
            saveStatus === 'conflict'
              ? 'Сначала разберите конфликт версии графа.'
              : 'Не удалось сохранить граф. Генерация не запущена, правки на месте.',
          );
          setBusyGeneratorId(null);
          return;
        }
        const snapshot = toApiGraph(nodesRef.current, edgesRef.current, viewportRef.current);
        const resultNodeId = resultIdForGenerator(generatorId, snapshot.edges);
        if (!resultNodeId) {
          setGenError('Свяжите генератор с нодой результата.');
          return;
        }
        let node: CanvasNode | undefined;
        for (let i = 0; i < nodesRef.current.length; i++) {
          if (nodesRef.current[i].id === generatorId) {
            node = nodesRef.current[i];
            break;
          }
        }
        if (!node || node.type !== 'generator') {
          setGenError('Запускать генерацию можно только с ноды генератора.');
          return;
        }
        const data = node.data as GeneratorNodeData;
        const scenario = data.simulateFailure ? 'failure' : 'success';
        const graphETag = etagRef.current;
        const slot = `${spaceId}:${generatorId}`;
        const key = idempotencyKeyFor(slot, `${graphETag}|${scenario}|${resultNodeId}`);
        const created = await createGeneration(
          spaceId,
          { nodeId: generatorId, graphETag, scenario },
          key,
        );
        if (isGenerationFinal(created.data)) {
          clearIdempotency(slot);
        }
        watchGeneration(created.data);
        if (isGenerationFinal(created.data)) {
          return;
        }
      } catch (error) {
        setGenError(messageForApiError(error, 'Не удалось запустить генерацию.'));
      } finally {
        setBusyGeneratorId(null);
      }
    },
    [busyGeneratorId, saveStatus, spaceId, watchGeneration],
  );

  const actions = useMemo<CanvasActions>(
    () => ({
      setPromptText: (id, text) => {
        updateNodes(patchNodeData(nodesRef.current, id, { text }));
      },
      setGeneratorLabel: (id, label) => {
        updateNodes(patchNodeData(nodesRef.current, id, { label }));
      },
      setSimulateFailure: (id, value) => {
        setNodes((current) => {
          const next = patchNodeData(current, id, { simulateFailure: value });
          nodesRef.current = next;
          return next;
        });
      },
      setResultLabel: (id, label) => {
        updateNodes(patchNodeData(nodesRef.current, id, { label }));
      },
      runGeneration,
      busyGeneratorId,
    }),
    [busyGeneratorId, runGeneration, updateNodes],
  );

  if (phase === 'loading') {
    return (
      <div className={styles.center}>
        <p>Загрузка пространства…</p>
      </div>
    );
  }

  if (phase === 'missing') {
    return (
      <div className={styles.center}>
        <Notice tone="error">Пространство не найдено. Можно создать новое.</Notice>
        <Button
          type="button"
          onClick={() => {
            void createSeededSpace()
              .then((id) => router.replace(`/spaces/${id}`))
              .catch((error: unknown) => {
                setBootError(messageForApiError(error, 'Не удалось создать пространство.'));
                setPhase('boot-error');
              });
          }}
        >
          Создать новое пространство
        </Button>
      </div>
    );
  }

  if (phase === 'boot-error') {
    return (
      <div className={styles.center}>
        <Notice tone="error">{bootError}</Notice>
      </div>
    );
  }

  return (
    <CanvasActionsProvider value={actions}>
      <OverlayProvider value={overlays}>
        <div className={styles.shell}>
          <header className={styles.bar}>
            <p className={styles.bar__status}>{saveLabel(saveStatus)}</p>
            {saveStatus === 'conflict' ? (
              <Button type="button" variant="ghost" onClick={() => void reloadServerGraph()}>
                Перечитать граф с сервера
              </Button>
            ) : null}
            {saveStatus === 'error' ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  void queueRef.current?.flush().catch((error: unknown) => {
                    setSaveError(messageForApiError(error, 'Сохранение не удалось.'));
                  });
                }}
              >
                Повторить сохранение
              </Button>
            ) : null}
            {saveError ? (
              <div className={styles.bar__error}>
                <Notice tone="error">{saveError}</Notice>
              </div>
            ) : null}
            {saveStatus === 'conflict' ? (
              <div className={styles.bar__error}>
                <Notice tone="error">
                  Конфликт версии. Черновик на канвасе не удалён. Перечитывание заменит его
                  серверным графом.
                </Notice>
              </div>
            ) : null}
            {genError ? (
              <div className={styles.bar__error}>
                <Notice tone="error">{genError}</Notice>
              </div>
            ) : null}
          </header>
          <CanvasFlow
            nodes={nodes}
            edges={edges}
            defaultViewport={viewport}
            onNodes={updateNodes}
            onEdges={updateEdges}
            onViewport={updateViewport}
          />
        </div>
      </OverlayProvider>
    </CanvasActionsProvider>
  );
}

function saveLabel(status: SaveStatus): string {
  switch (status) {
    case 'dirty':
      return 'Есть несохранённые изменения';
    case 'saving':
      return 'Сохранение…';
    case 'saved':
      return 'Сохранено';
    case 'error':
      return 'Ошибка сохранения';
    case 'conflict':
      return 'Конфликт версии графа';
    default:
      return '';
  }
}
