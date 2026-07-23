// The AgentsInHood mark: a bold "A" whose crossbar is a barbell (a bar with a
// weight plate at each end), on the brand lime square. Recreated as inline SVG
// so it's crisp at any size and needs no image asset.
export function LogoMark({ size = 28, radius = 8 }: { size?: number; radius?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="100" height="100" rx={(radius / size) * 100} fill="var(--green, #c2f73a)" />
      <path d="M26 80 L50 24 L74 80" fill="none" stroke="#0b0f0b" strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="40.5" y1="63" x2="59.5" y2="63" stroke="#0b0f0b" strokeWidth="8" strokeLinecap="round" />
      <circle cx="40.5" cy="63" r="8" fill="#0b0f0b" />
      <circle cx="59.5" cy="63" r="8" fill="#0b0f0b" />
    </svg>
  );
}
