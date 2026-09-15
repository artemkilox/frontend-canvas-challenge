import type { Generation } from '@/api/types';

export type ResultOverlay = {
  generationId: string;
  generatorNodeId: string;
  createdAt: string;
  status: Generation['status'];
  imageUrl: string | null;
  failureCode: string | null;
};

export function isGenerationFinal(value: Generation): boolean {
  return value.status === 'succeeded' || value.status === 'failed';
}

export function overlayFromGeneration(
  generation: Generation,
  imageUrl: string | null,
): ResultOverlay {
  return {
    generationId: generation.id,
    generatorNodeId: generation.nodeId,
    createdAt: generation.createdAt,
    status: generation.status,
    imageUrl: generation.status === 'succeeded' ? imageUrl : null,
    failureCode: generation.status === 'failed' ? generation.failureCode : null,
  };
}

export function shouldApplyOverlay(
  current: ResultOverlay | undefined,
  next: ResultOverlay,
): boolean {
  if (!current) {
    return true;
  }
  if (current.generationId === next.generationId) {
    return true;
  }
  return next.createdAt >= current.createdAt;
}

export function latestOverlayByResult(
  generations: Generation[],
  toImageUrl: (path: string | null) => string | null,
): Map<string, ResultOverlay> {
  const map = new Map<string, ResultOverlay>();
  for (let i = 0; i < generations.length; i++) {
    const generation = generations[i];
    if (map.has(generation.resultNodeId)) {
      continue;
    }
    map.set(
      generation.resultNodeId,
      overlayFromGeneration(generation, toImageUrl(generation.imageUrl)),
    );
  }
  return map;
}

export function processingGenerations(generations: Generation[]): Generation[] {
  const list: Generation[] = [];
  for (let i = 0; i < generations.length; i++) {
    const generation = generations[i];
    if (generation.status === 'processing') {
      list.push(generation);
    }
  }
  return list;
}
