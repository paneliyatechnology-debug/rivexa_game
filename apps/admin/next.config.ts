import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
