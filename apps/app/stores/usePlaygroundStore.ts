import { create } from 'zustand';

export interface DecisionInspectorState {
  selectedModel: string;
  provider: string;
  routingPolicy: string;
  score: string;
  latency: string;
  cost: string;
}

interface PlaygroundState {
  model: string;
  prompt: string;
  response: string | null;
  decisionDetails: DecisionInspectorState | null;
  setModel: (model: string) => void;
  setPrompt: (prompt: string) => void;
  setResponse: (response: string | null) => void;
  setDecisionDetails: (details: DecisionInspectorState | null) => void;
  clearPlayground: () => void;
}

export const usePlaygroundStore = create<PlaygroundState>((set) => ({
  model: 'prism-auto',
  prompt: 'Write a high-performance Go struct for a token bucket rate limiter.',
  response: null,
  decisionDetails: null,
  setModel: (model: string) => set({ model }),
  setPrompt: (prompt: string) => set({ prompt }),
  setResponse: (response: string | null) => set({ response }),
  setDecisionDetails: (details: DecisionInspectorState | null) => set({ decisionDetails: details }),
  clearPlayground: () => set({ response: null, decisionDetails: null }),
}));
