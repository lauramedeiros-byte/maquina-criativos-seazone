import { NextResponse } from "next/server";
import { Orchestrator } from "@/lib/orchestrator";
import { getBatchState, setBatchState } from "@/lib/batch-state";
import { getBriefing } from "@/lib/briefings";

export const maxDuration = 300; // 5 min for Vercel Pro

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const {
    briefingId = "novo-campeche-briefing",
    count = 45,
  } = body;

  const state = getBatchState();
  if (state.isRunning) {
    return NextResponse.json(
      { error: "Batch já está em execução" },
      { status: 400 }
    );
  }

  const briefing = getBriefing(briefingId);
  if (!briefing) {
    return NextResponse.json(
      { error: "Briefing não encontrado" },
      { status: 404 }
    );
  }

  // Start batch generation (runs in background via promise, no await)
  const orchestrator = new Orchestrator();

  setBatchState({
    isRunning: true,
    totalCreatives: count,
    completedCreatives: 0,
    currentProject: briefing.projectName,
    distribution: {
      static: Math.floor(count / 3),
      narrated: Math.floor(count / 3),
      avatar: count - 2 * Math.floor(count / 3),
    },
    creatives: [],
    startTime: Date.now(),
    errors: [],
  });

  // Fire and forget — the batch runs in the background
  orchestrator.generateBatch(briefing, count).catch((error) => {
    setBatchState({
      isRunning: false,
      errors: [error instanceof Error ? error.message : "Erro desconhecido"],
    });
  });

  return NextResponse.json({
    status: "started",
    message: `Iniciando geração de ${count} criativos`,
    projectName: briefing.projectName,
  });
}
