'use client';

import dynamic from 'next/dynamic';

const CreateSpaceScreen = dynamic(
  () => import('@/features/home/CreateSpaceScreen').then((module) => module.CreateSpaceScreen),
  { ssr: false },
);

export default function HomePage() {
  return <CreateSpaceScreen />;
}
