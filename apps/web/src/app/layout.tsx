import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata: Metadata = {
  title: "GameHub - Next-Gen Gaming Platform",
  description: "Play Jet Crash, Mines, Fast Parity, Spin Wheel, Dice & Andar Bahar in real-time.",
};

import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { MainLayoutWrapper } from "@/components/MainLayoutWrapper";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <head>
        <meta
          httpEquiv="Content-Security-Policy"
          content="default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src-elem * 'unsafe-inline' 'unsafe-eval' data: blob:; style-src * 'unsafe-inline' http: https:; font-src * data: http: https:; connect-src * ws: wss: http: https:;"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
        />
      </head>
      <body className="min-h-full bg-[#050B20] text-[#F5F7FF] font-sans antialiased">
        <AuthProvider>
          <NotificationProvider>
            <MainLayoutWrapper>
              {children}
            </MainLayoutWrapper>
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
