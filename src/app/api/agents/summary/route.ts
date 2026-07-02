import { NextResponse } from "next/server";
import { getSummaryResponse } from "@/engine/engine";

// Live data — never statically cached (price fetches use their own revalidate).
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await getSummaryResponse());
}
