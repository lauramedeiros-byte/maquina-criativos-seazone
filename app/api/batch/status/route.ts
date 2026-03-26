import { NextResponse } from "next/server";
import { getBatchState } from "@/lib/batch-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getBatchState();
  const elapsed = state.startTime
    ? Math.floor((Date.now() - state.startTime) / 1000)
    : 0;

  return NextResponse.json({
    isRunning: state.isRunning,
    project: state.currentProject,
    progress: {
      completed: state.completedCreatives,
      total: state.totalCreatives,
      percentage:
        state.totalCreatives > 0
          ? Math.round(
              (state.completedCreatives / state.totalCreatives) * 100
            )
          : 0,
    },
    distribution: state.distribution,
    elapsed,
    errors: state.errors,
    timestamp: new Date().toISOString(),
  });
}
