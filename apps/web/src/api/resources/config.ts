import { request } from '../client';
import { apiPaths } from '../paths';
import type { ApiConfig } from '../types';

export function getConfig() {
  return request<ApiConfig>({
    path: apiPaths.config,
    method: 'GET',
  });
}
