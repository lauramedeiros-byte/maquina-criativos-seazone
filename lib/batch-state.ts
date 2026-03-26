import { BatchState } from "./types";

function createEmptyState(): BatchState {
  return {
    isRunning: false,
    totalCreatives: 0,
    completedCreatives: 0,
    currentProject: "",
    distribution: { static: 0, narrated: 0, avatar: 0 },
    creatives: [],
    startTime: null,
    errors: [],
  };
}

// In-memory state (persists across API calls in the same server process)
// For Vercel serverless, this resets between cold starts — acceptable for demo
let batchState: BatchState = createEmptyState();

export function getBatchState(): BatchState {
  return batchState;
}

export function setBatchState(state: Partial<BatchState>) {
  batchState = { ...batchState, ...state };
}

export function resetBatchState() {
  batchState = createEmptyState();
}
