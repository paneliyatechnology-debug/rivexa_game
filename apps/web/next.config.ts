import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow HMR (Hot Module Replacement) WebSocket connections from local network devices.
  // Without this, Next.js 15+ blocks WS connections from non-localhost origins,
  // causing "ERR_INVALID_HTTP_RESPONSE" and the app to not function over network IP.
  allowedDevOrigins: [
    "192.168.1.112",
    "192.168.1.*",
    "*.192.168.1.112",
  ],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss: data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss: data: blob:; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' http: https: ws: wss: data: blob:; style-src 'self' 'unsafe-inline' http: https:; font-src 'self' http: https: data:; connect-src 'self' http: https: ws: wss:;",
          },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/hilo/:path*',
        destination: 'http://localhost:4000/api/v1/hilo/:path*',
      },
      {
        source: '/api/:path*',
        destination: 'http://localhost:4000/api/v1/:path*',
      },
    ];
  },
};

export default nextConfig;
