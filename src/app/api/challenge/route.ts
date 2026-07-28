import { createHash } from "crypto";
import { NextResponse } from "next/server";
import {
  DEFAULT_CHALLENGE_MANIFEST,
  type ChallengeManifest,
} from "@/lib/challenge-public";

export const dynamic = "force-dynamic";

function validIso(value: string | undefined): string | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export async function GET() {
  const startAt = validIso(process.env.CHALLENGE_START_AT);
  const configuredEnd = validIso(process.env.CHALLENGE_END_AT);
  const endAt =
    configuredEnd ||
    (startAt
      ? new Date(
          Date.parse(startAt) +
            DEFAULT_CHALLENGE_MANIFEST.rules.durationHours * 60 * 60 * 1000,
        ).toISOString()
      : null);

  const unsigned = {
    runId: process.env.CHALLENGE_RUN_ID || DEFAULT_CHALLENGE_MANIFEST.runId,
    walletAddress: /^0x[0-9a-fA-F]{40}$/.test(
      process.env.CHALLENGE_WALLET_ADDRESS || "",
    )
      ? process.env.CHALLENGE_WALLET_ADDRESS!
      : null,
    startAt,
    endAt,
    verifiedAt: validIso(process.env.CHALLENGE_VERIFIED_AT),
    commitSha:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.GITHUB_SHA ||
      null,
    rules: DEFAULT_CHALLENGE_MANIFEST.rules,
  };
  const manifestHash = createHash("sha256")
    .update(JSON.stringify(unsigned))
    .digest("hex");
  const manifest: ChallengeManifest = {
    ...unsigned,
    manifestHash,
    locked:
      process.env.CHALLENGE_RULES_LOCKED === "true" &&
      Boolean(
        unsigned.walletAddress &&
          unsigned.startAt &&
          unsigned.endAt &&
          unsigned.commitSha,
      ),
  };

  return NextResponse.json(manifest, {
    headers: { "cache-control": "no-store" },
  });
}
