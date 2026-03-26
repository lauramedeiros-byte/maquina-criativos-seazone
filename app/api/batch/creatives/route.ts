import { NextResponse } from "next/server";
import { getBatchState } from "@/lib/batch-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = getBatchState();
  return NextResponse.json({
    count: state.creatives.length,
    creatives: state.creatives,
  });
}
