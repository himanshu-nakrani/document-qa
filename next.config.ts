import type { NextConfig } from "next";

const backendUrl =
  process.env.BACKEND_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const base = `${backendUrl}/api`;
    return [
      { source: "/api/chat", destination: `${base}/chat` },
      { source: "/api/ingest", destination: `${base}/ingest` },
    ];
  },
};

export default nextConfig;
