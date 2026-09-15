import { ApiError } from '../error';
import { request } from '../client';
import { apiPaths } from '../paths';
import type { GraphDoc } from '../types';

export async function getGraph(spaceId: string) {
  const result = await request<GraphDoc>({
    path: apiPaths.graph(spaceId),
    method: 'GET',
  });
  if (!result.etag) {
    throw new ApiError({
      kind: 'parse',
      status: result.status,
      message: 'Сервер не вернул ETag графа.',
      requestId: result.requestId,
    });
  }
  return { ...result, etag: result.etag };
}

export async function putGraph(spaceId: string, graph: GraphDoc, etag: string) {
  const result = await request<GraphDoc>({
    path: apiPaths.graph(spaceId),
    method: 'PUT',
    body: graph,
    ifMatch: etag,
  });
  if (!result.etag) {
    throw new ApiError({
      kind: 'parse',
      status: result.status,
      message: 'Сервер не вернул ETag графа.',
      requestId: result.requestId,
    });
  }
  return { ...result, etag: result.etag };
}
