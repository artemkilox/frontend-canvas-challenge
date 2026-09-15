'use client';

import type { GeneratorNodeData, PromptNodeData, ResultNodeData } from '@/domain/project';
import type { ResultOverlay } from '@/domain/generationView';
import { createContext, useContext } from 'react';

export type CanvasActions = {
  setPromptText: (id: string, text: string) => void;
  setGeneratorLabel: (id: string, label: string) => void;
  setSimulateFailure: (id: string, value: boolean) => void;
  setResultLabel: (id: string, label: string) => void;
  runGeneration: (id: string) => void;
  busyGeneratorId: string | null;
};

const ActionsContext = createContext<CanvasActions | null>(null);
const OverlayContext = createContext<Map<string, ResultOverlay>>(new Map());

export function CanvasActionsProvider({
  value,
  children,
}: {
  value: CanvasActions;
  children: React.ReactNode;
}) {
  return <ActionsContext.Provider value={value}>{children}</ActionsContext.Provider>;
}

export function OverlayProvider({
  value,
  children,
}: {
  value: Map<string, ResultOverlay>;
  children: React.ReactNode;
}) {
  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
}

export function useCanvasActions(): CanvasActions {
  const value = useContext(ActionsContext);
  if (!value) {
    throw new Error('CanvasActionsProvider is required');
  }
  return value;
}

export function useResultOverlay(id: string): ResultOverlay | undefined {
  return useContext(OverlayContext).get(id);
}

export type { GeneratorNodeData, PromptNodeData, ResultNodeData };
