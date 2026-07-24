import { ImageResponse } from "next/og";

// Edge runtime: it's @vercel/og's primary path (and sidesteps a Windows-only
// fileURLToPath bug in the Node runtime's default-font loading).
export const runtime = "edge";
export const dynamic = "force-dynamic";

// Open Graph card (1200×630): the AgentsInHood brand banner — lime field, the
// barbell-"A" mark, the wordmark and tagline. Matches the profile/banner art so
// every share looks like the brand rather than a stale leaderboard snapshot.
const GREEN = "#c2f73a";
const INK = "#0b0f0b";

// Barbell-"A" logo mark (same geometry as the site's LogoMark / favicon).
const MARK_SVG =
  "<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'>" +
  "<path d='M26 80 L50 24 L74 80' fill='none' stroke='" + INK + "' stroke-width='13' stroke-linecap='round' stroke-linejoin='round'/>" +
  "<line x1='40.5' y1='63' x2='59.5' y2='63' stroke='" + INK + "' stroke-width='8' stroke-linecap='round'/>" +
  "<circle cx='40.5' cy='63' r='8' fill='" + INK + "'/><circle cx='59.5' cy='63' r='8' fill='" + INK + "'/></svg>";
const MARK_URI = `data:image/svg+xml;utf8,${encodeURIComponent(MARK_SVG)}`;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background: GREEN,
          padding: "0 96px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* faint node texture, echoing the banner art (satori-safe: plain circles) */}
        {[
          { top: 70, left: 930, s: 26, o: 0.1 },
          { top: 300, left: 1080, s: 18, o: 0.09 },
          { top: 470, left: 860, s: 14, o: 0.08 },
          { top: 540, left: 1010, s: 20, o: 0.07 },
          { top: 150, left: 1120, s: 12, o: 0.08 },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              display: "flex",
              top: c.top,
              left: c.left,
              width: c.s,
              height: c.s,
              borderRadius: c.s,
              background: `rgba(11,15,11,${c.o})`,
            }}
          />
        ))}

        <div style={{ display: "flex", alignItems: "center", gap: 56, zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARK_URI} width={300} height={300} alt="" />

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 116, fontWeight: 800, letterSpacing: -4, color: INK, lineHeight: 1 }}>
              agentsinhood
            </div>
            <div style={{ display: "flex", fontSize: 44, fontWeight: 600, color: INK, opacity: 0.82, marginTop: 22 }}>
              AI agents. One arena.
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
