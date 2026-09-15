export type NodeType = 'prompt' | 'generator' | 'result';

export type GraphNode =
  | {
      id: string;
      type: 'prompt';
      position: { x: number; y: number };
      data: { text: string };
    }
  | {
      id: string;
      type: 'generator';
      position: { x: number; y: number };
      data: { label: string };
    }
  | {
      id: string;
      type: 'result';
      position: { x: number; y: number };
      data: { label: string };
    };

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
};

export type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

export type GraphDoc = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  viewport: Viewport;
};

export type Space = {
  id: string;
  title: string;
  createdAt: string;
};

export type GenerationStatus = 'processing' | 'succeeded' | 'failed';
export type GenerationScenario = 'success' | 'failure';

export type Generation = {
  id: string;
  spaceId: string;
  nodeId: string;
  resultNodeId: string;
  prompt: string;
  graphETag: string;
  scenario: GenerationScenario;
  status: GenerationStatus;
  createdAt: string;
  imageUrl: string | null;
  failureCode: string | null;
};

export type GenerationRequest = {
  nodeId: string;
  graphETag: string;
  scenario: GenerationScenario;
};

export type ApiConfig = {
  debounceMs: number;
  pollIntervalMs: number;
  generationDelayMs: number;
  maxNodes: number;
  maxEdges: number;
};
