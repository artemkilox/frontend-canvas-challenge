import { createSpace } from '@/api/resources/spaces';
import { getGraph, putGraph } from '@/api/resources/graph';
import { createSeedGraph } from '@/domain/seed';

let homeLock: Promise<string> | null = null;

export async function createSeededSpace(): Promise<string> {
  const space = await createSpace('Мой канвас');
  const graph = await getGraph(space.data.id);
  await putGraph(space.data.id, createSeedGraph(), graph.etag);
  return space.data.id;
}

export function startHomeSpace(): Promise<string> {
  if (!homeLock) {
    homeLock = createSeededSpace().finally(() => {
      homeLock = null;
    });
  }
  return homeLock;
}
