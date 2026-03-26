import { NextResponse } from "next/server";
import { getBatchState, setBatchState } from "@/lib/batch-state";

export async function POST() {
  const state = getBatchState();
  if (state.isRunning) {
    setBatchState({ isRunning: false });
    return NextResponse.json({ message: "Batch parado" });
  }
  return NextResponse.json({ message: "Nenhum batch em execução" });
}
