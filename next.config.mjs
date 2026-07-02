/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enables Emotion's SWC transform (labels, ssr, source maps) — same styling
  // approach the original Agentic Quant Wars uses.
  compiler: {
    emotion: true,
  },
};

export default nextConfig;
