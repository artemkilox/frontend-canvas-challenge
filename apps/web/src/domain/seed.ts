import type { GraphDoc } from '@/api/types';

export function createSeedGraph(): GraphDoc {
  const promptId = crypto.randomUUID();
  const generatorId = crypto.randomUUID();
  const resultId = crypto.randomUUID();
  return {
    nodes: [
      {
        id: promptId,
        type: 'prompt',
        position: { x: 40, y: 120 },
        data: { text: 'Горы на рассвете' },
      },
      {
        id: generatorId,
        type: 'generator',
        position: { x: 360, y: 120 },
        data: { label: 'Генератор' },
      },
      {
        id: resultId,
        type: 'result',
        position: { x: 700, y: 120 },
        data: { label: 'Результат' },
      },
    ],
    edges: [
      { id: crypto.randomUUID(), source: promptId, target: generatorId },
      { id: crypto.randomUUID(), source: generatorId, target: resultId },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}
