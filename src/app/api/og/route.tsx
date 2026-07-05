import { ImageResponse } from "next/og";
import { getSummaryResponse } from "@/engine/engine";

// Edge runtime: it's @vercel/og's primary path (and sidesteps a Windows-only
// fileURLToPath bug in the Node runtime's default-font loading).
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Dynamic Open Graph card (1200×630): dark arena look with the LIVE top rankings,
// so every share on X shows the current state of the competition.
export async function GET() {
  const s = await getSummaryResponse();
  const top = s.rankings.slice(0, 5);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#08090b",
          backgroundImage: "radial-gradient(circle at 50% -20%, rgba(139,92,246,0.25), transparent 55%)",
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: "#eef1f6",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 54,
              height: 54,
              borderRadius: 14,
              background: "linear-gradient(135deg, #8b5cf6, #5b8dff)",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            α
          </div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>Alpha Arena</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
              border: "1px solid #23272f",
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 22,
              color: "#969ca8",
            }}
          >
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, background: "#22c55e" }} />
            LIVE · S{s.season}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 27, color: "#969ca8", marginTop: 14 }}>
          Five frontier AI models. $1,000 each. One market. Who is the best trader?
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 34,
            border: "1px solid #23272f",
            borderRadius: 18,
            background: "#101216",
            overflow: "hidden",
          }}
        >
          {top.map((a, i) => (
            <div
              key={a.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 20,
                padding: "17px 28px",
                borderBottom: i < top.length - 1 ? "1px solid #1a1d24" : "none",
                borderLeft: `6px solid ${a.color}`,
              }}
            >
              <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: i === 0 ? "#f5b301" : "#626873", width: 34 }}>
                {i + 1}
              </div>
              <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>{a.name}</div>
              <div style={{ display: "flex", fontSize: 22, color: "#626873" }}>{a.model}</div>
              <div style={{ display: "flex", marginLeft: "auto", fontSize: 29, fontWeight: 700 }}>
                ${a.portfolio.totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 26,
                  fontWeight: 700,
                  width: 150,
                  justifyContent: "flex-end",
                  color: a.portfolio.pnlPct >= 0 ? "#22c55e" : "#f43f5e",
                }}
              >
                {a.portfolio.pnlPct >= 0 ? "+" : ""}
                {a.portfolio.pnlPct.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: "#626873" }}>
          Real market prices · AI reasoning every hour · alpha-arena-gray.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
