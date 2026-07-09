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
          background: "#060807",
          backgroundImage: "radial-gradient(circle at 50% -20%, rgba(0,200,5,0.22), transparent 55%)",
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
              background: "linear-gradient(135deg, #00c805, #00e65c)",
              color: "#032b04",
              fontSize: 32,
              fontWeight: 800,
            }}
          >
            α
          </div>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 800, letterSpacing: -1 }}>
            Alpha<span style={{ color: "#00c805" }}>Hood</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginLeft: "auto",
              border: "1px solid #212823",
              borderRadius: 999,
              padding: "8px 18px",
              fontSize: 22,
              color: "#98a29b",
            }}
          >
            <div style={{ display: "flex", width: 12, height: 12, borderRadius: 999, background: "#00c805" }} />
            LIVE · S{s.season}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 27, color: "#98a29b", marginTop: 14 }}>
          Five frontier AIs trade Robinhood-listed coins. $1,000 each. Who is the best trader?
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 34,
            border: "1px solid #212823",
            borderRadius: 18,
            background: "#0c0f0d",
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
                borderBottom: i < top.length - 1 ? "1px solid #181d19" : "none",
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
                  color: a.portfolio.pnlPct >= 0 ? "#00e65c" : "#ff5000",
                }}
              >
                {a.portfolio.pnlPct >= 0 ? "+" : ""}
                {a.portfolio.pnlPct.toFixed(2)}%
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", marginTop: "auto", fontSize: 22, color: "#5f6a62" }}>
          Robinhood-listed coins · $ALPHA on Robinhood Chain · alpha-arena-gray.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
