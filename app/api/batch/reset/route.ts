import { NextResponse } from "next/server";
import { resetBatchState, getBatchState } from "@/lib/batch-state";

export async function POST() {
  resetBatchState();
  return NextResponse.json({
    message: "Estado resetado",
    status: getBatchState(),
  });
}
