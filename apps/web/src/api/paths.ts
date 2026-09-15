export const apiPaths = {
  config: '/api/config',
  spaces: '/api/spaces',
  space: (spaceId: string) => `/api/spaces/${spaceId}`,
  graph: (spaceId: string) => `/api/spaces/${spaceId}/graph`,
  generations: (spaceId: string) => `/api/spaces/${spaceId}/generations`,
  generation: (spaceId: string, generationId: string) =>
    `/api/spaces/${spaceId}/generations/${generationId}`,
} as const;
