import { NextResponse } from "next/server";
import { listBriefings } from "@/lib/briefings";

export async function GET() {
  return NextResponse.json({ briefings: listBriefings() });
}
