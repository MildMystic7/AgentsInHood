import { NextResponse } from "next/server";
import {
  MAINNET_WALLET_ADDRESS,
  fallbackMainnetStatus,
  type PublicMainnetStatus,
} from "@/lib/mainnet-public";

export const dynamic = "force-dynamic";

export async function GET() {
  const workerUrl = process.env.MAINNET_WORKER_STATUS_URL;
  if (!workerUrl) {
    return NextResponse.json(fallbackMainnetStatus(), {
      headers: { "cache-control": "no-store" },
    });
  }

  try {
    const response = await fetch(workerUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`worker returned ${response.status}`);
    const status = (await response.json()) as PublicMainnetStatus;
    return NextResponse.json(
      {
        ...status,
        walletAddress: status.walletAddress || MAINNET_WALLET_ADDRESS,
        connected: true,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(fallbackMainnetStatus(), {
      headers: { "cache-control": "no-store" },
    });
  }
}
