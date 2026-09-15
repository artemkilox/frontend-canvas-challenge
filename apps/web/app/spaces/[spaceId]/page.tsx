'use client';

import dynamic from 'next/dynamic';
import { use } from 'react';

const CanvasScreen = dynamic(
  () => import('@/features/canvas/CanvasScreen').then((module) => module.CanvasScreen),
  { ssr: false },
);

export default function SpacePage({ params }: { params: Promise<{ spaceId: string }> }) {
  const { spaceId } = use(params);
  return <CanvasScreen spaceId={spaceId} />;
}
