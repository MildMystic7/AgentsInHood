import { NextResponse } from "next/server";
import { getHistoryResponse } from "@/engine/engine";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getHistoryResponse());
}
