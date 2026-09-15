import { request } from '../client';
import { apiPaths } from '../paths';
import type { Generation, GenerationRequest } from '../types';

export function listGenerations(spaceId: string) {
  return request<Generation[]>({
    path: apiPaths.generations(spaceId),
    method: 'GET',
  });
}

export function createGeneration(spaceId: string, body: GenerationRequest, idempotencyKey: string) {
  return request<Generation>({
    path: apiPaths.generations(spaceId),
    method: 'POST',
    body,
    idempotencyKey,
  });
}

export function getGeneration(spaceId: string, generationId: string, signal?: AbortSignal) {
  return request<Generation>({
    path: apiPaths.generation(spaceId, generationId),
    method: 'GET',
    signal,
  });
}
