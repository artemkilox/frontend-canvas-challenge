import { request } from '../client';
import { apiPaths } from '../paths';
import type { Space } from '../types';

export function createSpace(title: string) {
  return request<Space>({
    path: apiPaths.spaces,
    method: 'POST',
    body: { title },
  });
}

export function getSpace(spaceId: string) {
  return request<Space>({
    path: apiPaths.space(spaceId),
    method: 'GET',
  });
}
